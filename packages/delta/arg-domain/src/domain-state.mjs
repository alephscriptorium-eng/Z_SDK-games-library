/**
 * createArgDomainState — la verdad del delta. Compone flow-engine (Riada),
 * maze-engine (Cantera) y los actores sobre el nav-graph. Solo la autoridad
 * lo instancia (gate G-ARG.1); visores y sujetos emiten intents y proyectan.
 */

import { sampleLink, linkDistance } from '@zeus/game-engine';
import {
  normalizeForceRegistry,
  initialActiveForces,
  cotasSnapshot
} from '@zeus/linea-kit/force-activation';
import { deltaV0, buildCanteraTopology, buildNavGraph } from './scenes/delta-v0.mjs';
import { createFlowEngine } from './flow-engine.mjs';
import { createMazeEngine } from './maze-engine.mjs';
import { createLineBoard, DEFAULT_LINE_SEED } from './line-board.mjs';
import { reduceArgIntent } from './reducer.mjs';
import { validateIntent, trackHintFor } from './contract.mjs';
import { effectiveLinkSpeed } from './cloak-mods.mjs';

const EMOTE_TTL_MS = 2500;
/** El jinete surfea algo más rápido que el flujo: va adelantando gotas
 * (si no, la distancia a la gota más próxima quedaría congelada al embarcar). */
const RIDER_SPEED_FACTOR = 1.15;

export const DEFAULT_START_PACK = ['aleph-tronco-puro', 'aleph-firehose-browse'];

export const DEFAULT_GAMEMAP = {
  id: 'gamemap-demo',
  startPack: DEFAULT_START_PACK,
  objetivo: { labeled: 10, excavated: 2 }
};

export function createArgDomainState({
  scene = deltaV0,
  feeds,
  gamemap = DEFAULT_GAMEMAP,
  lineSeed = DEFAULT_LINE_SEED,
  forcesRegistry = null
} = {}) {
  if (!feeds) throw new Error('createArgDomainState: feeds requerido (resolveFeeds)');

  const topology = buildCanteraTopology(scene.cantera);
  const mazeSeed = feeds.mazeSeed ?? feeds.mazeSource.loadMaze(topology);
  const maze = createMazeEngine(topology, mazeSeed);
  const excavateTimeoutMs = feeds.excavateTimeoutMs ?? 20000;
  const flow = createFlowEngine(scene, feeds.firehose);
  const nav = buildNavGraph(scene, topology);
  const lineBoard = createLineBoard(gamemap.lines ?? lineSeed);

  const forcesReg =
    forcesRegistry == null
      ? null
      : normalizeForceRegistry(forcesRegistry);
  /** @type {Set<string>} */
  const activeForces = new Set(forcesReg ? initialActiveForces(forcesReg) : []);

  const actors = {};
  const contacts = {};
  const progress = { labeled: 0, excavated: 0, objetivoMet: false };

  let tick = 0;
  let ledgerSeq = 0;
  const outLedger = [];
  const outTracks = [];
  const lastTrackKey = new Map();

  function positionOf(subjectId) {
    const actor = actors[subjectId];
    if (actor) return actor.position ?? null;
    const tap = flow.taps[subjectId];
    if (tap) return nav.nodos[tap.summitNodeId]?.position ?? null;
    return null;
  }

  function computeActorPosition(actor) {
    if (actor.riding) return flow.sampleRiver(actor.riding.riverId, actor.riding.progress);
    if (actor.linkId) return sampleLink(nav.enlaces[actor.linkId].waypoints, actor.progress);
    if (actor.nodeId) return { ...nav.nodos[actor.nodeId].position };
    return actor.position ?? { x: 0, y: 0, z: 0 };
  }

  function pushLedger(kind, detail) {
    ledgerSeq += 1;
    outLedger.push({ v: 1, seq: ledgerSeq, ts: Date.now(), kind, ...detail });
  }

  function view() {
    return {
      scene,
      nav,
      actors,
      taps: flow.taps,
      sea: flow.sea,
      corridors: maze.corridors,
      contacts,
      lines: lineBoard.lines,
      forces: forcesReg
        ? { registry: forcesReg, active: [...activeForces] }
        : null,
      dropletUnder: (riverId, prog) => flow.dropletUnder(riverId, prog),
      seaDroplets: () => flow.sea.droplets,
      seaDropletById: (id) => flow.seaDropletById(id),
      positionOf
    };
  }

  function applyOps(ops) {
    for (const op of ops) {
      switch (op.op) {
        case 'actor:add':
          actors[op.actor.id] = { ...op.actor, position: computeActorPosition(op.actor) };
          break;
        case 'actor:patch':
          Object.assign(actors[op.id], op.patch);
          actors[op.id].position = computeActorPosition(actors[op.id]);
          break;
        case 'actor:score':
          if (actors[op.id]?.score) {
            actors[op.id].score[op.key] = (actors[op.id].score[op.key] ?? 0) + 1;
          }
          break;
        case 'tap:aperture': {
          // setAperture returns boolean (tap missing → false); gate ya exige tap válido.
          if (!flow.setAperture(op.tapId, op.value)) break;
          break;
        }
        case 'droplet:label': {
          const res = flow.labelDroplet(op.riverId, op.dropletId, op.label, op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'sea:salvage': {
          const res = flow.salvage(op.dropletId, op.label, op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'sea:empty': {
          const res = flow.emptySoft(op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'corridor:excavate': {
          const external = feeds.externalDig === true;
          const res = maze.excavate(op.corridorId, op.actorId, { external });
          if (!res.ok) break;
          if (external && typeof feeds.mazeSource?.excavateCorridor === 'function') {
            const corridor = maze.corridors[op.corridorId];
            const corridorCtx = {
              ...corridor,
              chamberA: maze.chambers[corridor.a],
              chamberB: maze.chambers[corridor.b]
            };
            const digPromise = feeds.mazeSource.excavateCorridor(corridorCtx, op.approval ?? null);
            const timeout = new Promise((_, reject) => {
              setTimeout(() => reject(new Error('excavate_timeout')), excavateTimeoutMs);
            });
            Promise.race([digPromise, timeout])
              .then(() => maze.completeDig(op.corridorId))
              .catch((err) => maze.failDig(op.corridorId, err?.message ?? 'excavate_failed'));
          }
          break;
        }
        case 'line:cache': {
          const res = lineBoard.cache(op.lineId, op.registroId, op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'line:curate': {
          const res = lineBoard.curate(op.lineId, op.registroId, op.to, op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'line:milestone': {
          const res = lineBoard.milestone(op.lineId, op.registroId, op.reasons, op.actorId);
          if (!res.ok) break;
          break;
        }
        case 'ledger:push':
          pushLedger(op.entryKind, {
            actorId: op.actorId,
            ...(op.ref != null ? { ref: op.ref } : {}),
            detail: op.detail ?? {}
          });
          break;
        case 'force:activate':
          activeForces.add(op.forceId);
          break;
        case 'force:deactivate':
          activeForces.delete(op.forceId);
          break;
        case 'contact:set':
          contacts[op.contact.id] = op.contact;
          break;
        case 'contact:remove':
          delete contacts[op.contactId];
          break;
        default:
          throw new Error(`op desconocida: ${op.op}`);
      }
    }
  }

  function tickActors(dt, now) {
    for (const actor of Object.values(actors)) {
      if (actor.emote && actor.emoteTs && now - actor.emoteTs > EMOTE_TTL_MS) {
        actor.emote = null;
        actor.emoteTs = null;
      }
      if (actor.riding) {
        const river = scene.rios[actor.riding.riverId];
        const dist = flow.riverDistance(river.id);
        actor.riding.progress += (flow.riverSpeed(river.id) * RIDER_SPEED_FACTOR * dt) / dist;
        if (actor.riding.progress >= 1) {
          actor.riding = null;
          actor.nodeId = river.mouthNodeId;
          actor.pose = 'idle';
          actor.zone = nav.nodos[river.mouthNodeId].zone;
        }
        actor.position = computeActorPosition(actor);
        continue;
      }
      if (actor.linkId) {
        const link = nav.enlaces[actor.linkId];
        const dist = linkDistance(link.waypoints);
        const sign = actor.direction === 'a-to-b' ? 1 : -1;
        const speed = effectiveLinkSpeed(link.walkSpeed, actor);
        actor.progress = Math.max(0, Math.min(1, actor.progress + (sign * speed * dt) / dist));
        const arrived =
          (actor.direction === 'a-to-b' && actor.progress >= 1) ||
          (actor.direction === 'b-to-a' && actor.progress <= 0);
        if (arrived) {
          const endNode = actor.direction === 'a-to-b' ? link.to : link.from;
          actor.nodeId = endNode;
          actor.linkId = null;
          actor.direction = null;
          actor.progress = null;
          actor.pose = 'idle';
          actor.zone = nav.nodos[endNode].zone;
        }
        actor.position = computeActorPosition(actor);
      }
    }
  }

  function emitTracks() {
    for (const actor of Object.values(actors)) {
      let ref = null;
      if (actor.riding) {
        ref = flow.dropletUnder(actor.riding.riverId, actor.riding.progress)?.ref ?? null;
      } else if (actor.nodeId) {
        const chamber = maze.chamber(actor.nodeId);
        if (chamber && chamber.state === 'cached') ref = chamber.ref;
      }
      const key = ref?.uri ?? null;
      if (key && lastTrackKey.get(actor.id) !== key) {
        lastTrackKey.set(actor.id, key);
        outTracks.push({
          v: 1,
          ts: Date.now(),
          actorId: actor.id,
          zone: actor.zone,
          ref,
          hint: trackHintFor(ref.kind)
        });
      }
      if (!key) lastTrackKey.delete(actor.id);
    }
  }

  function collectLedger() {
    for (const ev of flow.drainEvents()) {
      if (ev.kind === 'label') {
        progress.labeled += 1;
        pushLedger('label', {
          actorId: ev.actorId,
          ref: ev.ref,
          detail: {
            label: ev.label,
            ...(ev.riverId ? { riverId: ev.riverId } : {}),
            ...(ev.dropletId ? { dropletId: ev.dropletId } : {}),
            ...(ev.salvage ? { salvage: true } : {})
          }
        });
      } else if (ev.kind === 'burst') {
        pushLedger('burst', { detail: { tapId: ev.tapId, riverId: ev.riverId } });
      } else if (ev.kind === 'collapse') {
        pushLedger('collapse', { detail: { murk: ev.murk, capacity: ev.capacity } });
      } else if (ev.kind === 'empty') {
        pushLedger('empty', {
          actorId: ev.actorId,
          detail: {
            removed: ev.removed,
            murkBefore: ev.murkBefore,
            murkAfter: ev.murkAfter,
            dropletIds: ev.dropletIds,
            opsIntent: 'empty_playable'
          }
        });
      } else if (ev.kind === 'commit:error') {
        pushLedger('error', { detail: { message: ev.message, ref: ev.ref, label: ev.label } });
      }
    }
    for (const ev of maze.drainEvents()) {
      if (ev.kind === 'excavate') {
        progress.excavated += 1;
        pushLedger('excavate', { actorId: ev.actorId, ref: ev.ref, detail: { corridorId: ev.corridorId } });
      } else if (ev.kind === 'excavate:error') {
        pushLedger('error', { detail: { corridorId: ev.corridorId, reason: ev.reason } });
      }
    }
    for (const ev of lineBoard.drainEvents()) {
      if (ev.kind === 'cache') {
        pushLedger('cache', {
          actorId: ev.actorId,
          ref: ev.ref,
          detail: { lineId: ev.lineId, registroId: ev.registroId }
        });
      } else if (ev.kind === 'curate') {
        pushLedger('curate', {
          actorId: ev.actorId,
          ref: ev.ref,
          detail: { lineId: ev.lineId, registroId: ev.registroId, status: ev.status }
        });
      } else if (ev.kind === 'milestone') {
        pushLedger('milestone', {
          actorId: ev.actorId,
          ref: ev.ref,
          detail: { lineId: ev.lineId, registroId: ev.registroId, reasons: ev.reasons }
        });
      }
    }
    if (
      !progress.objetivoMet &&
      progress.labeled >= gamemap.objetivo.labeled &&
      progress.excavated >= gamemap.objetivo.excavated
    ) {
      progress.objetivoMet = true;
      pushLedger('objetivo', { detail: { ...gamemap.objetivo } });
    }
  }

  return {
    scene,
    nav,
    gamemap,

    /** Valida y aplica un arg:intent. Inválido ⇒ no-op con error. */
    applyIntent(payload) {
      const gate = validateIntent(payload);
      if (!gate.ok) return { ok: false, error: gate.error };
      if (
        (payload.intent === 'excavate' || payload.intent === 'cache') &&
        feeds.requiresApproval === true &&
        payload.approval !== feeds.approvalToken
      ) {
        return { ok: false, error: 'aprobacion_requerida' };
      }
      const result = reduceArgIntent(view(), payload);
      if (result.ok) {
        applyOps(result.ops);
        if (result.trackCast?.ref) {
          outTracks.push({
            v: 1,
            ts: Date.now(),
            actorId: payload.actorId,
            ref: result.trackCast.ref,
            hint: result.trackCast.hint ?? trackHintFor(result.trackCast.ref.kind)
          });
        }
      }
      return { ok: result.ok, error: result.error ?? null };
    },

    tick(deltaSec, now = Date.now()) {
      tick += 1;
      flow.tick(deltaSec);
      maze.tick(deltaSec);
      tickActors(deltaSec, now);
      emitTracks();
      collectLedger();
    },

    /** Snapshot compacto arg:state (contrato §3). */
    snapshot(reason = 'change', { fullMaze = false } = {}) {
      const flowSnap = flow.snapshot();
      const actorsOut = {};
      for (const [id, a] of Object.entries(actors)) {
        actorsOut[id] = {
          id,
          kind: a.kind,
          tier: a.tier,
          cloak: a.cloak,
          zone: a.zone,
          nodeId: a.nodeId,
          linkId: a.linkId,
          direction: a.direction,
          progress: a.progress == null ? null : Math.round(a.progress * 1000) / 1000,
          riding: a.riding
            ? { riverId: a.riding.riverId, progress: Math.round(a.riding.progress * 1000) / 1000 }
            : null,
          pose: a.pose,
          emote: a.emote,
          score: a.score,
          position: {
            x: Math.round(a.position.x * 100) / 100,
            y: Math.round(a.position.y * 100) / 100,
            z: Math.round(a.position.z * 100) / 100
          }
        };
      }
      return {
        v: 1,
        ts: Date.now(),
        tick,
        reason,
        sceneId: scene.id,
        gamemapId: gamemap.id,
        actors: actorsOut,
        taps: flowSnap.taps,
        rivers: flowSnap.rivers,
        sea: flowSnap.sea,
        maze: maze.snapshot(fullMaze),
        lines: lineBoard.snapshot(),
        contacts: Object.fromEntries(
          Object.entries(contacts).map(([id, c]) => [id, { a: c.a, b: c.b, state: c.state }])
        ),
        objetivo: {
          labeled: [progress.labeled, gamemap.objetivo.labeled],
          excavated: [progress.excavated, gamemap.objetivo.excavated]
        },
        forces: forcesReg
          ? {
              active: [...activeForces],
              boot: forcesReg.boot,
              session_budget: forcesReg.activation.session_budget,
              cotas: cotasSnapshot(forcesReg, {
                collapsed: Boolean(flow.sea.collapsed),
                victory: progress.objetivoMet
              })
            }
          : null
      };
    },

    mazeRev: () => maze.rev,
    lineRev: () => lineBoard.rev,

    /** Ledger y tracks pendientes de publicar (la autoridad los emite y limpia). */
    drainOutbox() {
      const out = { ledger: [...outLedger], tracks: [...outTracks] };
      outLedger.length = 0;
      outTracks.length = 0;
      return out;
    }
  };
}

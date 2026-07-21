/**
 * ciudad — dominio puro (sin red, sin fs, sin Date.now escondido).
 * Intents: join · walk · announce · wake · sleep.
 * Estado de barrio (vivo/latente/muerto/roto) cambia solo por intents confirmados.
 * Residente ≡ edificio en vivo (una fuente de verdad).
 */

import { INTENTS, SPAWN_NODE_ID, validateIntent } from './contract.mjs';
import {
  catalogRoleFor,
  featuresForPlayerType,
  residenteActorId,
  resolvePlayerType
} from './jugadores.mjs';
import { nodesReachable, sceneFromGamemap } from './scene.mjs';

/**
 * @param {{
 *   now?: () => number,
 *   gamemap?: object,
 *   scene?: ReturnType<typeof sceneFromGamemap>
 * }} [opts]
 */
export function createCiudadDomainState(opts = {}) {
  const clock = typeof opts.now === 'function' ? opts.now : () => Date.now();

  const scene = opts.scene
    ? opts.scene
    : opts.gamemap
      ? sceneFromGamemap(opts.gamemap)
      : null;
  if (!scene) {
    throw new Error('createCiudadDomainState: gamemap or scene required (from startpack)');
  }

  /** Mutable barrio estados (seed → runtime). */
  /** @type {Record<string, { id: string, estado: string, anchorId: string, parent: string, displayName?: string }>} */
  const barrios = Object.fromEntries(
    Object.entries(scene.barrios).map(([id, b]) => [id, { ...b }])
  );

  /**
   * @typedef {{
   *   id: string,
   *   kind: string,
   *   playerType: string,
   *   features: string[],
   *   edificioId: string|null,
   *   nodeId: string,
   *   anchorId: string|null,
   *   joinedAt: number,
   *   announced: boolean,
   *   wakes: number
   * }} Actor
   */
  /** @type {Record<string, Actor>} */
  const actors = {};
  let ledgerSeq = 0;
  let contentRev = 0;
  /** @type {object[]} */
  const ledgerOut = [];
  /** @type {object[]} */
  const trackOut = [];
  /** @type {{ actorId: string, message: string, ts: number, jugador?: string }|null} */
  let lastAnnounce = null;
  /** @type {{ barrioId: string, tool: string, actorId: string, ts: number, horseMode: string, residenteId?: string }|null} */
  let lastWake = null;
  /** @type {{ barrioId: string, actorId: string, ts: number, residenteId?: string }|null} */
  let lastSleep = null;

  function actorPos(actor) {
    return { nodeId: actor.nodeId, anchorId: actor.anchorId };
  }

  function actorPublic(a) {
    return {
      id: a.id,
      kind: a.kind,
      playerType: a.playerType,
      features: [...a.features],
      edificioId: a.edificioId,
      nodeId: a.nodeId,
      anchorId: a.anchorId,
      announced: a.announced,
      wakes: a.wakes
    };
  }

  function spawnResidente(barrioId, tool, ts) {
    const id = residenteActorId(barrioId);
    const barrio = barrios[barrioId];
    const features = featuresForPlayerType('residente', {
      edificioId: barrioId,
      extra: tool ? [`capability:${tool}`] : []
    });
    actors[id] = {
      id,
      kind: catalogRoleFor('residente'),
      playerType: 'residente',
      features,
      edificioId: barrioId,
      nodeId: barrio.parent,
      anchorId: barrio.anchorId,
      joinedAt: ts,
      announced: false,
      wakes: 0
    };
    return id;
  }

  function retireResidente(barrioId) {
    const id = residenteActorId(barrioId);
    if (actors[id]) {
      delete actors[id];
      return id;
    }
    return null;
  }

  function resolveWalkTarget(payload) {
    const anchorId = payload.anchorId ?? null;
    const nodeId = payload.nodeId ?? null;
    if (anchorId) {
      const anchor = scene.anclas[anchorId];
      if (!anchor) return { error: 'ancla_desconocida' };
      return {
        nodeId: anchor.parent,
        anchorId,
        barrioId: anchor.barrioId || anchor.slug || null
      };
    }
    if (nodeId) {
      if (!scene.nodos[nodeId]) return { error: 'nodo_desconocido' };
      return { nodeId, anchorId: null, barrioId: null };
    }
    return { error: 'destino_requerido' };
  }

  const handlers = {
    join(payload) {
      const { actorId } = payload;
      if (!actorId || typeof actorId !== 'string') {
        return { ok: false, error: 'actor_requerido' };
      }
      const playerType = resolvePlayerType(payload);
      if (playerType === 'residente') {
        return { ok: false, error: 'residente_solo_por_wake' };
      }
      if (!actors[actorId]) {
        const spawn = scene.spawnNodeId || SPAWN_NODE_ID;
        const features = featuresForPlayerType(playerType, {
          extra: Array.isArray(payload.features) ? payload.features : []
        });
        actors[actorId] = {
          id: actorId,
          kind: catalogRoleFor(playerType),
          playerType,
          features,
          edificioId: null,
          nodeId: spawn,
          anchorId: null,
          joinedAt: clock(),
          announced: false,
          wakes: 0
        };
        contentRev += 1;
      }
      return { ok: true, error: null };
    },

    walk(payload) {
      const { actorId } = payload;
      const actor = actors[actorId];
      if (!actor) return { ok: false, error: 'actor_desconocido' };
      if (actor.playerType === 'residente') {
        return { ok: false, error: 'residente_no_camina' };
      }
      const target = resolveWalkTarget(payload);
      if (target.error) return { ok: false, error: target.error };
      if (!nodesReachable(scene.enlaces, actor.nodeId, target.nodeId)) {
        return { ok: false, error: 'destino_inalcanzable' };
      }
      actor.nodeId = target.nodeId;
      actor.anchorId = target.anchorId;
      contentRev += 1;
      const ts = clock();
      trackOut.push({
        actorId,
        hint: 'walk',
        ref: {
          kind: 'walk',
          nodeId: target.nodeId,
          anchorId: target.anchorId,
          barrioId: target.barrioId,
          jugador: actor.playerType
        },
        ts,
        jugador: actor.playerType
      });
      return { ok: true, error: null };
    },

    announce(payload) {
      const { actorId } = payload;
      const actor = actors[actorId];
      if (!actor) return { ok: false, error: 'actor_desconocido' };
      if (actor.nodeId !== (scene.spawnNodeId || SPAWN_NODE_ID)) {
        return { ok: false, error: 'fuera_de_plaza' };
      }
      const message =
        typeof payload.message === 'string' && payload.message.trim()
          ? payload.message.trim().slice(0, 128)
          : 'presente';
      actor.announced = true;
      ledgerSeq += 1;
      const ts = clock();
      lastAnnounce = { actorId, message, ts, jugador: actor.playerType };
      ledgerOut.push({
        kind: 'announce',
        seq: ledgerSeq,
        actorId,
        ts,
        detail: {
          message,
          jugador: actor.playerType,
          features: [...actor.features],
          ...actorPos(actor)
        }
      });
      contentRev += 1;
      return { ok: true, error: null };
    },

    /**
     * Despertar barrio latente.
     * Ofrece tool vía horse; nace el residente del edificio (mismo tick).
     */
    wake(payload) {
      const { actorId } = payload;
      const actor = actors[actorId];
      if (!actor) return { ok: false, error: 'actor_desconocido' };

      const tool =
        typeof payload.tool === 'string' && payload.tool.trim()
          ? payload.tool.trim().slice(0, 96)
          : null;
      if (!tool) return { ok: false, error: 'tool_requerido' };

      let barrioId = payload.barrioId || null;
      if (!barrioId && actor.anchorId) {
        const a = scene.anclas[actor.anchorId];
        barrioId = a?.barrioId || a?.slug || null;
      }
      if (!barrioId) return { ok: false, error: 'barrio_requerido' };

      const barrio = barrios[barrioId];
      if (!barrio) return { ok: false, error: 'barrio_desconocido' };

      if (actor.anchorId !== barrio.anchorId) {
        return { ok: false, error: 'fuera_de_barrio' };
      }

      if (barrio.estado === 'muerto') {
        return { ok: false, error: 'barrio_muerto' };
      }
      if (barrio.estado === 'roto') {
        return { ok: false, error: 'barrio_roto' };
      }
      if (barrio.estado === 'vivo') {
        return { ok: false, error: 'barrio_ya_vivo' };
      }
      if (barrio.estado !== 'latente') {
        return { ok: false, error: 'barrio_no_latente' };
      }

      const horseMode =
        payload.horseMode === 'horse' || payload.horseOffer === true ? 'horse' : 'stub';

      barrio.estado = 'vivo';
      if (scene.anclas[barrio.anchorId]) {
        scene.anclas[barrio.anchorId] = {
          ...scene.anclas[barrio.anchorId],
          estado: 'vivo'
        };
      }
      actor.wakes = (actor.wakes || 0) + 1;
      const ts = clock();
      const residenteId = spawnResidente(barrioId, tool, ts);
      ledgerSeq += 1;
      lastWake = { barrioId, tool, actorId, ts, horseMode, residenteId };
      ledgerOut.push({
        kind: 'wake',
        seq: ledgerSeq,
        actorId,
        ts,
        detail: {
          barrioId,
          tool,
          horseMode,
          anchorId: barrio.anchorId,
          jugador: actor.playerType,
          residenteId,
          residenteFeatures: [...actors[residenteId].features],
          horseGap: horseMode === 'stub' ? 'awaiting_z06_mcp_launcher' : null
        }
      });
      trackOut.push({
        actorId,
        hint: 'horse-offer',
        ref: {
          kind: 'wake-tool',
          barrioId,
          tool,
          horseMode,
          residenteId,
          jugador: actor.playerType
        },
        ts,
        jugador: actor.playerType
      });
      contentRev += 1;
      return { ok: true, error: null };
    },

    /**
     * Apagar edificio vivo: barrio → latente y retira residente el mismo tick.
     */
    sleep(payload) {
      const { actorId } = payload;
      const actor = actors[actorId];
      if (!actor) return { ok: false, error: 'actor_desconocido' };
      if (actor.playerType === 'residente') {
        return { ok: false, error: 'residente_no_duerme_a_si' };
      }

      let barrioId = payload.barrioId || null;
      if (!barrioId && actor.anchorId) {
        const a = scene.anclas[actor.anchorId];
        barrioId = a?.barrioId || a?.slug || null;
      }
      if (!barrioId) return { ok: false, error: 'barrio_requerido' };

      const barrio = barrios[barrioId];
      if (!barrio) return { ok: false, error: 'barrio_desconocido' };
      if (barrio.estado !== 'vivo') {
        return { ok: false, error: 'barrio_no_vivo' };
      }

      barrio.estado = 'latente';
      if (scene.anclas[barrio.anchorId]) {
        scene.anclas[barrio.anchorId] = {
          ...scene.anclas[barrio.anchorId],
          estado: 'latente'
        };
      }
      const residenteId = retireResidente(barrioId);
      ledgerSeq += 1;
      const ts = clock();
      lastSleep = { barrioId, actorId, ts, residenteId: residenteId || undefined };
      ledgerOut.push({
        kind: 'sleep',
        seq: ledgerSeq,
        actorId,
        ts,
        detail: {
          barrioId,
          anchorId: barrio.anchorId,
          jugador: actor.playerType,
          residenteId,
          retirado: Boolean(residenteId)
        }
      });
      contentRev += 1;
      return { ok: true, error: null };
    }
  };

  return {
    applyIntent(payload) {
      const gate = validateIntent(payload, INTENTS);
      if (!gate.ok) return gate;
      const handler = handlers[payload.intent];
      if (!handler) return { ok: false, error: 'intent_desconocido' };
      return handler(payload);
    },

    tick(_deltaSec, _now) {
      // MVP sin tick de animación (walk es snap).
    },

    snapshot(reason, _opts = {}) {
      return {
        ts: clock(),
        reason,
        sceneId: scene.sceneId,
        spawnNodeId: scene.spawnNodeId,
        actors: Object.fromEntries(
          Object.entries(actors).map(([id, a]) => [id, actorPublic(a)])
        ),
        barrios: Object.fromEntries(
          Object.entries(barrios).map(([id, b]) => [
            id,
            { id: b.id, estado: b.estado, anchorId: b.anchorId, parent: b.parent }
          ])
        ),
        lastAnnounce: lastAnnounce ? { ...lastAnnounce } : null,
        lastWake: lastWake ? { ...lastWake } : null,
        lastSleep: lastSleep ? { ...lastSleep } : null,
        nodos: scene.nodos,
        enlaces: scene.enlaces,
        anclas: scene.anclas
      };
    },

    drainOutbox() {
      const out = { ledger: [...ledgerOut], tracks: [...trackOut] };
      ledgerOut.length = 0;
      trackOut.length = 0;
      return out;
    },

    contentRev: () => contentRev,

    explainIntent(payload) {
      const gate = validateIntent(payload, INTENTS);
      if (!gate.ok) return gate;
      if (payload.intent === 'join') {
        if (resolvePlayerType(payload) === 'residente') {
          return { ok: false, error: 'residente_solo_por_wake' };
        }
        return { ok: true, error: null };
      }
      if (payload.intent === 'walk') {
        if (!actors[payload.actorId]) return { ok: false, error: 'actor_desconocido' };
        if (actors[payload.actorId].playerType === 'residente') {
          return { ok: false, error: 'residente_no_camina' };
        }
        const target = resolveWalkTarget(payload);
        if (target.error) return { ok: false, error: target.error };
        if (!nodesReachable(scene.enlaces, actors[payload.actorId].nodeId, target.nodeId)) {
          return { ok: false, error: 'destino_inalcanzable' };
        }
        return { ok: true, error: null };
      }
      if (payload.intent === 'announce') {
        if (!actors[payload.actorId]) return { ok: false, error: 'actor_desconocido' };
        if (actors[payload.actorId].nodeId !== (scene.spawnNodeId || SPAWN_NODE_ID)) {
          return { ok: false, error: 'fuera_de_plaza' };
        }
        return { ok: true, error: null };
      }
      if (payload.intent === 'wake') {
        const dry = { ...payload };
        const actor = actors[dry.actorId];
        if (!actor) return { ok: false, error: 'actor_desconocido' };
        if (typeof dry.tool !== 'string' || !dry.tool.trim()) {
          return { ok: false, error: 'tool_requerido' };
        }
        let barrioId = dry.barrioId || null;
        if (!barrioId && actor.anchorId) {
          const a = scene.anclas[actor.anchorId];
          barrioId = a?.barrioId || a?.slug || null;
        }
        if (!barrioId) return { ok: false, error: 'barrio_requerido' };
        const barrio = barrios[barrioId];
        if (!barrio) return { ok: false, error: 'barrio_desconocido' };
        if (actor.anchorId !== barrio.anchorId) return { ok: false, error: 'fuera_de_barrio' };
        if (barrio.estado === 'muerto') return { ok: false, error: 'barrio_muerto' };
        if (barrio.estado === 'roto') return { ok: false, error: 'barrio_roto' };
        if (barrio.estado === 'vivo') return { ok: false, error: 'barrio_ya_vivo' };
        if (barrio.estado !== 'latente') return { ok: false, error: 'barrio_no_latente' };
        return { ok: true, error: null };
      }
      if (payload.intent === 'sleep') {
        const actor = actors[payload.actorId];
        if (!actor) return { ok: false, error: 'actor_desconocido' };
        if (actor.playerType === 'residente') {
          return { ok: false, error: 'residente_no_duerme_a_si' };
        }
        let barrioId = payload.barrioId || null;
        if (!barrioId && actor.anchorId) {
          const a = scene.anclas[actor.anchorId];
          barrioId = a?.barrioId || a?.slug || null;
        }
        if (!barrioId) return { ok: false, error: 'barrio_requerido' };
        const barrio = barrios[barrioId];
        if (!barrio) return { ok: false, error: 'barrio_desconocido' };
        if (barrio.estado !== 'vivo') return { ok: false, error: 'barrio_no_vivo' };
        return { ok: true, error: null };
      }
      return { ok: false, error: 'intent_desconocido' };
    },

    /** Acceso read-only a la escena sembrada (tests). */
    getScene: () => scene
  };
}

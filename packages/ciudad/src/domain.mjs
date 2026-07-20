/**
 * ciudad — dominio puro (sin red, sin fs, sin Date.now escondido).
 * Intents: join · walk · announce · wake.
 * Estado de barrio (vivo/latente/muerto/roto) cambia solo por intents confirmados.
 */

import { INTENTS, SPAWN_NODE_ID, validateIntent } from './contract.mjs';
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

  /** @type {Record<string, { id: string, kind: string, nodeId: string, anchorId: string|null, joinedAt: number, announced: boolean, wakes: number }>} */
  const actors = {};
  let ledgerSeq = 0;
  let contentRev = 0;
  /** @type {object[]} */
  const ledgerOut = [];
  /** @type {object[]} */
  const trackOut = [];
  /** @type {{ actorId: string, message: string, ts: number }|null} */
  let lastAnnounce = null;
  /** @type {{ barrioId: string, tool: string, actorId: string, ts: number, horseMode: string }|null} */
  let lastWake = null;

  function actorPos(actor) {
    return { nodeId: actor.nodeId, anchorId: actor.anchorId };
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
      if (!actors[actorId]) {
        const spawn = scene.spawnNodeId || SPAWN_NODE_ID;
        actors[actorId] = {
          id: actorId,
          kind: payload.kind === 'operator' ? 'operator' : 'player',
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
          barrioId: target.barrioId
        },
        ts
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
      lastAnnounce = { actorId, message, ts };
      ledgerOut.push({
        kind: 'announce',
        seq: ledgerSeq,
        actorId,
        ts,
        detail: { message, ...actorPos(actor) }
      });
      contentRev += 1;
      return { ok: true, error: null };
    },

    /**
     * Despertar barrio latente.
     * Ofrece tool vía horse: hasta Z06 la contraparte física puede faltar;
     * el dominio asienta el offer en ledger (horseMode: stub|horse).
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
      // mirror onto scene ancla for snapshot clarity
      if (scene.anclas[barrio.anchorId]) {
        scene.anclas[barrio.anchorId] = {
          ...scene.anclas[barrio.anchorId],
          estado: 'vivo'
        };
      }
      actor.wakes = (actor.wakes || 0) + 1;
      ledgerSeq += 1;
      const ts = clock();
      lastWake = { barrioId, tool, actorId, ts, horseMode };
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
          /**
           * Gap Z06: tools/call físico por horse vive en mcp-launcher.
           * Aquí el asiento prueba el contrato de juego.
           */
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
          horseMode
        },
        ts
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
          Object.entries(actors).map(([id, a]) => [
            id,
            {
              id: a.id,
              kind: a.kind,
              nodeId: a.nodeId,
              anchorId: a.anchorId,
              announced: a.announced,
              wakes: a.wakes
            }
          ])
        ),
        barrios: Object.fromEntries(
          Object.entries(barrios).map(([id, b]) => [
            id,
            { id: b.id, estado: b.estado, anchorId: b.anchorId, parent: b.parent }
          ])
        ),
        lastAnnounce: lastAnnounce ? { ...lastAnnounce } : null,
        lastWake: lastWake ? { ...lastWake } : null,
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
      if (payload.intent === 'join') return { ok: true, error: null };
      if (payload.intent === 'walk') {
        if (!actors[payload.actorId]) return { ok: false, error: 'actor_desconocido' };
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
        // dry-run: mirror handler gates without mutate
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
      return { ok: false, error: 'intent_desconocido' };
    },

    /** Acceso read-only a la escena sembrada (tests). */
    getScene: () => scene
  };
}

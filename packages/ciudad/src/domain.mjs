/**
 * ciudad — dominio puro (sin red, sin fs, sin Date.now escondido).
 * Intents: join · walk · announce · wake · sleep.
 * Loop: decay por tick, energía por actor, objetivo colectivo en snapshot.
 * Presencia: señales por tick (TICKS_PRESENCIA); clase `flujo` no recarga energía.
 * Reloj inyectable (`now` / tick); sin Date.now escondido en el loop.
 * Residente ≡ edificio en vivo (una fuente de verdad).
 */

import { INTENTS, LOOP_DEFAULTS, SPAWN_NODE_ID, validateIntent } from './contract.mjs';
import {
  catalogRoleFor,
  featuresForPlayerType,
  residenteActorId,
  resolvePlayerType
} from './jugadores.mjs';
import { validateSeñalDePresencia } from './presencia.mjs';
import { nodesReachable, sceneFromGamemap } from './scene.mjs';

/**
 * @param {{
 *   now?: () => number,
 *   gamemap?: object,
 *   scene?: ReturnType<typeof sceneFromGamemap>,
 *   decayVivoMs?: number,
 *   decayLatenteMs?: number,
 *   aliveTargetK?: number,
 *   wakeCost?: number,
 *   announceGain?: number,
 *   initialEnergy?: number,
 *   maxEnergy?: number,
 *   ticksPresencia?: number
 * }} [opts]
 */
export function createCiudadDomainState(opts = {}) {
  const clock = typeof opts.now === 'function' ? opts.now : () => Date.now();

  const loop = {
    decayVivoMs:
      typeof opts.decayVivoMs === 'number' ? opts.decayVivoMs : LOOP_DEFAULTS.decayVivoMs,
    decayLatenteMs:
      typeof opts.decayLatenteMs === 'number'
        ? opts.decayLatenteMs
        : LOOP_DEFAULTS.decayLatenteMs,
    aliveTargetK:
      typeof opts.aliveTargetK === 'number' ? opts.aliveTargetK : LOOP_DEFAULTS.aliveTargetK,
    wakeCost: typeof opts.wakeCost === 'number' ? opts.wakeCost : LOOP_DEFAULTS.wakeCost,
    announceGain:
      typeof opts.announceGain === 'number' ? opts.announceGain : LOOP_DEFAULTS.announceGain,
    initialEnergy:
      typeof opts.initialEnergy === 'number'
        ? opts.initialEnergy
        : LOOP_DEFAULTS.initialEnergy,
    maxEnergy: typeof opts.maxEnergy === 'number' ? opts.maxEnergy : LOOP_DEFAULTS.maxEnergy,
    ticksPresencia:
      typeof opts.ticksPresencia === 'number'
        ? opts.ticksPresencia
        : LOOP_DEFAULTS.ticksPresencia
  };

  const scene = opts.scene
    ? opts.scene
    : opts.gamemap
      ? sceneFromGamemap(opts.gamemap)
      : null;
  if (!scene) {
    throw new Error('createCiudadDomainState: gamemap or scene required (from startpack)');
  }

  const bornAt = clock();

  /** Mutable barrio estados (seed → runtime). */
  /** @type {Record<string, { id: string, estado: string, anchorId: string, parent: string, displayName?: string, lastVisitAt: number }>} */
  const barrios = Object.fromEntries(
    Object.entries(scene.barrios).map(([id, b]) => [
      id,
      { ...b, lastVisitAt: bornAt }
    ])
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
   *   wakes: number,
   *   energy: number
   * }} Actor
   */
  /** @type {Record<string, Actor>} */
  const actors = {};
  let ledgerSeq = 0;
  let contentRev = 0;
  let currentTick = 0;
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
  /** @type {{ barrioId: string, from: string, to: string, ts: number, tick: number }|null} */
  let lastDecay = null;
  /** Último tick con ≥1 señal válida por barrio (`TICKS_PRESENCIA`). */
  /** @type {Record<string, number>} */
  const lastPresenciaTick = {};
  /** Buffer de señales pendientes (fuente suscrita o ingest directo). */
  /** @type {import('./presencia.mjs').SeñalDePresencia[]} */
  const presenciaPending = [];
  /** @type {(() => void)|null} */
  let fuenteUnsub = null;
  /** @type {import('./presencia.mjs').SeñalDePresencia|null} */
  let lastPresencia = null;

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
      wakes: a.wakes,
      energy: a.energy
    };
  }

  function countVivos() {
    let n = 0;
    for (const b of Object.values(barrios)) {
      if (b.estado === 'vivo') n += 1;
    }
    return n;
  }

  function objetivoPublic() {
    const vivos = countVivos();
    return {
      vivos,
      umbral: loop.aliveTargetK,
      cumplido: vivos >= loop.aliveTargetK
    };
  }

  function markVisit(barrioId) {
    const barrio = barrios[barrioId];
    if (!barrio) return;
    barrio.lastVisitAt = clock();
  }

  function setBarrioEstado(barrio, estado) {
    barrio.estado = estado;
    if (scene.anclas[barrio.anchorId]) {
      scene.anclas[barrio.anchorId] = {
        ...scene.anclas[barrio.anchorId],
        estado
      };
    }
  }

  function recordDecay(barrioId, from, to) {
    const ts = clock();
    lastDecay = { barrioId, from, to, ts, tick: currentTick };
    ledgerSeq += 1;
    ledgerOut.push({
      kind: 'decay',
      seq: ledgerSeq,
      actorId: 'ciudad-loop',
      ts,
      detail: { barrioId, from, to, tick: currentTick }
    });
    contentRev += 1;
  }

  /**
   * Aplica una señal de presencia validada.
   * Sostiene el barrio (ventana TICKS_PRESENCIA). Nunca recarga energía
   * (tampoco clase `flujo`; solo `announce` recarga).
   * @param {import('./presencia.mjs').SeñalDePresencia} señal
   */
  function applyPresenciaSeñal(señal) {
    if (!barrios[señal.barrioId]) return { ok: false, error: 'barrio_desconocido' };
    lastPresenciaTick[señal.barrioId] = currentTick;
    lastPresencia = { ...señal, tick: currentTick };
    // Presencia ≠ announce: cero ganancia de energía en cualquier clase.
    return { ok: true, error: null };
  }

  function drainPresencia() {
    while (presenciaPending.length > 0) {
      const raw = presenciaPending.shift();
      const gate = validateSeñalDePresencia(raw);
      if (!gate.ok) continue;
      applyPresenciaSeñal(gate.señal);
    }
  }

  function hasPresenciaReciente(barrioId) {
    const last = lastPresenciaTick[barrioId];
    if (typeof last !== 'number') return false;
    return currentTick - last <= loop.ticksPresencia;
  }

  function applyDecay() {
    const now = clock();
    for (const barrio of Object.values(barrios)) {
      if (barrio.estado === 'roto' || barrio.estado === 'muerto') continue;
      // Señal en ventana TICKS_PRESENCIA → no degrada (regla §A2).
      if (hasPresenciaReciente(barrio.id)) continue;
      const idle = now - barrio.lastVisitAt;
      if (barrio.estado === 'vivo' && idle >= loop.decayVivoMs) {
        setBarrioEstado(barrio, 'latente');
        retireResidente(barrio.id);
        recordDecay(barrio.id, 'vivo', 'latente');
        barrio.lastVisitAt = now;
      } else if (barrio.estado === 'latente' && idle >= loop.decayLatenteMs) {
        setBarrioEstado(barrio, 'muerto');
        recordDecay(barrio.id, 'latente', 'muerto');
        barrio.lastVisitAt = now;
      }
    }
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
      wakes: 0,
      energy: 0
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

  function wakeGate(actor, payload) {
    const tool =
      typeof payload.tool === 'string' && payload.tool.trim()
        ? payload.tool.trim().slice(0, 96)
        : null;
    if (!tool) return { error: 'tool_requerido' };

    let barrioId = payload.barrioId || null;
    if (!barrioId && actor.anchorId) {
      const a = scene.anclas[actor.anchorId];
      barrioId = a?.barrioId || a?.slug || null;
    }
    if (!barrioId) return { error: 'barrio_requerido' };

    const barrio = barrios[barrioId];
    if (!barrio) return { error: 'barrio_desconocido' };

    if (actor.anchorId !== barrio.anchorId) {
      return { error: 'fuera_de_barrio' };
    }

    if (barrio.estado === 'muerto') {
      return { error: 'barrio_muerto' };
    }
    if (barrio.estado === 'roto') {
      return { error: 'barrio_roto' };
    }
    if (barrio.estado === 'vivo') {
      return { error: 'barrio_ya_vivo' };
    }
    if (barrio.estado !== 'latente') {
      return { error: 'barrio_no_latente' };
    }
    if (actor.energy < loop.wakeCost) {
      return { error: 'energia_insuficiente' };
    }
    return { tool, barrioId, barrio };
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
          wakes: 0,
          energy: loop.initialEnergy
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
      if (target.barrioId) markVisit(target.barrioId);
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
      actor.energy = Math.min(loop.maxEnergy, actor.energy + loop.announceGain);
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
          energy: actor.energy,
          ...actorPos(actor)
        }
      });
      contentRev += 1;
      return { ok: true, error: null };
    },

    /**
     * Despertar barrio latente.
     * Ofrece tool vía horse; nace el residente del edificio (mismo tick).
     * Gasta energía del actor.
     */
    wake(payload) {
      const { actorId } = payload;
      const actor = actors[actorId];
      if (!actor) return { ok: false, error: 'actor_desconocido' };

      const gate = wakeGate(actor, payload);
      if (gate.error) return { ok: false, error: gate.error };

      const { tool, barrioId, barrio } = gate;
      const horseMode =
        payload.horseMode === 'horse' || payload.horseOffer === true ? 'horse' : 'stub';

      actor.energy -= loop.wakeCost;
      setBarrioEstado(barrio, 'vivo');
      markVisit(barrioId);
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
          energy: actor.energy,
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

      setBarrioEstado(barrio, 'latente');
      markVisit(barrioId);
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

    /**
     * Aplica decay según reloj inyectable (`now` del constructor).
     * Antes del decay drena señales de presencia (input del tick).
     * Sin Date.now escondido en el loop: tests inyectan `now` y avanzan el
     * tiempo antes de llamar tick.
     * @param {number} [_deltaSec]
     * @param {number} [_nowMs]
     * @param {{ señales?: object[] }} [input] presencia opcional junto al tick
     */
    tick(_deltaSec, _nowMs, input = {}) {
      currentTick += 1;
      if (Array.isArray(input.señales)) {
        for (const s of input.señales) presenciaPending.push(s);
      }
      drainPresencia();
      applyDecay();
    },

    /**
     * Ingesta directa de SeñalDePresencia (tests / sin adapter).
     * Queda en buffer y se aplica en el próximo `tick`.
     * @param {object} raw
     */
    ingestPresencia(raw) {
      const gate = validateSeñalDePresencia(raw);
      if (!gate.ok) return gate;
      presenciaPending.push(gate.señal);
      return { ok: true, error: null };
    },

    /**
     * Engancha una FuentePresencia (interfaz); el reducer no conoce el adapter.
     * Swap = detach + attach de otra fuente sin tocar applyDecay.
     * @param {{ suscribir: (cb: (s: object) => void) => () => void }} fuente
     */
    attachFuentePresencia(fuente) {
      if (!fuente || typeof fuente.suscribir !== 'function') {
        return { ok: false, error: 'fuente_invalida' };
      }
      if (fuenteUnsub) {
        fuenteUnsub();
        fuenteUnsub = null;
      }
      fuenteUnsub = fuente.suscribir((señal) => {
        presenciaPending.push(señal);
      });
      return { ok: true, error: null };
    },

    detachFuentePresencia() {
      if (fuenteUnsub) {
        fuenteUnsub();
        fuenteUnsub = null;
      }
      return { ok: true, error: null };
    },

    snapshot(reason, _opts = {}) {
      return {
        ts: clock(),
        reason,
        sceneId: scene.sceneId,
        spawnNodeId: scene.spawnNodeId,
        tick: currentTick,
        actors: Object.fromEntries(
          Object.entries(actors).map(([id, a]) => [id, actorPublic(a)])
        ),
        barrios: Object.fromEntries(
          Object.entries(barrios).map(([id, b]) => [
            id,
            { id: b.id, estado: b.estado, anchorId: b.anchorId, parent: b.parent }
          ])
        ),
        objetivo: objetivoPublic(),
        lastAnnounce: lastAnnounce ? { ...lastAnnounce } : null,
        lastWake: lastWake ? { ...lastWake } : null,
        lastSleep: lastSleep ? { ...lastSleep } : null,
        lastDecay: lastDecay ? { ...lastDecay } : null,
        lastPresencia: lastPresencia ? { ...lastPresencia } : null,
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
        const actor = actors[payload.actorId];
        if (!actor) return { ok: false, error: 'actor_desconocido' };
        const dry = wakeGate(actor, payload);
        if (dry.error) return { ok: false, error: dry.error };
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
    getScene: () => scene,

    /** Contador de ticks del loop (tests). */
    getTick: () => currentTick,

    /** Parámetros de loop efectivos (tests / contrato). */
    getLoopConfig: () => ({ ...loop })
  };
}

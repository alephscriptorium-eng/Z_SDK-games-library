/**
 * ciudad — dominio puro (sin red, sin fs, sin Date.now escondido).
 * Intents: join · walk · announce · wake · sleep.
 * Loop: decay por tick, energía por actor, objetivo colectivo en snapshot.
 * Presencia: señales por tick (TICKS_PRESENCIA); clase `flujo` no recarga energía.
 * Acta: plaza/ledger (§A3); wake sin acta → `roto`; reparar cierra drift.
 * Salud: applySalud aplica señal real (I/O fuera); dominio solo estado.
 * Reloj inyectable (`now` / tick); sin Date.now escondido en el loop.
 * Residente ≡ edificio en vivo (una fuente de verdad).
 */

import { INTENTS, LOOP_DEFAULTS, SPAWN_NODE_ID, BARRIO_ESTADOS, validateIntent } from './contract.mjs';
import {
  catalogRoleFor,
  featuresForPlayerType,
  residenteActorId,
  resolvePlayerType
} from './jugadores.mjs';
import { validateSeñalDePresencia } from './presencia.mjs';
import {
  adoptarActaDesdePlaza,
  emitirActa,
  huellaLedger,
  isActaDeBarrioShaped,
  LEDGER_ACTA
} from './acta.mjs';
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
  /** Actas persistidas en plaza/ledger (sobreviven ventanas). */
  /** @type {Record<string, import('./acta.mjs').ActaDeBarrio>} */
  const actasByBarrio = {};
  /** @type {import('./acta.mjs').ActaDeBarrio|null} */
  let lastActa = null;
  /** @type {{ barrioId: string, actorId: string, ts: number, tick: number }|null} */
  let lastReparacion = null;
  /** Última señal de salud real por barrio (I/O fuera; aquí solo registro). */
  /** @type {Record<string, {
   *   barrioId: string,
   *   kind: string,
   *   ok: boolean,
   *   detail: Record<string, unknown>,
   *   checkedAt: number,
   *   estadoSugerido: string,
   *   appliedAt: number,
   *   tick: number
   * }>} */
  const saludByBarrio = {};
  /** @type {(typeof saludByBarrio)[string]|null} */
  let lastSalud = null;

  // Actas fundacionales (plaza): seeds sobreviven; drift solo si se pierde la acta.
  for (const b of Object.values(barrios)) {
    const huella = huellaLedger({
      kind: 'seed',
      barrioId: b.id,
      estado: b.estado,
      tick: 0
    });
    const acta = emitirActa({
      barrioId: b.id,
      estado: /** @type {import('./acta.mjs').ActaDeBarrio['estado']} */ (
        ACTA_ESTADOS_SAFE(b.estado)
      ),
      resumen: `Acta fundacional ${b.id}`,
      pendientes: [],
      ultimaClase: 'flujo',
      tickEmision: 0,
      huellaLedger: huella
    });
    actasByBarrio[b.id] = acta;
  }

  function ACTA_ESTADOS_SAFE(v) {
    if (v === 'vivo' || v === 'latente' || v === 'muerto' || v === 'roto') return v;
    return 'latente';
  }

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

  /**
   * Persiste acta del barrio en plaza (ledger + mapa local).
   * @param {string} barrioId
   * @param {{ ultimaClase?: string, resumen?: string, pendientes?: string[] }} [opts]
   */
  function persistirActaBarrio(barrioId, opts = {}) {
    const barrio = barrios[barrioId];
    if (!barrio) return { ok: false, error: 'barrio_desconocido' };
    const lastEvt =
      ledgerOut.length > 0
        ? ledgerOut[ledgerOut.length - 1]
        : { kind: 'acta-seed', barrioId, tick: currentTick };
    const huella = huellaLedger(lastEvt);
    const ultimaClase = /** @type {import('./acta.mjs').ActaDeBarrio['ultimaClase']} */ (
      ACTA_CLASES_SAFE(opts.ultimaClase)
    );
    const resumen =
      typeof opts.resumen === 'string' && opts.resumen.trim()
        ? opts.resumen.trim().slice(0, 400)
        : `Acta ${barrioId} estado=${barrio.estado} tick=${currentTick}`;
    const acta = emitirActa({
      barrioId,
      estado: /** @type {import('./acta.mjs').ActaDeBarrio['estado']} */ (barrio.estado),
      resumen,
      pendientes: Array.isArray(opts.pendientes) ? opts.pendientes : [],
      ultimaClase,
      tickEmision: currentTick,
      huellaLedger: huella
    });
    actasByBarrio[barrioId] = acta;
    lastActa = acta;
    ledgerSeq += 1;
    const ts = clock();
    ledgerOut.push({
      kind: LEDGER_ACTA,
      seq: ledgerSeq,
      actorId: 'ciudad-plaza',
      ts,
      detail: { acta }
    });
    contentRev += 1;
    return { ok: true, error: null, acta };
  }

  function ACTA_CLASES_SAFE(v) {
    if (v === 'residente' || v === 'visitante' || v === 'flujo') return v;
    return 'residente';
  }

  /**
   * Resuelve acta persistida: mapa local, payload.plazaEntries, o null.
   * @param {string} barrioId
   * @param {object} payload
   */
  function resolverActaAdopcion(barrioId, payload) {
    if (actasByBarrio[barrioId] && isActaDeBarrioShaped(actasByBarrio[barrioId])) {
      return actasByBarrio[barrioId];
    }
    if (Array.isArray(payload.plazaEntries)) {
      const adopt = adoptarActaDesdePlaza(payload.plazaEntries, barrioId);
      if (adopt.ok && adopt.acta) {
        actasByBarrio[barrioId] = adopt.acta;
        lastActa = adopt.acta;
        return adopt.acta;
      }
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
     * Despertar / adoptar barrio latente.
     * Con acta en plaza → vivo + residente.
     * Sin acta persistida → `roto` (drift); no nace residente.
     * Ofrece tool vía horse cuando hay acta. Gasta energía del actor.
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
      const acta = resolverActaAdopcion(barrioId, payload);
      const ts = clock();

      if (!acta) {
        // Regla §A3: sin acta en plaza → despierta roto (drift).
        setBarrioEstado(barrio, 'roto');
        markVisit(barrioId);
        actor.wakes = (actor.wakes || 0) + 1;
        ledgerSeq += 1;
        lastWake = {
          barrioId,
          tool,
          actorId,
          ts,
          horseMode,
          estado: 'roto',
          sinActa: true
        };
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
            estado: 'roto',
            sinActa: true,
            energy: actor.energy
          }
        });
        contentRev += 1;
        return { ok: true, error: null, estado: 'roto' };
      }

      setBarrioEstado(barrio, 'vivo');
      markVisit(barrioId);
      actor.wakes = (actor.wakes || 0) + 1;
      const residenteId = spawnResidente(barrioId, tool, ts);
      ledgerSeq += 1;
      lastWake = {
        barrioId,
        tool,
        actorId,
        ts,
        horseMode,
        residenteId,
        estado: 'vivo',
        actaTick: acta.tickEmision
      };
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
          estado: 'vivo',
          actaTick: acta.tickEmision,
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
      return { ok: true, error: null, estado: 'vivo' };
    },

    /**
     * Apagar edificio vivo: barrio → latente, retira residente y persiste acta
     * en la plaza (única supervivencia de ventana).
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
      // Persistencia §A3: el sleep deja acta en plaza.
      const persist = persistirActaBarrio(barrioId, {
        ultimaClase: actor.playerType === 'flujo' ? 'flujo' : 'visitante',
        resumen:
          typeof payload.resumen === 'string'
            ? payload.resumen
            : `Relevo ${barrioId} tras sleep`,
        pendientes: Array.isArray(payload.pendientes) ? payload.pendientes : []
      });
      if (!persist.ok) return { ok: false, error: persist.error };
      return { ok: true, error: null, acta: persist.acta };
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
        lastActa: lastActa ? { ...lastActa } : null,
        lastReparacion: lastReparacion ? { ...lastReparacion } : null,
        lastSalud: lastSalud ? { ...lastSalud } : null,
        salud: Object.fromEntries(
          Object.entries(saludByBarrio).map(([id, s]) => [id, { ...s }])
        ),
        actas: Object.fromEntries(
          Object.entries(actasByBarrio).map(([id, a]) => [id, { ...a }])
        ),
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
    getLoopConfig: () => ({ ...loop }),

    /**
     * Persiste acta explícita en plaza (además del sleep automático).
     * @param {string} barrioId
     * @param {object} [opts]
     */
    persistirActa(barrioId, opts = {}) {
      return persistirActaBarrio(barrioId, opts);
    },

    /**
     * Olvida acta local (simula residente que no persistió). Tests §A3.
     * @param {string} barrioId
     */
    olvidarActa(barrioId) {
      if (!barrios[barrioId]) return { ok: false, error: 'barrio_desconocido' };
      delete actasByBarrio[barrioId];
      contentRev += 1;
      return { ok: true, error: null };
    },

    /**
     * Recarga actas desde entries de plaza (ledger).
     * @param {unknown[]} entries
     */
    ingestPlazaActas(entries) {
      if (!Array.isArray(entries)) return { ok: false, error: 'entries_requeridas' };
      let n = 0;
      for (const id of Object.keys(barrios)) {
        const adopt = adoptarActaDesdePlaza(entries, id);
        if (adopt.ok && adopt.acta) {
          actasByBarrio[id] = adopt.acta;
          lastActa = adopt.acta;
          n += 1;
        }
      }
      contentRev += 1;
      return { ok: true, error: null, count: n };
    },

    /**
     * Cierra drift tras viaje de reparación Z10 (adapter; no reopen viaje).
     * `roto` → `latente`. Caller pasa resultado de `runViajeReparacionJuguete`.
     * @param {string} barrioId
     * @param {{ ok?: boolean, reparacion?: boolean, actorId?: string }} [viaje]
     */
    completarReparacion(barrioId, viaje = { ok: true, reparacion: true }) {
      const barrio = barrios[barrioId];
      if (!barrio) return { ok: false, error: 'barrio_desconocido' };
      if (barrio.estado !== 'roto') return { ok: false, error: 'barrio_no_roto' };
      if (!viaje || viaje.ok !== true || viaje.reparacion !== true) {
        return { ok: false, error: 'viaje_reparacion_incompleto' };
      }
      setBarrioEstado(barrio, 'latente');
      markVisit(barrioId);
      // Nueva acta post-reparación (drift cerrado queda en plaza).
      const persist = persistirActaBarrio(barrioId, {
        ultimaClase: 'visitante',
        resumen: `Reparacion ${barrioId} via viaje`,
        pendientes: []
      });
      if (!persist.ok) return persist;
      const ts = clock();
      lastReparacion = {
        barrioId,
        actorId: viaje.actorId || 'reparador',
        ts,
        tick: currentTick
      };
      ledgerSeq += 1;
      ledgerOut.push({
        kind: 'reparar',
        seq: ledgerSeq,
        actorId: lastReparacion.actorId,
        ts,
        detail: { barrioId, from: 'roto', to: 'latente', tick: currentTick }
      });
      contentRev += 1;
      return { ok: true, error: null, estado: 'latente', acta: persist.acta };
    },

    /**
     * Aplica señal de salud real (probe fuera del reducer).
     * Default: sincroniza estado del barrio al `estadoSugerido`.
     * `syncEstado:false` solo registra (p. ej. tras wake que ya puso vivo).
     * No lanza procesos ni exige capability (eso es C02 / launcher).
     *
     * @param {{
     *   barrioId: string,
     *   kind: string,
     *   ok: boolean,
     *   detail?: Record<string, unknown>,
     *   checkedAt?: number,
     *   estadoSugerido?: string
     * }} raw
     * @param {{ syncEstado?: boolean }} [opts]
     */
    applySalud(raw, opts = {}) {
      if (!raw || typeof raw !== 'object') {
        return { ok: false, error: 'señal_salud_requerida' };
      }
      const barrioId = typeof raw.barrioId === 'string' ? raw.barrioId.trim() : '';
      if (!barrioId || !barrios[barrioId]) {
        return { ok: false, error: 'barrio_desconocido' };
      }
      if (typeof raw.kind !== 'string' || !raw.kind.trim()) {
        return { ok: false, error: 'kind_requerido' };
      }
      if (typeof raw.ok !== 'boolean') {
        return { ok: false, error: 'ok_requerido' };
      }
      let estadoSugerido =
        typeof raw.estadoSugerido === 'string' ? raw.estadoSugerido : null;
      if (!estadoSugerido || !BARRIO_ESTADOS.includes(estadoSugerido)) {
        estadoSugerido = raw.ok ? 'vivo' : 'roto';
      }
      const checkedAt =
        typeof raw.checkedAt === 'number' && Number.isFinite(raw.checkedAt)
          ? raw.checkedAt
          : clock();
      const entry = {
        barrioId,
        kind: raw.kind.trim(),
        ok: raw.ok,
        detail:
          raw.detail && typeof raw.detail === 'object'
            ? { ...raw.detail }
            : {},
        checkedAt,
        estadoSugerido,
        appliedAt: clock(),
        tick: currentTick
      };
      saludByBarrio[barrioId] = entry;
      lastSalud = entry;

      const syncEstado = opts.syncEstado !== false;
      const barrio = barrios[barrioId];
      const from = barrio.estado;
      if (syncEstado && from !== estadoSugerido) {
        // Salud no spawnea residente (eso es wake); si baja de vivo, retira.
        if (from === 'vivo' && estadoSugerido !== 'vivo') {
          retireResidente(barrioId);
        }
        setBarrioEstado(barrio, estadoSugerido);
        if (estadoSugerido === 'vivo') {
          markVisit(barrioId);
        }
        ledgerSeq += 1;
        ledgerOut.push({
          kind: 'salud',
          seq: ledgerSeq,
          actorId: 'ciudad-salud',
          ts: entry.appliedAt,
          detail: {
            barrioId,
            kind: entry.kind,
            ok: entry.ok,
            from,
            to: estadoSugerido,
            probe: entry.detail
          }
        });
      } else {
        ledgerSeq += 1;
        ledgerOut.push({
          kind: 'salud',
          seq: ledgerSeq,
          actorId: 'ciudad-salud',
          ts: entry.appliedAt,
          detail: {
            barrioId,
            kind: entry.kind,
            ok: entry.ok,
            recorded: true,
            estado: barrio.estado,
            probe: entry.detail
          }
        });
        if (entry.ok) markVisit(barrioId);
      }
      contentRev += 1;
      return {
        ok: true,
        error: null,
        estado: barrio.estado,
        salud: { ...entry }
      };
    },

    /** Acta local de un barrio (tests). */
    getActa(barrioId) {
      return actasByBarrio[barrioId] ? { ...actasByBarrio[barrioId] } : null;
    },

    /** Última salud registrada de un barrio (tests). */
    getSalud(barrioId) {
      return saludByBarrio[barrioId] ? { ...saludByBarrio[barrioId] } : null;
    }
  };
}

/**
 * Ciudadanos con misión — destino canónico de selección (PACK).
 *
 * Origen/destino anclados a verdad del censo (zona home + barrio que decae).
 * Camino A→B via `@zeus/linea-kit/viaje` (grafo gamemap). Sin misión =
 * idle = random-walk sobre enlaces (no viaje).
 *
 * No toca engine / domain reducer: emite walks para que el caller aplique
 * `applyIntent(..., 'walk', ...)`.
 */

import {
  acceptWalks,
  createGamemapGraphSource,
  planPath,
  runViaje,
  viajeToWalkIntents
} from '@zeus/linea-kit/viaje';
import { BARRIO_ESTADOS, SPAWN_NODE_ID } from './contract.mjs';

/** Estados que «piden visita» (bias de decay / censo). */
export const DECAY_BIAS_ESTADOS = Object.freeze(['roto', 'muerto', 'latente']);

const ESTADO_RANK = Object.freeze({
  roto: 0,
  muerto: 1,
  latente: 2
});

/**
 * Adyacencia de nodos desde enlaces del gamemap (input de GraphSource viaje).
 * @param {Record<string, { from: string, to: string, bidirectional?: boolean }>} enlaces
 * @returns {Record<string, string[]>}
 */
export function streetsFromEnlaces(enlaces) {
  /** @type {Record<string, string[]>} */
  const streets = {};
  const add = (a, b) => {
    if (!a || !b) return;
    if (!streets[a]) streets[a] = [];
    if (!streets[a].includes(b)) streets[a].push(b);
  };
  for (const link of Object.values(enlaces || {})) {
    if (!link?.from || !link?.to) continue;
    add(link.from, link.to);
    if (link.bidirectional !== false) add(link.to, link.from);
  }
  return streets;
}

/**
 * @param {object} gamemap
 * @returns {Record<string, string[]>}
 */
export function streetsFromGamemap(gamemap) {
  return streetsFromEnlaces(gamemap?.enlaces || {});
}

/**
 * Vecinos de un nodo por enlaces (idle random-walk).
 * @param {Record<string, { from: string, to: string, bidirectional?: boolean }>} enlaces
 * @param {string} nodeId
 * @returns {string[]}
 */
export function neighborsOf(enlaces, nodeId) {
  const streets = streetsFromEnlaces(enlaces);
  return [...(streets[nodeId] || [])];
}

/**
 * Idle: un hop aleatorio (no planifica viaje).
 * @param {{
 *   currentNodeId: string,
 *   enlaces: Record<string, { from: string, to: string, bidirectional?: boolean }>,
 *   rng?: () => number
 * }} opts
 * @returns {{
 *   kind: 'idle',
 *   walk: { nodeId: string }|null,
 *   reason: string,
 *   from: string,
 *   candidates: string[]
 * }}
 */
export function nextIdleWalk(opts) {
  const current = opts.currentNodeId || SPAWN_NODE_ID;
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const candidates = neighborsOf(opts.enlaces || {}, current);
  if (candidates.length === 0) {
    return {
      kind: 'idle',
      walk: null,
      reason: 'idle_sin_vecinos',
      from: current,
      candidates: []
    };
  }
  const idx = Math.floor(rng() * candidates.length) % candidates.length;
  const to = candidates[idx];
  return {
    kind: 'idle',
    walk: { nodeId: to },
    reason: 'idle_random_walk',
    from: current,
    candidates
  };
}

/**
 * Selección de misión por verdad del censo (no random puro).
 * Destino = nodo padre del barrio que decae; origen = zona home / posición.
 *
 * @param {{
 *   barrios: Record<string, { id?: string, estado: string, parent: string, anchorId?: string }>,
 *   homeZoneId: string,
 *   currentNodeId?: string|null,
 *   rng?: () => number
 * }} opts
 * @returns {{
 *   kind: 'viaje'|'idle',
 *   origin?: string,
 *   destination?: string,
 *   barrioId?: string,
 *   barrioEstado?: string,
 *   anchorId?: string|null,
 *   reason: string,
 *   selection?: object
 * }}
 */
export function selectMission(opts) {
  const homeZoneId = opts.homeZoneId;
  if (typeof homeZoneId !== 'string' || !homeZoneId) {
    return { kind: 'idle', reason: 'home_zone_requerida' };
  }
  const barrios = opts.barrios || {};
  const rng = typeof opts.rng === 'function' ? opts.rng : Math.random;
  const origin = opts.currentNodeId || homeZoneId;

  /** @type {{ id: string, estado: string, parent: string, anchorId?: string, sameZone: boolean, rank: number }[]} */
  const candidates = [];
  for (const [id, b] of Object.entries(barrios)) {
    if (!b || typeof b.estado !== 'string') continue;
    if (!DECAY_BIAS_ESTADOS.includes(b.estado)) continue;
    if (!BARRIO_ESTADOS.includes(b.estado)) continue;
    if (!b.parent) continue;
    const rank = ESTADO_RANK[b.estado] ?? 99;
    candidates.push({
      id,
      estado: b.estado,
      parent: b.parent,
      anchorId: b.anchorId,
      sameZone: b.parent === homeZoneId,
      rank
    });
  }

  if (candidates.length === 0) {
    return {
      kind: 'idle',
      reason: 'sin_barrio_decay',
      selection: { homeZoneId, biasEstados: [...DECAY_BIAS_ESTADOS], candidates: [] }
    };
  }

  candidates.sort((a, b) => {
    if (a.sameZone !== b.sameZone) return a.sameZone ? -1 : 1;
    if (a.rank !== b.rank) return a.rank - b.rank;
    return a.id.localeCompare(b.id);
  });

  const bestRank = candidates[0].rank;
  const bestSame = candidates[0].sameZone;
  const tier = candidates.filter((c) => c.rank === bestRank && c.sameZone === bestSame);
  const pick = tier[Math.floor(rng() * tier.length) % tier.length];

  return {
    kind: 'viaje',
    origin,
    destination: pick.parent,
    barrioId: pick.id,
    barrioEstado: pick.estado,
    anchorId: pick.anchorId || null,
    reason: 'censo_decay_bias',
    selection: {
      homeZoneId,
      biasEstados: [...DECAY_BIAS_ESTADOS],
      candidateIds: candidates.map((c) => c.id),
      picked: pick.id,
      estado: pick.estado,
      sameZone: pick.sameZone
    }
  };
}

/**
 * Planifica A→B sobre grafo Z10 (viaje) y materializa walks de dominio.
 *
 * @param {{
 *   gamemap: object,
 *   origin: string,
 *   destination: string,
 *   viajeId?: string,
 *   barrioId?: string,
 *   anchorId?: string|null,
 *   cacheDir?: string
 * }} opts
 */
export async function planMissionViaje(opts) {
  const origin = opts.origin;
  const destination = opts.destination;
  if (!origin || !destination) {
    return { ok: false, error: 'origin_destination_requeridos', rule: 'mision.viaje.args' };
  }
  const streets = streetsFromGamemap(opts.gamemap);
  const source = createGamemapGraphSource({
    streets,
    labels: Object.fromEntries(
      Object.keys(opts.gamemap?.nodos || {}).map((id) => [id, id])
    )
  });

  const id =
    opts.viajeId ||
    `mision-${opts.barrioId || destination}-${origin}-${destination}`;

  // Camino trivial (ya en zona destino): no hace falta runViaje.
  if (origin === destination) {
    /** @type {{ nodeId?: string, anchorId?: string }[]} */
    const walks = [];
    if (opts.anchorId) walks.push({ anchorId: opts.anchorId });
    return {
      ok: true,
      path: [origin],
      walks,
      hops: 0,
      viaje: null,
      rule: 'mision.viaje.same_node'
    };
  }

  const planned = await planPath(source, origin, destination);
  if (!planned.ok) {
    return {
      ok: false,
      error: planned.error,
      rule: planned.rule || 'mision.viaje.plan',
      path: planned.path
    };
  }

  const result = await runViaje({
    id,
    origin,
    destination,
    source,
    cacheDir: opts.cacheDir,
    curation_status: 'candidate',
    segment: false
  });
  if (!result.ok) {
    return {
      ok: false,
      error: result.error,
      rule: result.rule || 'mision.viaje.run',
      path: result.path,
      recorrido: result.recorrido
    };
  }

  const converted = viajeToWalkIntents(result.recorrido || { pasos: planned.pasos });
  if (!converted.ok) {
    return {
      ok: false,
      error: converted.error,
      rule: converted.rule || 'mision.viaje.walks'
    };
  }

  const accepted = acceptWalks(converted.walks);
  if (!accepted.ok) {
    return {
      ok: false,
      error: accepted.error,
      rule: accepted.rule || 'mision.viaje.accept'
    };
  }

  /** @type {{ nodeId: string, from?: string, hop?: number }[]} */
  const walks = accepted.accepted.map((w) => ({
    nodeId: w.to,
    from: w.from,
    hop: w.hop
  }));
  if (opts.anchorId) {
    walks.push({ anchorId: opts.anchorId, nodeId: destination });
  }

  return {
    ok: true,
    path: result.path || planned.path,
    walks,
    hops: walks.length,
    viaje: result,
    rule: 'mision.viaje.ok'
  };
}

/**
 * Comportamiento del ciudadano: misión (viaje) o idle (random-walk).
 *
 * @param {{
 *   barrios: Record<string, { id?: string, estado: string, parent: string, anchorId?: string }>,
 *   homeZoneId: string,
 *   currentNodeId?: string|null,
 *   gamemap: object,
 *   rng?: () => number,
 *   forceIdle?: boolean,
 *   viajeId?: string,
 *   cacheDir?: string
 * }} opts
 */
export async function nextCitizenBehavior(opts) {
  if (opts.forceIdle) {
    const idle = nextIdleWalk({
      currentNodeId: opts.currentNodeId || opts.homeZoneId || SPAWN_NODE_ID,
      enlaces: opts.gamemap?.enlaces || {},
      rng: opts.rng
    });
    return { ...idle, mission: null };
  }

  const mission = selectMission({
    barrios: opts.barrios,
    homeZoneId: opts.homeZoneId,
    currentNodeId: opts.currentNodeId,
    rng: opts.rng
  });

  if (mission.kind !== 'viaje') {
    const idle = nextIdleWalk({
      currentNodeId: opts.currentNodeId || opts.homeZoneId || SPAWN_NODE_ID,
      enlaces: opts.gamemap?.enlaces || {},
      rng: opts.rng
    });
    return { ...idle, mission };
  }

  const planned = await planMissionViaje({
    gamemap: opts.gamemap,
    origin: mission.origin,
    destination: mission.destination,
    barrioId: mission.barrioId,
    anchorId: mission.anchorId,
    viajeId: opts.viajeId,
    cacheDir: opts.cacheDir
  });

  if (!planned.ok) {
    const idle = nextIdleWalk({
      currentNodeId: opts.currentNodeId || opts.homeZoneId || SPAWN_NODE_ID,
      enlaces: opts.gamemap?.enlaces || {},
      rng: opts.rng
    });
    return {
      kind: 'idle',
      walk: idle.walk,
      reason: 'viaje_fallback_idle',
      mission,
      viajeError: { error: planned.error, rule: planned.rule },
      from: idle.from,
      candidates: idle.candidates
    };
  }

  return {
    kind: 'viaje',
    reason: mission.reason,
    mission,
    path: planned.path,
    walks: planned.walks,
    hops: planned.hops,
    viaje: planned.viaje
  };
}

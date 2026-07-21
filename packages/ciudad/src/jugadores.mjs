/**
 * Contrato de mapeo — tres tipos de jugador → rol de catálogo + features[].
 * No abre canal de transporte: rooms / protocol / horse bastan.
 * Tablero y cronista distinguen por features / playerType en snapshot y ledger.
 */

/** @typedef {'residente'|'visitante'|'corriente'} PlayerType */

export const PLAYER_TYPES = Object.freeze(['residente', 'visitante', 'corriente']);

/**
 * Mapeo canónico (ficha Z13 / trama del agua).
 * Visitante y corriente comparten rol `player`; el cronista (narrar) usa `dj`
 * y no es un cuarto tipo de jugador de partida.
 */
export const PLAYER_TYPE_MAP = Object.freeze({
  residente: Object.freeze({
    id: 'residente',
    catalogRole: 'operator',
    verbo: 'filtra',
    featureTag: 'jugador:residente',
    edificioPrefix: 'residente:'
  }),
  visitante: Object.freeze({
    id: 'visitante',
    catalogRole: 'player',
    verbo: 'saborea',
    featureTag: 'jugador:visitante',
    edificioPrefix: null
  }),
  corriente: Object.freeze({
    id: 'corriente',
    catalogRole: 'player',
    verbo: 'canaliza',
    featureTag: 'jugador:corriente',
    edificioPrefix: null
  })
});

/**
 * Id estable del actor-residente ligado a un edificio (barrio vivo).
 * @param {string} edificioId
 */
export function residenteActorId(edificioId) {
  return `residente:${edificioId}`;
}

/**
 * Features al registrarse / aparecer en snapshot.
 * @param {PlayerType} playerType
 * @param {{ edificioId?: string, extra?: string[] }} [opts]
 * @returns {string[]}
 */
export function featuresForPlayerType(playerType, opts = {}) {
  const row = PLAYER_TYPE_MAP[playerType];
  if (!row) {
    throw new TypeError(`featuresForPlayerType: tipo desconocido "${playerType}"`);
  }
  /** @type {string[]} */
  const features = [row.featureTag];
  if (playerType === 'residente') {
    const edificioId = opts.edificioId;
    if (typeof edificioId !== 'string' || !edificioId) {
      throw new TypeError('featuresForPlayerType: residente exige edificioId');
    }
    features.push(`${row.edificioPrefix}${edificioId}`);
  }
  if (Array.isArray(opts.extra)) {
    for (const f of opts.extra) {
      if (typeof f === 'string' && f && !features.includes(f)) features.push(f);
    }
  }
  return features;
}

/**
 * @param {unknown} features
 * @returns {PlayerType|null}
 */
export function playerTypeFromFeatures(features) {
  if (!Array.isArray(features)) return null;
  for (const type of PLAYER_TYPES) {
    if (features.includes(PLAYER_TYPE_MAP[type].featureTag)) return type;
  }
  for (const f of features) {
    if (typeof f === 'string' && f.startsWith('residente:')) return 'residente';
  }
  return null;
}

/**
 * Resuelve tipo desde payload de join o actor ya materializado.
 * Default = corriente (camino rabbit / peer MCP).
 * @param {{ playerType?: string, features?: string[], kind?: string }} payload
 * @returns {PlayerType}
 */
export function resolvePlayerType(payload = {}) {
  if (payload.playerType && PLAYER_TYPE_MAP[payload.playerType]) {
    return /** @type {PlayerType} */ (payload.playerType);
  }
  const fromFeat = playerTypeFromFeatures(payload.features);
  if (fromFeat) return fromFeat;
  return 'corriente';
}

/**
 * Rol de catálogo protocol para un tipo (no abre roles nuevos).
 * @param {PlayerType} playerType
 */
export function catalogRoleFor(playerType) {
  const row = PLAYER_TYPE_MAP[playerType];
  if (!row) throw new TypeError(`catalogRoleFor: tipo desconocido "${playerType}"`);
  return row.catalogRole;
}

/**
 * Etiqueta de origen para cronista / story-board (acto V).
 * @param {PlayerType|string|null|undefined} playerType
 */
export function playerOriginLabel(playerType) {
  if (playerType && PLAYER_TYPE_MAP[playerType]) return playerType;
  return 'corriente';
}

/**
 * Cliente tablero: clasifica actores del snapshot por tipo distinguible.
 * @param {{ actors?: Record<string, { playerType?: string, features?: string[], kind?: string }> }} snapshot
 * @returns {{ byType: Record<PlayerType, string[]>, typesPresent: PlayerType[], ok: boolean }}
 */
export function classifySnapshotPlayers(snapshot) {
  /** @type {Record<PlayerType, string[]>} */
  const byType = { residente: [], visitante: [], corriente: [] };
  const actors = snapshot?.actors && typeof snapshot.actors === 'object' ? snapshot.actors : {};
  for (const [id, actor] of Object.entries(actors)) {
    const type = resolvePlayerType(actor || {});
    byType[type].push(id);
  }
  /** @type {PlayerType[]} */
  const typesPresent = PLAYER_TYPES.filter((t) => byType[t].length > 0);
  return {
    byType,
    typesPresent,
    ok: typesPresent.length >= 2
  };
}

/**
 * Cliente cronista: origen de un asiento de ledger/track.
 * @param {{ actorId?: string, detail?: { jugador?: string, playerType?: string }, jugador?: string }} entry
 * @param {Record<string, { playerType?: string, features?: string[] }>|null} [actorsIndex]
 */
export function playerOriginFromLedgerEntry(entry, actorsIndex = null) {
  const detail = entry?.detail && typeof entry.detail === 'object' ? entry.detail : {};
  const direct = detail.jugador || detail.playerType || entry?.jugador;
  if (direct && PLAYER_TYPE_MAP[direct]) return direct;
  if (actorsIndex && entry?.actorId && actorsIndex[entry.actorId]) {
    return resolvePlayerType(actorsIndex[entry.actorId]);
  }
  if (typeof entry?.actorId === 'string' && entry.actorId.startsWith('residente:')) {
    return 'residente';
  }
  return 'corriente';
}

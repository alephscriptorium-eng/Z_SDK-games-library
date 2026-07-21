/**
 * ciudad — contrato del juego (browser-safe).
 * Identidad, eventos canónicos, catálogo de intents y fábrica de intents.
 * La escena NO se hardcodea aquí: viene de @zeus/startpack-ciudad (Z02).
 * Tipos de jugador (residente/visitante/corriente): ver `./jugadores.mjs`.
 */

import {
  EVENTS as PROTOCOL_EVENTS,
  makeIntent as protocolMakeIntent,
  createIntentCatalog,
  validateIntent
} from '@zeus/protocol';

export {
  PLAYER_TYPES,
  PLAYER_TYPE_MAP,
  residenteActorId,
  featuresForPlayerType,
  playerTypeFromFeatures,
  resolvePlayerType,
  catalogRoleFor,
  playerOriginLabel,
  classifySnapshotPlayers,
  playerOriginFromLedgerEntry
} from './jugadores.mjs';

export const GAME_ID = 'ciudad';
export const PROTOCOL_VERSION = 1;

/** Room por defecto (override `ZEUS_CIUDAD_ROOM`). */
export const DEFAULT_CIUDAD_ROOM = 'CIUDAD_DEMO';

/** Autoridad en la room. */
export const AUTHORITY_USER = 'ciudad-authority';

/**
 * Puertos MCP: override `ZEUS_MCP_CIUDAD` (default 4133).
 * Slot canónico en presets-sdk = <pendiente> (no tocar zeus-sdk desde Z03).
 */

export const EVENTS = Object.freeze({
  STATE: PROTOCOL_EVENTS.STATE,
  INTENT: PROTOCOL_EVENTS.INTENT,
  TRACK: PROTOCOL_EVENTS.TRACK,
  LEDGER: PROTOCOL_EVENTS.LEDGER
});

/**
 * Catálogo mínimo:
 * - join: visitante o corriente entra (plaza); residente nace con wake
 * - walk / announce / wake: como MVP
 * - sleep: apagar edificio vivo (= retirar residente el mismo tick)
 */
export const INTENTS = createIntentCatalog({
  join: {
    roles: ['player'],
    description: 'Entrar a la ciudad (spawn en plaza); tipar con playerType/features'
  },
  walk: {
    roles: ['player'],
    description: 'Caminar por calles hasta un nodo o ancla de barrio'
  },
  announce: {
    roles: ['player', 'operator'],
    description: 'Anunciar presencia en la plaza (recarga energía del actor)'
  },
  wake: {
    roles: ['player'],
    description:
      'Despertar barrio latente ofreciendo un tool (horse / stub); nace residente; gasta energía'
  },
  sleep: {
    roles: ['player', 'operator'],
    description: 'Apagar edificio vivo: barrio→latente y retira residente el mismo tick'
  }
});

/**
 * Intent tipado con `game: 'ciudad'`.
 * @param {string} actorId
 * @param {string} intent
 * @param {object} [args]
 * @param {string|object} [fromOrOpts]
 */
export function makeIntent(actorId, intent, args = {}, fromOrOpts = actorId) {
  if (typeof fromOrOpts === 'string' || fromOrOpts == null) {
    return protocolMakeIntent(actorId, intent, args, {
      from: fromOrOpts ?? actorId,
      game: GAME_ID
    });
  }
  return protocolMakeIntent(actorId, intent, args, { ...fromOrOpts, game: GAME_ID });
}

export { validateIntent };

/** Estados de barrio admitidos (seeds Z02 / Z14). */
export const BARRIO_ESTADOS = Object.freeze(['vivo', 'latente', 'muerto', 'roto']);

/** Nodo de spawn por defecto (gobierno plaza). */
export const SPAWN_NODE_ID = 'plaza';

/**
 * Defaults del loop (decay · energía · objetivo colectivo · presencia).
 * Decay en ms vía reloj inyectable (`now`); se aplica en `tick`.
 * Presencia: ≥1 señal en los últimos `ticksPresencia` ticks → no degrada.
 * El snapshot expone `objetivo`; segundo cliente (tablero / operator-ui)
 * puede leer sin conocer el reducer.
 */
export const LOOP_DEFAULTS = Object.freeze({
  /** Ms sin visita: vivo → latente. */
  decayVivoMs: 60_000,
  /** Ms sin visita: latente → muerto (más lento). */
  decayLatenteMs: 180_000,
  /** Bien común: mantener vivos ≥ K barrios (seed ciudad-v0 ya trae varios vivos). */
  aliveTargetK: 15,
  wakeCost: 1,
  announceGain: 1,
  initialEnergy: 3,
  maxEnergy: 5,
  /**
   * Ventana de presencia en ticks (TICKS_PRESENCIA).
   * Barrio con señal reciente no degrada; sin señal, tabla ms de Z16.
   */
  ticksPresencia: 3
});

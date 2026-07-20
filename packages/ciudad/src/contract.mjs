/**
 * ciudad — contrato del juego (browser-safe).
 * Identidad, eventos canónicos, catálogo de intents y fábrica de intents.
 * La escena NO se hardcodea aquí: viene de @zeus/startpack-ciudad (Z02).
 */

import {
  EVENTS as PROTOCOL_EVENTS,
  makeIntent as protocolMakeIntent,
  createIntentCatalog,
  validateIntent
} from '@zeus/protocol';

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
 * Catálogo mínimo MVP:
 * - join: rabbit entra (plaza)
 * - walk: entre nodos/anchors por calles (sin pathfinding animado)
 * - announce: presencia en plaza (operator = plaza)
 * - wake: despertar barrio latente ofreciendo tool (horse stub hasta Z06)
 */
export const INTENTS = createIntentCatalog({
  join: {
    roles: ['player'],
    description: 'Entrar a la ciudad (spawn en plaza)'
  },
  walk: {
    roles: ['player'],
    description: 'Caminar por calles hasta un nodo o ancla de barrio'
  },
  announce: {
    roles: ['player', 'operator'],
    description: 'Anunciar presencia en la plaza'
  },
  wake: {
    roles: ['player'],
    description: 'Despertar barrio latente ofreciendo un tool (horse / stub)'
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

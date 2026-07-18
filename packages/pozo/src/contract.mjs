/**
 * pozo — contrato del juego (browser-safe).
 * Identidad, eventos canónicos, catálogo de intents y fábrica de intents.
 */

import {
  EVENTS as PROTOCOL_EVENTS,
  makeIntent as protocolMakeIntent,
  createIntentCatalog,
  validateIntent
} from '@zeus/protocol';

export const GAME_ID = 'pozo';
export const PROTOCOL_VERSION = 1;

/** Room por defecto (override `ZEUS_POZO_ROOM`). */
export const DEFAULT_POZO_ROOM = 'POZO_DEMO';

/** Autoridad en la room. */
export const AUTHORITY_USER = 'pozo-authority';

/**
 * Puertos propios del juego hasta que presets-sdk/env declare slots
 * `pozoPlayer` / `pozoView` (hallazgo → WP aparte; no se toca engine aquí).
 * Overrides: ZEUS_MCP_POZO · ZEUS_PORT_POZO_VIEW.
 */
export const DEFAULT_POZO_MCP_PORT = 4131;
export const DEFAULT_POZO_VIEW_PORT = 3025;

export const EVENTS = Object.freeze({
  STATE: PROTOCOL_EVENTS.STATE,
  INTENT: PROTOCOL_EVENTS.INTENT,
  TRACK: PROTOCOL_EVENTS.TRACK,
  LEDGER: PROTOCOL_EVENTS.LEDGER
});

/**
 * Catálogo: join, draw_drop (crecer), empty (vaciar, WP-U83) y
 * force activate/deactivate (WP-U92).
 */
export const INTENTS = createIntentCatalog({
  join: {
    roles: ['player'],
    description: 'Aparecer en la orilla del pozo'
  },
  draw_drop: {
    roles: ['player'],
    description: 'Sacar una gota del pozo y etiquetarla (asiento en ledger)'
  },
  /**
   * Vaciar el pozo de un golpe (WP-U83 / DATOS §4).
   * Roles alineados con volumes-ops empty_playable (player).
   * Coste narrativo: se pierde el agua que se podría haber etiquetado.
   */
  empty: {
    roles: ['player'],
    description: 'Derramar el pozo (liberar el vaso) con asiento en ledger'
  },
  'force:activate': {
    roles: ['operator', 'dj'],
    description: 'Activar una force del registry (session_budget / exclusiones)'
  },
  'force:deactivate': {
    roles: ['operator', 'dj'],
    description: 'Desactivar una force activa (salvo boot_always_on)'
  }
});

/**
 * Intent tipado con `game: 'pozo'`.
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

/** Escena estática: un pozo, tres nodos, un feed de líneas. */
export const POZO_SCENE = Object.freeze({
  id: 'pozo-v0',
  nodes: Object.freeze({
    orilla: Object.freeze({ id: 'orilla', label: 'Orilla', pos: [0, 0, 5] }),
    brocal: Object.freeze({ id: 'brocal', label: 'Brocal', pos: [0, 0.4, 0] }),
    fondo: Object.freeze({ id: 'fondo', label: 'Fondo', pos: [0, -1.5, 0] })
  }),
  links: Object.freeze([
    Object.freeze({ id: 'l-orilla-brocal', a: 'orilla', b: 'brocal' }),
    Object.freeze({ id: 'l-brocal-fondo', a: 'brocal', b: 'fondo' })
  ]),
  feed: Object.freeze({
    id: 'eco-pozo',
    lines: Object.freeze(['clara', 'profunda', 'eco', 'silencio', 'reflejo'])
  }),
  well: Object.freeze({
    capacity: 8,
    startLevel: 3,
    dripPerSec: 0.15
  })
});

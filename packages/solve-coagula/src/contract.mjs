/**
 * solve-coagula — contrato del juego (browser-safe).
 * Identidad, intents y fábrica. Sin hardcode en engine (regla dos juegos).
 */

import {
  EVENTS as PROTOCOL_EVENTS,
  makeIntent as protocolMakeIntent,
  createIntentCatalog,
  validateIntent
} from '@zeus/protocol';

export const GAME_ID = 'solve-coagula';
export const PROTOCOL_VERSION = 1;

/** Room por defecto (override `ZEUS_SOLVE_ROOM`). */
export const DEFAULT_SOLVE_ROOM = 'SOLVE_COAGULA_DEMO';

export const AUTHORITY_USER = 'solve-authority';

/**
 * Puertos MCP/vista: catálogo canónico en `@zeus/presets-sdk/env`
 * (`solvePlayer` / `solveView`). Overrides: ZEUS_MCP_SOLVE · ZEUS_PORT_SOLVE_VIEW.
 */

export const EVENTS = Object.freeze({
  STATE: PROTOCOL_EVENTS.STATE,
  INTENT: PROTOCOL_EVENTS.INTENT,
  TRACK: PROTOCOL_EVENTS.TRACK,
  LEDGER: PROTOCOL_EVENTS.LEDGER
});

export const INTENTS = createIntentCatalog({
  join: {
    roles: ['player'],
    description: 'Entrar como lector/agente en la dramaturgia'
  },
  open_act: {
    roles: ['player'],
    description: 'Abrir un acto del story-board (0–7)'
  },
  consult_linea: {
    roles: ['player'],
    description: 'Consultar meta del corpus linea-aleph (fixture o montaje)'
  }
});

/**
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
  return protocolMakeIntent(actorId, intent, args, {
    ...fromOrOpts,
    game: GAME_ID
  });
}

export { validateIntent };

export const SOLVE_SCENE = Object.freeze({
  id: 'solve-coagula-v0',
  title: 'SOLVE ET COAGULA',
  actCount: 8
});

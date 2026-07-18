/**
 * Puente room solve-coagula.
 */

import { createPlayerRoomBridge } from '@zeus/player-mcp-kit';
import { EVENTS, DEFAULT_SOLVE_ROOM, makeIntent } from '../contract.mjs';

/**
 * @param {{ actor: string, room?: string, user?: string, logger?: Console }} options
 */
export function createRoomBridge({
  actor,
  room = process.env.ZEUS_SOLVE_ROOM || DEFAULT_SOLVE_ROOM,
  user = `mcp-${actor}`,
  logger = console
}) {
  return createPlayerRoomBridge({
    actor,
    room,
    user,
    events: EVENTS,
    makeIntent,
    peer: {
      type: 'SolvePlayerMcp',
      features: ['solve-coagula-0.1', 'intent', 'mcp-wrapper']
    },
    logger
  });
}

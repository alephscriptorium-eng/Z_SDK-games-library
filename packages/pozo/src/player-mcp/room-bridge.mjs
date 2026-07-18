/**
 * Puente room pozo: createPlayerRoomBridge + makeIntent con game:'pozo'.
 */

import { createPlayerRoomBridge } from '@zeus/player-mcp-kit';
import { EVENTS, DEFAULT_POZO_ROOM, makeIntent } from '../contract.mjs';

/**
 * @param {{ actor: string, room?: string, user?: string, logger?: Console }} options
 */
export function createRoomBridge({
  actor,
  room = process.env.ZEUS_POZO_ROOM || DEFAULT_POZO_ROOM,
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
      type: 'PozoPlayerMcp',
      features: ['pozo-0.1', 'intent', 'mcp-wrapper']
    },
    logger
  });
}

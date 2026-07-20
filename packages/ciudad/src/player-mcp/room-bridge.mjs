/**
 * Puente room ciudad: createPlayerRoomBridge + makeIntent con game:'ciudad'.
 */

import { createPlayerRoomBridge } from '@zeus/player-mcp-kit';
import { EVENTS, DEFAULT_CIUDAD_ROOM, makeIntent } from '../contract.mjs';

/**
 * @param {{ actor: string, room?: string, user?: string, logger?: Console }} options
 */
export function createRoomBridge({
  actor,
  room = process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM,
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
      type: 'CiudadPlayerMcp',
      features: ['ciudad-0.1', 'intent', 'mcp-wrapper']
    },
    logger
  });
}

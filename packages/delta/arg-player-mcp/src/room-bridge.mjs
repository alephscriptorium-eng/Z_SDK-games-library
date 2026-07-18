/**
 * Puente de room delta: instancia createPlayerRoomBridge del kit con wire
 * `arg:*` y makeIntent de arg-domain. Extra: cache del maze completo.
 */

import { EVENTS, DEFAULT_ARG_ROOM, makeIntent } from '@zeus/arg-domain';
import { createPlayerRoomBridge } from '@zeus/player-mcp-kit';

/**
 * @param {{ actor: string, room?: string, user?: string, logger?: Console }} options
 */
export function createRoomBridge({
  actor,
  room = process.env.ZEUS_ARG_ROOM || DEFAULT_ARG_ROOM,
  user = `mcp-${actor}`,
  logger = console
}) {
  let lastMaze = null;
  const bridge = createPlayerRoomBridge({
    actor,
    room,
    user,
    events: EVENTS,
    makeIntent,
    peer: {
      type: 'ArgPlayerMcp',
      features: ['delta-0.1', 'arg-intent', 'mcp-wrapper']
    },
    onState(snapshot) {
      if (snapshot.maze?.chambers) lastMaze = snapshot.maze;
    },
    logger
  });
  bridge.maze = () => lastMaze;
  return bridge;
}

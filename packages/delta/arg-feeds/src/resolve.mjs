/**
 * Resolución async de feeds para la autoridad delta.
 * Familias comunes → @zeus/feed-kit; maze → createRealMazeSource.
 */

import {
  probeFeedMcpHealth,
  createFeedMcpClients,
  createRealStreamFeed,
  createRealGossipFeed,
  createRealStaticFeed
} from '@zeus/feed-kit';
import { resolveFeeds } from '@zeus/arg-domain';
import { resolveMcpApprovalToken } from '@zeus/presets-sdk';
import { createRealMazeSource } from './maze.mjs';

/**
 * @param {{
 *   mode?: 'auto'|'synthetic'|'real',
 *   seed?: number,
 *   logger?: Console,
 *   mcpPorts?: object,
 *   gamemap?: object,
 *   topology?: { chambers: object, corridors: object },
 *   host?: string,
 *   includeGossip?: boolean
 * }} opts
 */
export async function resolveRuntimeFeeds({
  mode = 'auto',
  seed = 1,
  logger = console,
  mcpPorts = {},
  gamemap = {},
  topology = null,
  host = 'localhost',
  includeGossip = true
} = {}) {
  if (mode === 'synthetic') {
    return resolveFeeds({ mode: 'synthetic', seed, logger });
  }

  if (mode === 'auto') {
    const ok = await probeFeedMcpHealth(mcpPorts, {
      host,
      require: ['stream', 'static']
    });
    if (!ok) {
      logger.warn?.('[arg-feeds] auto → sintético (MCP no responde)');
      return resolveFeeds({ mode: 'synthetic', seed, logger });
    }
    mode = 'real';
  }

  // Core MCP for stream + static (linea); gossip attached only if SSB health ok.
  const corePorts = {
    firehose: mcpPorts.firehose,
    lineas: mcpPorts.lineas
  };
  const clients = await createFeedMcpClients(corePorts, { host });

  const firehose = createRealStreamFeed({
    mcpPorts: corePorts,
    seed,
    logger,
    host,
    cursor: gamemap?.seeds?.firehoseCursor ?? 0,
    clients
  });
  await firehose.connect();

  const staticFeed = createRealStaticFeed({
    mcpPorts: corePorts,
    seed,
    logger,
    host,
    clients
  });

  let gossip = null;
  if (includeGossip && mcpPorts?.ssb?.disk) {
    const gossipOk = await probeFeedMcpHealth(mcpPorts, {
      host,
      require: ['gossip'],
      timeoutMs: 800
    });
    if (gossipOk) {
      const gossipClients = await createFeedMcpClients(
        { ssb: mcpPorts.ssb },
        { host }
      );
      gossip = createRealGossipFeed({
        mcpPorts: { ssb: mcpPorts.ssb },
        seed,
        logger,
        host,
        clients: gossipClients
      });
      await gossip.connect();
      clients._gossipClose = gossipClients.close;
    }
  }

  const mazeSource = createRealMazeSource({
    mcpPorts: corePorts,
    seed,
    logger,
    gamemap,
    approvalToken: resolveMcpApprovalToken(),
    host,
    clients
  });

  /** @type {object|null} */
  let mazeSeed = null;
  if (topology) {
    mazeSeed = await mazeSource.loadMaze(topology);
  }

  return {
    mode: 'real',
    requiresApproval: true,
    externalDig: true,
    approvalToken: resolveMcpApprovalToken(),
    firehose,
    mazeSource,
    ...(mazeSeed ? { mazeSeed } : {}),
    families: {
      stream: firehose,
      static: staticFeed,
      ...(gossip ? { gossip } : {})
    },
    async close() {
      await firehose.close?.();
      await gossip?.close?.();
      await mazeSource.close?.();
      if (clients._gossipClose) await clients._gossipClose();
      await clients.close?.();
    }
  };
}

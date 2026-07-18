/**
 * Factoría del servidor MCP arg-player: instancia createPlayerMcpServer del kit.
 */

import { createPlayerMcpServer } from '@zeus/player-mcp-kit';
import { SERVER_VERSION } from './config.mjs';
import {
  buildMcp,
  getResourceRegistry,
  getPromptRegistry,
  buildCardExamples
} from './logic.mjs';

/**
 * @param {{ name: string, port: number, host?: string, actor: string, confirmTimeoutMs: number, noopMs: number }} config
 * @param {object} bridge — room bridge del actor (createRoomBridge)
 */
export function createServer(config, bridge) {
  return createPlayerMcpServer({
    name: config.name,
    version: SERVER_VERSION,
    port: config.port,
    host: config.host,
    bridge,
    registry: getResourceRegistry(bridge),
    promptRegistry: getPromptRegistry(bridge),
    buildMcp: (server) => buildMcp(server, bridge, config),
    logLabel: config.name,
    getCardExamples: () => buildCardExamples(bridge),
    extraHealth: () => ({
      actorEnEstado: Boolean(bridge.myActor())
    })
  });
}

export { SERVER_VERSION };

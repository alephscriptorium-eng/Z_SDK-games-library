/**
 * @zeus/arg-player-mcp — servidor MCP que envuelve a UN jugador de delta.
 * Instancia @zeus/player-mcp-kit (un MCP = un actor). Una instancia = un
 * actor (uno :4121 · dos :4122). Emite arg:intent y verifica en
 * arg:state/arg:ledger — jamás instancia motores del dominio (G-ARG.1).
 */

export { getServerConfig, SERVER_VERSION, VALID_ACTORS, CASOS_PATH } from './config.mjs';
export { createRoomBridge } from './room-bridge.mjs';
export { createServer } from './server.mjs';
export { startArgPlayerMcp } from './start.mjs';
export { findPath, isLinkCrossable } from './nav.mjs';
export {
  staticNav,
  staticTopology,
  corridorsFrom,
  buildReducerView,
  explainIntent,
  compactActor,
  contactsOf,
  summarizeState
} from './projection.mjs';
export { readCasosMarkdown, listCasoIds, extractCaso } from './casos.mjs';

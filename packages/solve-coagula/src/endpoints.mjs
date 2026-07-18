/**
 * solve-coagula — resolución de host/puertos (Node-only).
 * Scriptorium + MCP/vista vía resolveZeus*Ports (slots solvePlayer / solveView).
 */

import { resolveZeusHost, resolveZeusMcpPorts, resolveZeusUiPorts } from '@zeus/presets-sdk/env';
import { DEFAULT_SOLVE_ROOM } from './contract.mjs';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveSolveEndpoints(env = process.env) {
  const host = resolveZeusHost();
  const ui = resolveZeusUiPorts();
  const mcp = resolveZeusMcpPorts();
  const scriptoriumPort = ui.scriptorium.port;
  const mcpPort = mcp.solvePlayer.uno;
  const viewPort = ui.solveView.port;
  const room = env.ZEUS_SOLVE_ROOM || DEFAULT_SOLVE_ROOM;
  const scriptoriumBase =
    env.ZEUS_SCRIPTORIUM_URL || `http://${host}:${scriptoriumPort}`;
  const scriptoriumUrl = scriptoriumBase.replace(/\/runtime\/?$/, '');
  const scriptoriumBrowserUrl = `${scriptoriumUrl}/runtime`;
  return {
    host,
    room,
    scriptoriumPort,
    scriptoriumUrl,
    scriptoriumBrowserUrl,
    mcpPort,
    viewPort
  };
}

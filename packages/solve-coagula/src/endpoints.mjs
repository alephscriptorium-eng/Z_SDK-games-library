/**
 * solve-coagula — resolución de host/puertos (Node-only).
 */

import { readEnvPort, resolveZeusHost, resolveZeusUiPorts } from '@zeus/presets-sdk/env';
import {
  DEFAULT_SOLVE_MCP_PORT,
  DEFAULT_SOLVE_ROOM,
  DEFAULT_SOLVE_VIEW_PORT
} from './contract.mjs';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveSolveEndpoints(env = process.env) {
  const host = resolveZeusHost();
  const ui = resolveZeusUiPorts();
  const scriptoriumPort = ui.scriptorium.port;
  const mcpPort = readEnvPort('ZEUS_MCP_SOLVE', DEFAULT_SOLVE_MCP_PORT);
  const viewPort = readEnvPort('ZEUS_PORT_SOLVE_VIEW', DEFAULT_SOLVE_VIEW_PORT);
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

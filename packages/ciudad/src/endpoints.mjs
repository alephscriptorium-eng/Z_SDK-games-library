/**
 * ciudad — resolución de host/puertos (Node-only).
 * MCP vía ZEUS_MCP_CIUDAD (default 4133); sin slot presets-sdk aún.
 */

import { resolveZeusHost, resolveZeusUiPorts, readEnvPort } from '@zeus/presets-sdk/env';
import { DEFAULT_CIUDAD_ROOM } from './contract.mjs';

/** Default MCP player port (no presets slot yet — gap documentado). */
export const DEFAULT_CIUDAD_MCP_PORT = 4133;

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolveCiudadEndpoints(env = process.env) {
  const host = resolveZeusHost();
  const ui = resolveZeusUiPorts();
  const scriptoriumPort = ui.scriptorium.port;
  const mcpPort = readEnvPort('ZEUS_MCP_CIUDAD', DEFAULT_CIUDAD_MCP_PORT);
  const room = env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM;
  const scriptoriumBase =
    env.ZEUS_SCRIPTORIUM_URL || `http://${host}:${scriptoriumPort}`;
  const scriptoriumUrl = scriptoriumBase.replace(/\/runtime\/?$/, '');
  return {
    host,
    room,
    scriptoriumPort,
    scriptoriumUrl,
    scriptoriumBrowserUrl: `${scriptoriumUrl}/runtime`,
    mcpPort
  };
}

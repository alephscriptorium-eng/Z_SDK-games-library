/**
 * pozo — resolución de host/puertos (Node-only).
 * Scriptorium + MCP/vista vía resolveZeus*Ports (slots pozoPlayer / pozoView).
 */

import { resolveZeusHost, resolveZeusMcpPorts, resolveZeusUiPorts } from '@zeus/presets-sdk/env';
import { DEFAULT_POZO_ROOM } from './contract.mjs';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolvePozoEndpoints(env = process.env) {
  const host = resolveZeusHost();
  const ui = resolveZeusUiPorts();
  const mcp = resolveZeusMcpPorts();
  const scriptoriumPort = ui.scriptorium.port;
  const mcpPort = mcp.pozoPlayer.uno;
  const viewPort = ui.pozoView.port;
  const room = env.ZEUS_POZO_ROOM || DEFAULT_POZO_ROOM;
  const scriptoriumBase =
    env.ZEUS_SCRIPTORIUM_URL || `http://${host}:${scriptoriumPort}`;
  const scriptoriumUrl = scriptoriumBase.replace(/\/runtime\/?$/, '');
  const scriptoriumBrowserUrl = `${scriptoriumUrl}/runtime`;
  return {
    host,
    room,
    scriptoriumPort,
    /** Base para ZEUS_SCRIPTORIUM_URL / @zeus/rooms (sin /runtime). */
    scriptoriumUrl,
    /** URL inyectada en #viewer-config del navegador. */
    scriptoriumBrowserUrl,
    mcpPort,
    viewPort
  };
}

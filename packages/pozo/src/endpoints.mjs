/**
 * pozo — resolución de host/puertos (Node-only).
 * Scriptorium vía resolveZeusUiPorts; MCP/vista vía readEnvPort
 * (slots aún no en DEFAULT_ZEUS_* — hallazgo SDK).
 */

import { readEnvPort, resolveZeusHost, resolveZeusUiPorts } from '@zeus/presets-sdk/env';
import {
  DEFAULT_POZO_MCP_PORT,
  DEFAULT_POZO_ROOM,
  DEFAULT_POZO_VIEW_PORT
} from './contract.mjs';

/**
 * @param {NodeJS.ProcessEnv} [env]
 */
export function resolvePozoEndpoints(env = process.env) {
  const host = resolveZeusHost();
  const ui = resolveZeusUiPorts();
  const scriptoriumPort = ui.scriptorium.port;
  const mcpPort = readEnvPort('ZEUS_MCP_POZO', DEFAULT_POZO_MCP_PORT);
  const viewPort = readEnvPort('ZEUS_PORT_POZO_VIEW', DEFAULT_POZO_VIEW_PORT);
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

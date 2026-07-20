/**
 * Config MCP ciudad: una instancia = UN actor (rabbit).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveZeusHost } from '@zeus/presets-sdk/env';
import { DEFAULT_CIUDAD_ROOM } from '../contract.mjs';
import { resolveCiudadEndpoints } from '../endpoints.mjs';

export const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
export const CASOS_PATH = path.join(packageDir, 'spec', 'CASOS.md');

export const SERVER_VERSION = '0.1.0';
export const DEFAULT_ACTOR = 'rabbit';
export const DEFAULT_CONFIRM_TIMEOUT_MS = 15000;
export const DEFAULT_NOOP_MS = 3000;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ actor?: string }} [overrides]
 */
export function getServerConfig(env = process.env, overrides = {}) {
  const actor = overrides.actor || env.ZEUS_CIUDAD_PLAYER_ACTOR || DEFAULT_ACTOR;
  const endpoints = resolveCiudadEndpoints(env);
  return {
    actor,
    name: `ciudad-player-mcp-${actor}`,
    port: endpoints.mcpPort,
    host: resolveZeusHost(),
    room: env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM,
    confirmTimeoutMs: Number(env.ZEUS_CIUDAD_MCP_TIMEOUT_MS || DEFAULT_CONFIRM_TIMEOUT_MS),
    noopMs: Number(env.ZEUS_CIUDAD_MCP_NOOP_MS || DEFAULT_NOOP_MS)
  };
}

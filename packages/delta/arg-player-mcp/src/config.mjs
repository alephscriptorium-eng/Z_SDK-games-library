/**
 * Configuración del arg-player-mcp: una instancia = UN actor del delta.
 * Puertos por convención DEFAULT_ZEUS_MCP.argPlayer (uno 4121 / dos 4122,
 * override ZEUS_MCP_ARG_UNO / ZEUS_MCP_ARG_DOS).
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveZeusMcpPorts, resolveZeusHost } from '@zeus/presets-sdk/env';
import { DEFAULT_ARG_ROOM } from '@zeus/arg-domain/contract';

/** Raíz del paquete (para localizar packages/delta/spec/CASOS.md). */
export const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

/** Ruta del playbook de casos de validación. */
export const CASOS_PATH = path.join(packageDir, '..', 'spec', 'CASOS.md');

export const SERVER_VERSION = '0.1.0';
export const VALID_ACTORS = ['uno', 'dos'];

/** Timeout de confirmación observable en arg:state (ms). */
export const DEFAULT_CONFIRM_TIMEOUT_MS = 15000;
/** Ventana corta de detección de no-op (rechazo silencioso de la autoridad). */
export const DEFAULT_NOOP_MS = 3000;

/**
 * @param {NodeJS.ProcessEnv} [env]
 * @param {{ actor?: string }} [overrides]
 */
export function getServerConfig(env = process.env, overrides = {}) {
  const actor = overrides.actor || env.ZEUS_ARG_PLAYER_ACTOR || 'uno';
  if (!VALID_ACTORS.includes(actor)) {
    throw new Error(
      `ZEUS_ARG_PLAYER_ACTOR inválido: "${actor}" (válidos: ${VALID_ACTORS.join(', ')})`
    );
  }
  const ports = resolveZeusMcpPorts().argPlayer;
  return {
    actor,
    name: `arg-player-mcp-${actor}`,
    port: ports[actor],
    host: resolveZeusHost(),
    room: env.ZEUS_ARG_ROOM || DEFAULT_ARG_ROOM,
    confirmTimeoutMs: Number(env.ZEUS_ARG_MCP_TIMEOUT_MS || DEFAULT_CONFIRM_TIMEOUT_MS),
    noopMs: Number(env.ZEUS_ARG_MCP_NOOP_MS || DEFAULT_NOOP_MS)
  };
}

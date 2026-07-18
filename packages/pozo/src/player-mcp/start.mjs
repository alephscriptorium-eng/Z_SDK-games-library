/**
 * CLI: MCP de jugador pozo.
 * Actor: ZEUS_POZO_PLAYER_ACTOR (default uno) u --actor=.
 * Puerto: ZEUS_MCP_POZO (default 4131).
 */

import { isMainModule, runMcpMain } from '@zeus/presets-sdk/mcp';
import { getServerConfig } from './config.mjs';
import { createRoomBridge } from './room-bridge.mjs';
import { createServer } from './server.mjs';

function actorFromArgv(argv = process.argv.slice(2)) {
  for (const arg of argv) {
    const match = /^--actor=(.+)$/.exec(arg);
    if (match) return match[1];
  }
  return undefined;
}

/**
 * @param {object} [configOverride]
 */
export async function startPozoPlayerMcp(configOverride = {}) {
  const config = {
    ...getServerConfig(process.env, { actor: actorFromArgv() }),
    ...configOverride
  };
  const bridge = createRoomBridge({ actor: config.actor, room: config.room });
  const factory = createServer(config, bridge);
  const handle = await factory.start();
  console.log(
    `[${config.name}] actor=${config.actor} · room=${config.room} · esperando state de la autoridad`
  );
  bridge.connectWithRetry().catch((err) => {
    console.error(`[${config.name}] conexión a la room abandonada:`, err.message);
  });
  const close = handle.close;
  return {
    ...handle,
    bridge,
    close: async () => {
      bridge.close();
      await close();
    }
  };
}

if (isMainModule(import.meta.url)) {
  await runMcpMain(startPozoPlayerMcp);
}

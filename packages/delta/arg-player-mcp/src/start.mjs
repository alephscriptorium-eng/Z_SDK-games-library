/**
 * CLI: npm run start:arg-player-mcp — servidor MCP del jugador.
 * Actor: env ZEUS_ARG_PLAYER_ACTOR (uno|dos) u override --actor=dos.
 * Puertos: uno :4121 (ZEUS_MCP_ARG_UNO) · dos :4122 (ZEUS_MCP_ARG_DOS).
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
 * Arranca bridge + servidor. La conexión a la room reintenta en segundo
 * plano: /mcp/health expone `connected` para esperar sin carreras.
 */
export async function startArgPlayerMcp(configOverride = {}) {
  const config = { ...getServerConfig(process.env, { actor: actorFromArgv() }), ...configOverride };
  const bridge = createRoomBridge({ actor: config.actor, room: config.room });
  const factory = createServer(config, bridge);
  const handle = await factory.start();
  console.log(
    `[${config.name}] actor=${config.actor} · room=${config.room} · esperando arg:state de la autoridad`
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
  await runMcpMain(startArgPlayerMcp);
}

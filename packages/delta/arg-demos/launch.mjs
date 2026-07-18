/**
 * Demo delta: socket-server + cache/firehose browsers + autoridad +
 * arg-console. Abre 5 ventanas del juego (tablero, 2 jugadores, cache, firehose).
 * Patrón heredado de game-demos/launch.mjs.
 */

import { spawn } from 'node:child_process';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadEnv, monorepoRoot } from './lib/load-env.mjs';
import { openBrowser, resolveZeusUiPorts, resolveZeusMcpPorts } from '@zeus/presets-sdk/env';

const packageRoot = dirname(fileURLToPath(import.meta.url));
loadEnv();

const HOST = process.env.ZEUS_HOST || 'localhost';
const SOCKET_PORT = Number(process.env.ZEUS_PORT_SCRIPTORIUM || 3017);
const CONSOLE_PORT = Number(process.env.ZEUS_PORT_ARG_CONSOLE || 3021);
const ROOM = process.env.ZEUS_ARG_ROOM || 'ARG_DELTA';
const ui = resolveZeusUiPorts();
const CACHE_PORT = ui.view.port;
const FIREHOSE_PORT = ui.firehose.port;
const TRACK_ACTOR = process.env.ZEUS_ARG_TRACK_ACTOR || 'uno';
const PLAYER_MCP_PORTS = resolveZeusMcpPorts().argPlayer; // uno :4121 · dos :4122

const children = [];

function portOpen(port, host) {
  return new Promise((resolve) => {
    const socket = net.connect({ port, host, timeout: 1200 });
    socket.once('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => {
      socket.destroy();
      resolve(false);
    });
  });
}

function pipeWithPrefix(label, stream, target, { filter } = {}) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length === 0) continue;
      if (filter?.(line)) continue;
      target.write(`[${label}] ${line}\n`);
    }
  });
}

function startApp(label, appPath, extraEnv = {}, opts = {}) {
  const stdio = opts.quiet
    ? ['inherit', 'ignore', 'pipe']
    : ['inherit', 'pipe', 'pipe'];
  const child = spawn(process.execPath, [appPath], {
    cwd: monorepoRoot,
    env: { ...process.env, ...extraEnv },
    stdio
  });
  if (!opts.quiet) {
    pipeWithPrefix(label, child.stdout, process.stdout);
  }
  pipeWithPrefix(label, child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    if (signal) console.log(`[launch] ${label} terminó (${signal})`);
    else if (code && code !== 0) console.error(`[launch] ${label} salió con código ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

async function ensureService(label, port, appPath, extraEnv = {}) {
  const already = await portOpen(port, HOST);
  if (already) {
    console.log(`[launch] ${label} ya corriendo en :${port} — lo reutilizo`);
    return;
  }
  console.log(`[launch] levantando ${label} en :${port}`);
  startApp(label, appPath, extraEnv);
  for (let i = 0; i < 40; i++) {
    if (await portOpen(port, HOST)) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  console.warn(`[launch] ${label} no respondió en :${port} a tiempo`);
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

// SIGINT (Ctrl+C) y SIGTERM (herramientas: stop:arg, kill, TaskStop del harness).
// Sin el handler de SIGTERM el launcher moría sin cascadear y dejaba los hijos
// huérfanos en sus 6 puertos; el siguiente arranque los "reutilizaba" con estado
// sucio (incluido un mar ya colapsado). Mismo patrón que el resto de servicios.
for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[launch] parando demo… (${signal})`);
    shutdown(0);
  });
}

console.log('');
console.log('┌────────────────────────────────────────────┐');
console.log('│  🌊 delta · demo 3 visores · @zeus/arg     │');
console.log('└────────────────────────────────────────────┘');
console.log('');

const socketAlready = await portOpen(SOCKET_PORT, HOST);
if (socketAlready) {
  console.log(`[launch] socket-server ya corriendo en :${SOCKET_PORT} — lo reutilizo`);
} else {
  console.log(`[launch] levantando socket-server en :${SOCKET_PORT}`);
  startApp('socket', join(monorepoRoot, 'packages/mesh/socket-server/src/index.mjs'), {}, { quiet: true });
  for (let i = 0; i < 40; i++) {
    if (await portOpen(SOCKET_PORT, HOST)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
}

const browserEnv = {
  ZEUS_ARG_ROOM: ROOM,
  ZEUS_ARG_TRACK_ACTOR: TRACK_ACTOR
};

await ensureService(
  'cache',
  CACHE_PORT,
  join(monorepoRoot, 'packages/mesh/cache-browser/src/server.mjs'),
  browserEnv
);
await ensureService(
  'firehose',
  FIREHOSE_PORT,
  join(monorepoRoot, 'packages/mesh/firehose-browser/src/server.mjs'),
  browserEnv
);

startApp('authority', join(packageRoot, 'apps/authority/index.mjs'), {
  ZEUS_ARG_ROOM: ROOM,
  ZEUS_SCRIPTORIUM_URL: process.env.ZEUS_SCRIPTORIUM_URL || `http://${HOST}:${SOCKET_PORT}`
});

setTimeout(() => {
  startApp('tap-horse', join(packageRoot, 'apps/tap-horse/index.mjs'), {
    ZEUS_ARG_ROOM: ROOM,
    ZEUS_SCRIPTORIUM_URL: process.env.ZEUS_SCRIPTORIUM_URL || `http://${HOST}:${SOCKET_PORT}`
  });
}, 400);

// Control MCP de jugadores: una instancia = un actor (uno/dos).
setTimeout(() => {
  for (const actor of Object.keys(PLAYER_MCP_PORTS)) {
    startApp(`mcp-${actor}`, join(packageRoot, '../arg-player-mcp/src/start.mjs'), {
      ZEUS_ARG_PLAYER_ACTOR: actor,
      ZEUS_ARG_ROOM: ROOM,
      ZEUS_SCRIPTORIUM_URL: process.env.ZEUS_SCRIPTORIUM_URL || `http://${HOST}:${SOCKET_PORT}`,
      ZEUS_MCP_ARG_UNO: String(PLAYER_MCP_PORTS.uno),
      ZEUS_MCP_ARG_DOS: String(PLAYER_MCP_PORTS.dos)
    });
  }
}, 500);

setTimeout(() => {
  startApp('console', join(packageRoot, '../arg-console/src/server.mjs'), {
    ZEUS_PORT_ARG_CONSOLE: String(CONSOLE_PORT),
    ZEUS_ARG_ROOM: ROOM
  });
}, 600);

setTimeout(async () => {
  const base = `http://${HOST}:${CONSOLE_PORT}`;
  const cacheBase = `http://${HOST}:${CACHE_PORT}`;
  const firehoseBase = `http://${HOST}:${FIREHOSE_PORT}`;

  for (let i = 0; i < 40; i++) {
    if (await portOpen(CONSOLE_PORT, HOST)) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  const viewers = [
    { label: '🗺️  tablero', url: `${base}/views/tablero` },
    { label: '🧍 jugador 1', url: `${base}/views/jugador?actor=uno` },
    { label: '🧍 jugador 2', url: `${base}/views/jugador?actor=dos` },
    { label: '📂 cache-browser', url: `${cacheBase}/?actor=${TRACK_ACTOR}` },
    { label: '🔥 firehose-browser', url: `${firehoseBase}/?actor=${TRACK_ACTOR}` }
  ];

  console.log('');
  console.log('[launch] ── visores delta (5 ventanas) ────────────────');
  for (const { label, url } of viewers) {
    console.log(`[launch]   ${label} → ${url}`);
  }
  console.log(`[launch]   (room ${ROOM} · track actor=${TRACK_ACTOR} · Ctrl+C para parar)`);
  console.log('[launch] ──────────────────────────────────────────────');
  console.log('');
  console.log('[launch] ── 🎮 control MCP de jugadores ───────────────');
  for (const [actor, port] of Object.entries(PLAYER_MCP_PORTS)) {
    console.log(
      `[launch]   ${actor} → http://${HOST}:${port}/mcp (health http://${HOST}:${port}/mcp/health)`
    );
  }
  console.log('[launch]   playbook: packages/delta/spec/CASOS.md (resource arg://casos · prompt validar-caso)');
  console.log('[launch] ──────────────────────────────────────────────');
  console.log('');

  // Opt-in: solo abre con ZEUS_OPEN_BROWSER=1 (default: no abrir).
  if (process.env.ZEUS_OPEN_BROWSER !== '1') {
    console.log('[launch] ZEUS_OPEN_BROWSER≠1 — no abro navegador (opt-in: =1)');
    return;
  }

  console.log('[launch] abriendo visores en el navegador…');
  for (const { url } of viewers) {
    openBrowser(url);
    await new Promise((r) => setTimeout(r, 400));
  }
}, 2200);

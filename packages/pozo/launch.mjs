/**
 * Demo pozo: socket-server + autoridad + vista + MCP jugador.
 * Navegador: solo si ZEUS_OPEN_BROWSER=1.
 */

import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import net from 'node:net';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadZeusEnv, openBrowser } from '@zeus/presets-sdk/env';
import { resolvePozoEndpoints } from './src/endpoints.mjs';
import { GAME_ID } from './src/contract.mjs';

const packageRoot = dirname(fileURLToPath(import.meta.url));
const libraryRoot = join(packageRoot, '../..');
const require = createRequire(import.meta.url);
const { resolveZeusSdkRoot } = require(join(libraryRoot, 'scripts/zeus-sdk-root.cjs'));
const monorepoRoot = resolveZeusSdkRoot();
loadZeusEnv();

const endpoints = resolvePozoEndpoints();
const HOST = endpoints.host;
const ROOM = endpoints.room;
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

function pipeWithPrefix(label, stream, target) {
  let buffer = '';
  stream.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop() ?? '';
    for (const line of lines) {
      if (line.length === 0) continue;
      target.write(`[${label}] ${line}\n`);
    }
  });
}

function startApp(label, appPath, extraEnv = {}, opts = {}) {
  const stdio = opts.quiet ? ['inherit', 'ignore', 'pipe'] : ['inherit', 'pipe', 'pipe'];
  const child = spawn(process.execPath, [appPath], {
    cwd: monorepoRoot,
    env: {
      ...process.env,
      ZEUS_HOST: HOST,
      ZEUS_PORT_SCRIPTORIUM: String(endpoints.scriptoriumPort),
      ZEUS_SCRIPTORIUM_URL: endpoints.scriptoriumUrl,
      ZEUS_POZO_ROOM: ROOM,
      ZEUS_MCP_POZO: String(endpoints.mcpPort),
      ZEUS_PORT_POZO_VIEW: String(endpoints.viewPort),
      ...extraEnv
    },
    stdio
  });
  if (!opts.quiet) pipeWithPrefix(label, child.stdout, process.stdout);
  pipeWithPrefix(label, child.stderr, process.stderr);
  child.on('exit', (code, signal) => {
    if (signal) console.log(`[launch] ${label} terminó (${signal})`);
    else if (code && code !== 0) console.error(`[launch] ${label} salió con código ${code}`);
    shutdown(code ?? 0);
  });
  children.push(child);
  return child;
}

function shutdown(code = 0) {
  for (const child of children) {
    if (!child.killed) child.kill('SIGTERM');
  }
  setTimeout(() => process.exit(code), 300);
}

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => {
    console.log(`\n[launch] parando demo pozo… (${signal})`);
    shutdown(0);
  });
}

console.log('');
console.log('┌────────────────────────────────────────────┐');
console.log(`│  🫧 pozo · demo · game=${GAME_ID.padEnd(12)} │`);
console.log('└────────────────────────────────────────────┘');
console.log('');

const socketAlready = await portOpen(endpoints.scriptoriumPort, HOST);
if (socketAlready) {
  console.log(`[launch] socket-server ya en :${endpoints.scriptoriumPort} — reutilizo`);
} else {
  console.log(`[launch] levantando socket-server en :${endpoints.scriptoriumPort}`);
  startApp(
    'socket',
    join(monorepoRoot, 'packages/mesh/socket-server/src/index.mjs'),
    {},
    { quiet: true }
  );
  for (let i = 0; i < 40; i++) {
    if (await portOpen(endpoints.scriptoriumPort, HOST)) break;
    await new Promise((r) => setTimeout(r, 250));
  }
}

startApp('authority', join(packageRoot, 'src/authority.mjs'));

setTimeout(() => {
  startApp('mcp-uno', join(packageRoot, 'src/player-mcp/start.mjs'), {
    ZEUS_POZO_PLAYER_ACTOR: 'uno'
  });
}, 400);

setTimeout(() => {
  startApp('view', join(packageRoot, 'src/view/server.mjs'));
}, 500);

setTimeout(async () => {
  for (let i = 0; i < 40; i++) {
    if (await portOpen(endpoints.viewPort, HOST)) break;
    await new Promise((r) => setTimeout(r, 250));
  }

  const viewUrl = `http://${HOST}:${endpoints.viewPort}/views/pozo`;
  const mcpUrl = `http://${HOST}:${endpoints.mcpPort}/mcp`;

  console.log('');
  console.log('[launch] ── pozo ──────────────────────────────────');
  console.log(`  room       ${ROOM}`);
  console.log(`  vista      ${viewUrl}`);
  console.log(`  MCP uno    ${mcpUrl}`);
  console.log(`  health     http://${HOST}:${endpoints.mcpPort}/mcp/health`);
  console.log(`  browser    ZEUS_OPEN_BROWSER=${process.env.ZEUS_OPEN_BROWSER === '1' ? '1 (abre)' : 'off'}`);
  console.log('');

  openBrowser(viewUrl);
}, 800);

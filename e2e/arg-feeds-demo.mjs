/**
 * E2E WP-14: feeds MCP reales + auto-degrade.
 *
 * Escenario A — real: firehose + linea MCP, gotas firehose://post/..., excavate + cache_wikitext
 * Escenario B — auto: sin MCP, degrada a sintético
 *
 * Uso: npm run e2e:arg-feeds
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';
import { connectMcp, toolResultJson } from '@zeus/test-utils';
import { resolveMcpApprovalToken } from '@zeus/presets-sdk';
import { startFirehoseMcp } from '../packages/mesh/linea-firehose/src/start.mjs';
import { startAll } from '../packages/mesh/linea-system/src/start.mjs';
import { applyE2eLineaPorts, shutdownE2E } from './helpers.mjs';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo

const HOST = 'localhost';
const SOCKET_PORT = 13037;
const SOCKET_PORT_AUTO = 13038;
const FIREHOSE_MCP_PORT = 13008;
const ROOM = 'ARG_FEEDS_E2E';
const ROOM_AUTO = 'ARG_FEEDS_AUTO';
const SECRET = 'dev-secret';

let failures = 0;
const children = [];
let mcpHandles = [];

function gate(id, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${id}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failures += 1;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = await fn();
    if (value) return value;
    await sleep(150);
  }
  throw new Error(`timeout esperando: ${label}`);
}

async function waitForHealth(port, label) {
  await waitFor(async () => {
    try {
      const res = await fetch(`http://${HOST}:${port}/health`);
      return res.ok;
    } catch {
      return false;
    }
  }, 20000, label);
}

function startApp(label, appPath, extraEnv = {}) {
  const logs = { out: '', err: '' };
  const child = spawn(process.execPath, [appPath], {
    cwd: sdkRoot,
    env: {
      ...process.env,
      ZEUS_HOST: HOST,
      ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT),
      ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT}`,
      ZEUS_SCRIPTORIUM_SECRET: SECRET,
      ZEUS_ARG_ROOM: ROOM,
      ZEUS_MCP_FIREHOSE: String(FIREHOSE_MCP_PORT),
      ZEUS_MCP_LINEA_ESPAN: '14111',
      ZEUS_MCP_LINEA_WP: '14112',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (c) => {
    logs.out += c;
    if (process.env.ARG_E2E_VERBOSE) process.stdout.write(`[${label}] ${c}`);
  });
  child.stderr.on('data', (c) => {
    logs.err += c;
    process.stderr.write(`[${label}!] ${c}`);
  });
  children.push(child);
  child.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      process.stderr.write(`[${label}] exited ${code}\n${logs.err}\n`);
    }
  });
  return { child, logs };
}

function connectSocket({ port = SOCKET_PORT, room = ROOM, user = 'e2e-feeds' } = {}) {
  const socket = io(`http://${HOST}:${port}/runtime`, {
    auth: { token: SECRET, room, user },
    transports: ['websocket']
  });
  let lastState = null;
  const ledger = [];
  const tracks = [];
  socket.on('arg:state', (data) => {
    lastState = data;
  });
  socket.on('arg:ledger', (data) => ledger.push(data));
  socket.on('arg:track', (data) => tracks.push(data));
  socket.on('ROOM_MESSAGE', (msg) => {
    const entries = Array.isArray(msg) ? msg : [msg];
    for (const entry of entries) {
      if (entry?.event === 'arg:state') lastState = entry.data;
      if (entry?.event === 'arg:ledger') ledger.push(entry.data);
      if (entry?.event === 'arg:track') tracks.push(entry.data);
    }
  });
  return {
    socket,
    getState: () => lastState,
    getLedger: () => ledger,
    getTracks: () => tracks
  };
}

function intent(socket, room, actorId, name, args = {}) {
  socket.emit('ROOM_MESSAGE', {
    event: 'arg:intent',
    room,
    data: { v: 1, from: 'e2e-feeds', ts: Date.now(), actorId, intent: name, ...args }
  });
}

async function walkTo(socket, room, getState, actorId, nodeId, timeoutMs = 30000) {
  intent(socket, room, actorId, 'move', { nodeId });
  await waitFor(() => getState()?.actors?.[actorId]?.nodeId === nodeId, timeoutMs, `${actorId} → ${nodeId}`);
}

console.log('\n🌊 e2e arg-feeds · WP-14\n');

const restoreLineaPorts = applyE2eLineaPorts();

try {
  console.log('── Escenario A: feeds real ──\n');

  const { execSync } = await import('node:child_process');
  execSync('node scripts/seed-aleph-presets.mjs', { cwd: sdkRoot, stdio: 'inherit' });

  mcpHandles.push(await startFirehoseMcp({ port: FIREHOSE_MCP_PORT }));
  mcpHandles.push(...(await startAll()));

  const health = await fetch(`http://${HOST}:${FIREHOSE_MCP_PORT}/mcp/health`);
  gate('G-ARG-FEEDS.0 firehose health', health.ok, `status ${health.status}`);

  startApp('socket', paths.socketServer);
  await waitForHealth(SOCKET_PORT, 'socket-server');

  const { logs: authLogs } = startApp(
    'authority-real',
    paths.deltaAuthority,
    { ZEUS_ARG_FEEDS: 'real', ZEUS_ARG_SEED: '7' }
  );
  await sleep(4000);

  const { socket, getState, getLedger, getTracks } = connectSocket();
  await new Promise((resolve, reject) => {
    socket.on('connect', resolve);
    socket.on('connect_error', reject);
  });
  socket.emit('CLIENT_REGISTER', { usuario: 'e2e-feeds', sesion: 'e2e', type: 'E2E', features: [] });
  socket.emit('CLIENT_SUSCRIBE', { room: ROOM });

  await waitFor(() => getState()?.tick != null, 30000, 'arg:state desde autoridad');

  intent(socket, ROOM, 'uno', 'join');
  intent(socket, ROOM, 'dos', 'join');
  await waitFor(() => getState()?.actors?.uno && getState()?.actors?.dos, 15000, 'join');

  await walkTo(socket, ROOM, getState, 'uno', 'terraza-a');
  await walkTo(socket, ROOM, getState, 'uno', 'cima-a');
  intent(socket, ROOM, 'uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 });
  await waitFor(() => (getState()?.rivers?.['rio-a']?.droplets?.length ?? 0) > 0, 15000, 'gotas reales');

  gate(
    'G-ARG-FEEDS.1 gotas fluyen',
    (getState()?.rivers?.['rio-a']?.droplets?.length ?? 0) > 0,
    `${getState().rivers['rio-a'].droplets.length} gotas`
  );

  gate(
    'G-ARG-FEEDS.2 authority real mode',
    /feeds=real/.test(authLogs.out + authLogs.err),
    'log feeds=real'
  );

  await walkTo(socket, ROOM, getState, 'dos', 'terraza-a');
  await walkTo(socket, ROOM, getState, 'dos', 'embarcadero-a');
  intent(socket, ROOM, 'dos', 'ride', { riverId: 'rio-a' });
  await waitFor(() => getState()?.actors?.dos?.riding, 8000, 'ride');

  const trackDeadline = Date.now() + 20000;
  while (Date.now() < trackDeadline) {
    const hit = getTracks().find((t) => t.actorId === 'dos' && t.ref?.uri?.startsWith('firehose://post/'));
    if (hit) break;
    await sleep(200);
  }
  const realTrack = getTracks().find((t) => t.actorId === 'dos' && t.ref?.uri?.startsWith('firehose://post/'));
  gate(
    'G-ARG-FEEDS.3 URI real en track',
    Boolean(realTrack),
    realTrack?.ref?.uri ?? 'sin track firehose://post/'
  );

  const wp = await connectMcp(14112);
  const registros = toolResultJson(
    await wp.callTool({ name: 'get_registros_for_year', arguments: { year: 1874 } })
  );
  const oldid = registros?.anchor?.oldid ?? registros?.registros?.[0]?.oldid;
  gate('G-ARG-FEEDS.4 fixture oldid', Boolean(oldid), `oldid=${oldid ?? 'none'}`);

  await walkTo(socket, ROOM, getState, 'uno', 'terraza-a');
  await walkTo(socket, ROOM, getState, 'uno', 'plaza');
  await walkTo(socket, ROOM, getState, 'uno', 'orilla-mar');
  await walkTo(socket, ROOM, getState, 'uno', 'cantera-entrada');
  await walkTo(socket, ROOM, getState, 'uno', 'camara-0-2');

  const ledgerBefore = getLedger().length;
  intent(socket, ROOM, 'uno', 'excavate', {
    corridorId: 'pasillo-camara-0-1--camara-0-2',
    approval: resolveMcpApprovalToken()
  });
  await waitFor(() => getLedger().some((e) => e.kind === 'excavate'), 25000, 'ledger excavate');
  gate(
    'G-ARG-FEEDS.5 excavate ledger',
    getLedger().some((e) => e.kind === 'excavate'),
    `ledger +${getLedger().length - ledgerBefore}`
  );

  if (oldid) {
    const cacheProbe = toolResultJson(await wp.callTool({ name: 'cache_wikitext', arguments: { oldid } }));
    gate(
      'G-ARG-FEEDS.6 cache_wikitext invocado',
      cacheProbe.status === 'cached' || cacheProbe.status === 'started' || cacheProbe.skipped === true,
      cacheProbe.status ?? 'unknown'
    );
  } else {
    gate('G-ARG-FEEDS.6 cache_wikitext invocado', false, 'sin oldid');
  }
  await wp.close();
  socket.close();

  for (const child of [...children]) child.kill('SIGTERM');
  children.length = 0;
  await sleep(500);

  console.log('\n── Escenario B: auto degrade ──\n');

  startApp('socket-auto', paths.socketServer, {
    ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT_AUTO),
    ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT_AUTO}`
  });
  await waitForHealth(SOCKET_PORT_AUTO, 'socket-auto');

  const { logs: autoLogs } = startApp(
    'authority-auto',
    paths.deltaAuthority,
    {
      ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT_AUTO),
      ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT_AUTO}`,
      ZEUS_ARG_ROOM: ROOM_AUTO,
      ZEUS_MCP_FIREHOSE: '59991',
      ZEUS_MCP_LINEA_ESPAN: '59992',
      ZEUS_MCP_LINEA_WP: '59993',
      ZEUS_ARG_FEEDS: 'auto'
    }
  );
  await sleep(3500);

  const auto = connectSocket({ port: SOCKET_PORT_AUTO, room: ROOM_AUTO, user: 'e2e-auto' });
  await new Promise((resolve, reject) => {
    auto.socket.on('connect', resolve);
    auto.socket.on('connect_error', reject);
  });
  auto.socket.emit('CLIENT_REGISTER', { usuario: 'e2e-auto', sesion: 'e2e', type: 'E2E', features: [] });
  auto.socket.emit('CLIENT_SUSCRIBE', { room: ROOM_AUTO });

  intent(auto.socket, ROOM_AUTO, 'uno', 'join');
  await waitFor(() => auto.getState()?.actors?.uno, 8000, 'join auto');
  await walkTo(auto.socket, ROOM_AUTO, auto.getState, 'uno', 'terraza-a');
  await walkTo(auto.socket, ROOM_AUTO, auto.getState, 'uno', 'cima-a');
  intent(auto.socket, ROOM_AUTO, 'uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 });
  await waitFor(() => (auto.getState()?.rivers?.['rio-a']?.droplets?.length ?? 0) > 0, 12000, 'gotas sintéticas');

  gate(
    'G-ARG-FEEDS.7 auto degrade log',
    /auto → sintético/i.test(autoLogs.out + autoLogs.err),
    'warning en log'
  );
  gate(
    'G-ARG-FEEDS.8 gotas sintéticas',
    /feeds=synthetic/.test(autoLogs.out + autoLogs.err),
    `${auto.getState()?.rivers?.['rio-a']?.droplets?.length ?? 0} gotas`
  );

  auto.socket.close();
} catch (err) {
  gate('E2E', false, err.message);
  console.error(err);
  for (const child of children) {
    if (child.killed) continue;
    process.stderr.write(`\n--- child logs ---\n`);
  }
} finally {
  restoreLineaPorts();
  for (const child of children) child.kill('SIGTERM');
  await shutdownE2E({ lineaHandles: mcpHandles });
  await sleep(400);
}

console.log(
  failures === 0
    ? '\n🟢 e2e arg-feeds: todos los gates en verde\n'
    : `\n🔴 e2e arg-feeds: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

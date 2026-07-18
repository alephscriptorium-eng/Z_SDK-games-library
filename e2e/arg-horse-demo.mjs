/**
 * E2E WP-11: contacto HORSE real → tools/call tap.set_aperture → arg:state.
 *
 *   G-ARG-E2E.H1  contact:request + HORSE tools/call → apertura en taps
 *   G-ARG-E2E.H2  GET /api/mcp/presets responde con seeds
 *
 * Uso: npm run e2e:arg-horse
 */

import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo

const HOST = 'localhost';
const SOCKET_PORT = 13037;
const CONSOLE_PORT = 13038;
const ROOM = 'ARG_HORSE_E2E';
const SECRET = 'dev-secret';

const children = [];
let failures = 0;
let rpcId = 1;

function startApp(label, appPath, extraEnv = {}) {
  const child = spawn(process.execPath, [appPath], {
    cwd: sdkRoot,
    env: {
      ...process.env,
      ZEUS_HOST: HOST,
      ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT),
      ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT}`,
      ZEUS_SCRIPTORIUM_SECRET: SECRET,
      ZEUS_ARG_ROOM: ROOM,
      ZEUS_ARG_FEEDS: 'synthetic',
      ZEUS_ARG_SEED: '5',
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stderr.on('data', (c) => process.stderr.write(`[${label}!] ${c}`));
  children.push(child);
  return child;
}

function gate(id, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${id}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failures += 1;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error(`timeout esperando HTTP ${url}`);
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const value = fn();
    if (value) return value;
    await sleep(150);
  }
  throw new Error(`timeout esperando: ${label}`);
}

console.log('\n🐴 e2e CAUDAL HORSE · puertos aislados', { SOCKET_PORT, CONSOLE_PORT, ROOM }, '\n');

spawnSync('bash', [join(root, 'scripts/stop-ports.sh'), 'e2e arg-horse cleanup', String(SOCKET_PORT), String(CONSOLE_PORT)], {
  cwd: sdkRoot,
  stdio: 'ignore'
});
await sleep(500);

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.deltaAuthority);
startApp('tap-horse', paths.deltaTapHorse);
startApp('console', paths.deltaConsole, {
  ZEUS_PORT_ARG_CONSOLE: String(CONSOLE_PORT)
});
await waitForHttp(`http://${HOST}:${CONSOLE_PORT}/health`);
await sleep(2500);

const presetsRes = await fetch(`http://${HOST}:${CONSOLE_PORT}/api/mcp/presets`);
const presetsBody = await presetsRes.json();
gate(
  'G-ARG-E2E.H2 REST presets',
  presetsRes.ok && presetsBody.success && presetsBody.totalPresets > 0,
  `${presetsBody.totalPresets ?? 0} presets`
);

const socket = io(`http://${HOST}:${SOCKET_PORT}/runtime`, {
  auth: { token: SECRET, room: ROOM, user: 'e2e-horse' },
  transports: ['websocket']
});

let lastState = null;
const horseOffers = new Map();

socket.on('arg:state', (data) => { lastState = data; });
socket.on('ROOM_MESSAGE', (msg) => {
  const entries = Array.isArray(msg) ? msg : [msg];
  for (const entry of entries) {
    if (entry?.event === 'arg:state') lastState = entry.data;
    if (entry?.event === 'HORSE') {
      const envelope = entry.data?.data ?? entry.data ?? entry;
      if (envelope?.method === 'offer' && envelope.from) {
        horseOffers.set(envelope.from, envelope.params ?? envelope);
      }
      const horseMsg = envelope?.data ?? envelope;
      if (horseMsg?.id != null && (horseMsg.result || horseMsg.error)) {
        horseResponses.set(horseMsg.id, horseMsg);
      }
    }
  }
});

socket.on('HORSE', (raw) => {
  const envelope = raw?.data ?? raw;
  if (envelope?.method === 'offer' && envelope.from) {
    horseOffers.set(envelope.from, envelope.params ?? envelope);
  }
});

const horseResponses = new Map();

socket.on('HORSE', (raw) => {
  const envelope = raw?.data ?? raw;
  const msg = envelope?.data ?? envelope;
  if (msg?.id != null && (msg.result || msg.error)) {
    horseResponses.set(msg.id, msg);
  }
});

await new Promise((resolve, reject) => {
  socket.on('connect', resolve);
  socket.on('connect_error', reject);
});
socket.emit('CLIENT_REGISTER', { usuario: 'e2e-horse', sesion: 'e2e', type: 'E2E', features: [] });
socket.emit('CLIENT_SUSCRIBE', { room: ROOM });

function intent(actorId, name, args = {}) {
  socket.emit('ROOM_MESSAGE', {
    event: 'arg:intent',
    room: ROOM,
    data: { v: 1, from: 'e2e-horse', ts: Date.now(), actorId, intent: name, ...args }
  });
}

async function walkTo(actorId, nodeId, timeoutMs = 30000) {
  intent(actorId, 'move', { nodeId });
  await waitFor(() => lastState?.actors?.[actorId]?.nodeId === nodeId, timeoutMs, `${actorId} → ${nodeId}`);
}

function horseRpc(from, to, method, params) {
  const id = rpcId++;
  socket.emit('ROOM_MESSAGE', {
    event: 'HORSE',
    room: ROOM,
    data: { jsonrpc: '2.0', method, params, id, from, to }
  });
  return waitFor(() => horseResponses.has(id), 8000, `HORSE ${method}`).then(() => horseResponses.get(id));
}

try {
  await waitFor(() => lastState?.gamemapId, 10000, 'primer arg:state');
  intent('uno', 'join');
  await waitFor(() => lastState?.actors?.uno, 8000, 'join');

  await waitFor(() => lastState?.actors?.uno, 8000, 'join');

  const listRes = await horseRpc('jugador-uno', 'grifo-a', 'tools/list', {});
  gate(
    'G-ARG-E2E.H1a oferta grifo',
    !listRes.error && listRes.result?.tools?.some((t) => t.name === 'tap.set_aperture'),
    listRes.error?.message ?? 'tap.set_aperture listado'
  );

  await walkTo('uno', 'terraza-a');
  await walkTo('uno', 'cima-a');
  intent('uno', 'contact:request', { targetId: 'grifo-a' });
  await waitFor(() => {
    const c = lastState?.contacts ?? {};
    return Object.values(c).some((x) => x.state === 'open' && (x.a === 'uno' || x.b === 'uno'));
  }, 5000, 'contacto abierto');

  const before = lastState?.taps?.['grifo-a']?.aperture ?? 0;
  const rpc = await horseRpc('jugador-uno', 'grifo-a', 'tools/call', {
    name: 'tap.set_aperture',
    arguments: { aperture: 0.75 }
  });
  gate('G-ARG-E2E.H1b tools/call', !rpc.error, rpc.error?.message ?? 'ok');
  await waitFor(() => lastState?.taps?.['grifo-a']?.aperture === 0.75, 8000, 'apertura en state');
  gate(
    'G-ARG-E2E.H1c arg:state',
    lastState?.taps?.['grifo-a']?.aperture === 0.75 && before !== 0.75,
    `apertura ${before} → ${lastState?.taps?.['grifo-a']?.aperture}`
  );
} catch (err) {
  gate('E2E HORSE', false, err.message);
}

socket.close();
for (const child of children) child.kill('SIGTERM');
await sleep(400);

console.log(failures === 0 ? '\n🟢 e2e HORSE: todos los gates en verde\n' : `\n🔴 e2e HORSE: ${failures} gate(s) en rojo\n`);
process.exit(failures === 0 ? 0 : 1);

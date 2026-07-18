/**
 * E2E WP-13 + WP-26: arg:track → subscribers server-side de los browsers.
 *
 *   G-ARG-E2E.6  mover actor a camara-0-2 → GET /api/track/focus resuelve
 *                path nodos/{year}/meta.json con hint cache-browser
 *   G-ARG-E2E.7  focus a ref INEXISTENTE → state 'ghost' y NUNCA un ENOENT
 *                crudo (CA WP-26)
 *   G-ARG-E2E.8  ref sintético (firehose://synthetic/...) → state 'synthetic'
 *                en firehose-browser (「sintético」, jamás navegable)
 *
 * Uso: npm run e2e:arg-track
 */

import { spawn, spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';
import { nodoMetaPath } from '@zeus/presets-sdk/paths';
import { resolveTrackRef } from '@zeus/arg-domain';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo

const HOST = 'localhost';
const SOCKET_PORT = 13027;
const CACHE_PORT = 13041;
const FIREHOSE_PORT = 13042;
const ROOM = 'ARG_TRACK_E2E';
const SECRET = 'dev-secret';
const ACTOR = 'uno';
const CHAMBER_YEAR = 1882; // camara-0-2: baseYear 1874 + row 2 * 4

const children = [];
let failures = 0;
let socket = null;

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
  child.stdout.on('data', (c) => process.env.ARG_E2E_VERBOSE && process.stdout.write(`[${label}] ${c}`));
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

async function waitForHttp(url, timeoutMs = 15000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
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

const expectedPath = nodoMetaPath(String(CHAMBER_YEAR));
const expectedRef = { kind: 'nodo', uri: `linea://nodo/${CHAMBER_YEAR}`, index: CHAMBER_YEAR };
const expectedResolved = resolveTrackRef(expectedRef);

console.log('\n🌊 e2e arg:track · puertos aislados', { SOCKET_PORT, CACHE_PORT, ROOM }, '\n');

spawnSync('bash', [join(root, 'scripts/stop-ports.sh'), 'e2e arg-track cleanup', String(SOCKET_PORT), String(CACHE_PORT), String(FIREHOSE_PORT)], {
  cwd: sdkRoot,
  stdio: 'ignore'
});
await sleep(500);

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.deltaAuthority);
startApp('cache', paths.cacheBrowser, {
  ZEUS_PORT_VIEW: String(CACHE_PORT),
  ZEUS_ARG_TRACK_ACTOR: ACTOR,
  ZEUS_ARG_ROOM: ROOM
});
startApp('firehose', paths.firehoseBrowser, {
  ZEUS_PORT_FIREHOSE: String(FIREHOSE_PORT),
  ZEUS_ARG_TRACK_ACTOR: ACTOR,
  ZEUS_ARG_ROOM: ROOM
});
await waitForHttp(`http://${HOST}:${CACHE_PORT}/health`);
await waitForHttp(`http://${HOST}:${FIREHOSE_PORT}/health`);
await sleep(800);

let lastState = null;

try {
  socket = io(`http://${HOST}:${SOCKET_PORT}/runtime`, {
    auth: { token: SECRET, room: ROOM, user: 'e2e-track-driver' },
    transports: ['websocket']
  });

  socket.on('arg:state', (data) => {
    lastState = data;
  });
  socket.on('ROOM_MESSAGE', (msg) => {
    const entries = Array.isArray(msg) ? msg : [msg];
    for (const entry of entries) {
      if (entry?.event === 'arg:state') lastState = entry.data;
    }
  });

  await new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('socket connect timeout')), 12000);
    socket.once('connect', () => {
      clearTimeout(timer);
      resolve();
    });
    socket.once('connect_error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  socket.emit('CLIENT_REGISTER', { usuario: 'e2e-track-driver', sesion: 'e2e', type: 'E2E', features: [] });
  socket.emit('CLIENT_SUSCRIBE', { room: ROOM });
  await waitFor(() => lastState?.gamemapId, 10000, 'primer arg:state');

  function intent(actorId, name, args = {}) {
    socket.emit('ROOM_MESSAGE', {
      event: 'arg:intent',
      room: ROOM,
      data: { v: 1, from: 'e2e-track-driver', ts: Date.now(), actorId, intent: name, ...args }
    });
  }

  async function walkTo(actorId, nodeId, timeoutMs = 30000) {
    intent(actorId, 'move', { nodeId });
    await waitFor(() => lastState?.actors?.[actorId]?.nodeId === nodeId, timeoutMs, `${actorId} → ${nodeId}`);
  }

  intent(ACTOR, 'join');
  await waitFor(() => lastState?.actors?.[ACTOR], 15000, 'join');

  await walkTo(ACTOR, 'orilla-mar');
  await walkTo(ACTOR, 'cantera-entrada');
  await walkTo(ACTOR, 'camara-0-2');

  const focusDeadline = Date.now() + 15000;
  let focus = null;
  while (Date.now() < focusDeadline) {
    const res = await fetch(`http://${HOST}:${CACHE_PORT}/api/track/focus`);
    const data = await res.json();
    if (data?.resolved?.path === expectedPath) {
      focus = data;
      break;
    }
    await sleep(200);
  }
  if (!focus) throw new Error('timeout esperando: focus en cache-browser');

  gate(
    'G-ARG-E2E.6 track→cache-browser',
    focus.ref?.uri === expectedRef.uri &&
      focus.resolved?.path === expectedPath &&
      focus.resolved?.browser === 'cache-browser' &&
      expectedResolved?.path === expectedPath,
    `path=${focus.resolved?.path} uri=${focus.ref?.uri}`
  );

  // WP-26: el focus siempre declara su estado (ok|ghost) — honesto con el disco
  gate(
    'WP-26 focus lleva state',
    typeof focus.state === 'string' && ['ok', 'ghost'].includes(focus.state),
    `state=${focus.state}`
  );

  // ---- G-ARG-E2E.7 (CA WP-26): ref inexistente ⇒ ghost, JAMÁS ENOENT --------
  function fakeTrack(ref, hint) {
    socket.emit('ROOM_MESSAGE', {
      event: 'arg:track',
      room: ROOM,
      data: { v: 1, ts: Date.now(), actorId: ACTOR, zone: 'cantera', ref, hint }
    });
  }

  const ghostUri = 'linea://nodo/9999';
  fakeTrack({ kind: 'nodo', uri: ghostUri, index: 9999 }, 'cache-browser');

  let ghostFocus = null;
  let ghostRaw = '';
  const ghostDeadline = Date.now() + 10000;
  while (Date.now() < ghostDeadline) {
    const res = await fetch(`http://${HOST}:${CACHE_PORT}/api/track/focus`);
    ghostRaw = await res.text();
    const data = JSON.parse(ghostRaw);
    if (data?.ref?.uri === ghostUri) {
      ghostFocus = data;
      break;
    }
    await sleep(200);
  }

  gate(
    'G-ARG-E2E.7 ref inexistente ⇒ state ghost',
    ghostFocus?.state === 'ghost' && ghostFocus?.resolved?.path === 'nodos/9999/meta.json',
    `state=${ghostFocus?.state} path=${ghostFocus?.resolved?.path}`
  );
  gate(
    'G-ARG-E2E.7b cero ENOENT en la respuesta',
    Boolean(ghostFocus) && !ghostRaw.includes('ENOENT'),
    ghostRaw.slice(0, 120)
  );

  // ---- G-ARG-E2E.8 (CA WP-26): ref sintético ⇒ state synthetic --------------
  const syntheticUri = 'firehose://synthetic/5/33#rio';
  fakeTrack({ kind: 'micropost', uri: syntheticUri, corpus: 'synthetic', index: 33 }, 'firehose-browser');

  let synthFocus = null;
  const synthDeadline = Date.now() + 10000;
  while (Date.now() < synthDeadline) {
    const res = await fetch(`http://${HOST}:${FIREHOSE_PORT}/api/track/focus`);
    const data = await res.json();
    if (data?.ref?.uri === syntheticUri) {
      synthFocus = data;
      break;
    }
    await sleep(200);
  }

  gate(
    'G-ARG-E2E.8 ref sintético ⇒ state synthetic (「sintético」 sin navegación)',
    synthFocus?.state === 'synthetic',
    `state=${synthFocus?.state}`
  );
} catch (err) {
  gate('E2E', false, err.message);
}

socket?.close();
for (const child of children) child.kill('SIGTERM');
await sleep(400);

console.log(
  failures === 0
    ? '\n🟢 e2e arg:track: todos los gates en verde\n'
    : `\n🔴 e2e arg:track: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

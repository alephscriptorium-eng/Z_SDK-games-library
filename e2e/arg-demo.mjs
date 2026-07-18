/**
 * E2E CAUDAL (WP-10): levanta socket-server + autoridad + arg-console en
 * puertos aislados y ejercita el bucle real por socket.io crudo:
 *
 *   G-ARG-E2E.1  arg-console sirve /health y las shells de tablero/jugador
 *   G-ARG-E2E.2  join → el actor aparece en arg:state
 *   G-ARG-E2E.3  intent inválida = no-op (tap:set desde la plaza)
 *   G-ARG-E2E.4  cima + tap:set 1 → gotas fluyendo en arg:state
 *   G-ARG-E2E.5  ride + label:cast → arg:ledger kind 'label'
 *
 * Uso: npm run e2e:arg
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { io } from 'socket.io-client';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo

const HOST = 'localhost';
const SOCKET_PORT = 13027;
const CONSOLE_PORT = 13031;
const ROOM = 'ARG_E2E';
const SECRET = 'dev-secret';

const children = [];
let failures = 0;

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

async function fetchText(path) {
  const res = await fetch(`http://${HOST}:${CONSOLE_PORT}${path}`);
  return { status: res.status, text: await res.text() };
}

// ── arranque ────────────────────────────────────────────────────────────
console.log('\n🌊 e2e CAUDAL · puertos aislados', { SOCKET_PORT, CONSOLE_PORT, ROOM }, '\n');

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.deltaAuthority);
startApp('console', paths.deltaConsole, {
  ZEUS_PORT_ARG_CONSOLE: String(CONSOLE_PORT)
});
await waitForHttp(`http://${HOST}:${CONSOLE_PORT}/health`);
await sleep(800);

// ── cliente crudo de room ───────────────────────────────────────────────
const socket = io(`http://${HOST}:${SOCKET_PORT}/runtime`, {
  auth: { token: SECRET, room: ROOM, user: 'e2e-driver' },
  transports: ['websocket']
});

let lastState = null;
const ledger = [];
let lastHorseOffer = null;
const tracks = [];
socket.on('arg:state', (data) => {
  lastState = data;
});
socket.on('arg:ledger', (data) => ledger.push(data));
socket.on('arg:track', (data) => tracks.push(data));
socket.on('HORSE', (data) => {
  if (data?.method === 'offer') lastHorseOffer = data;
});
socket.on('ROOM_MESSAGE', (msg) => {
  const entries = Array.isArray(msg) ? msg : [msg];
  for (const entry of entries) {
    if (entry?.event === 'arg:state') lastState = entry.data;
    if (entry?.event === 'arg:ledger') ledger.push(entry.data);
    if (entry?.event === 'HORSE' && entry.data?.method === 'offer') lastHorseOffer = entry.data;
    if (entry?.event === 'arg:track') tracks.push(entry.data);
  }
});

await new Promise((resolve, reject) => {
  socket.on('connect', resolve);
  socket.on('connect_error', reject);
});
socket.emit('CLIENT_REGISTER', { usuario: 'e2e-driver', sesion: 'e2e', type: 'E2E', features: [] });
socket.emit('CLIENT_SUSCRIBE', { room: ROOM });

function intent(actorId, name, args = {}) {
  socket.emit('ROOM_MESSAGE', {
    event: 'arg:intent',
    room: ROOM,
    data: { v: 1, from: 'e2e-driver', ts: Date.now(), actorId, intent: name, ...args }
  });
}

async function walkTo(actorId, nodeId, timeoutMs = 30000) {
  intent(actorId, 'move', { nodeId });
  await waitFor(() => lastState?.actors?.[actorId]?.nodeId === nodeId, timeoutMs, `${actorId} → ${nodeId}`);
}

async function walkPath(actorId, ...nodeIds) {
  for (const nodeId of nodeIds) {
    await walkTo(actorId, nodeId);
  }
}

try {
  // G1 — superficie HTTP del arg-console
  const health = await fetchText('/health');
  const tablero = await fetchText('/views/tablero');
  const jugador = await fetchText('/views/jugador?actor=uno');
  gate(
    'G-ARG-E2E.1 consola',
    health.status === 200 &&
      health.text.includes('tablero') &&
      tablero.status === 200 &&
      tablero.text.includes('viewer-config') &&
      jugador.status === 200 &&
      jugador.text.includes('"actor":"uno"'),
    `health ${health.status}, shells ok`
  );

  // G2 — join
  intent('uno', 'join');
  intent('dos', 'join');
  await waitFor(() => lastState?.actors?.uno && lastState?.actors?.dos, 8000, 'join en arg:state');
  gate('G-ARG-E2E.2 join', lastState.actors.uno.nodeId === 'plaza', `uno en ${lastState.actors.uno.nodeId}`);

  // G3 — intent inválida es no-op
  intent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 });
  await sleep(600);
  gate('G-ARG-E2E.3 no-op', lastState.taps['grifo-a'].aperture === 0, 'grifo sigue cerrado desde la plaza');

  // G4 — subir a la cima, abrir contacto y operar el grifo
  await walkTo('uno', 'terraza-a');
  await walkTo('uno', 'cima-a');
  intent('uno', 'contact:request', { targetId: 'grifo-a' });
  await waitFor(() => {
    const c = lastState?.contacts ?? {};
    return Object.values(c).some((x) => x.state === 'open');
  }, 5000, 'contacto grifo-a');
  intent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 });
  await waitFor(() => lastState?.taps?.['grifo-a']?.aperture === 1, 5000, 'apertura');
  await waitFor(() => (lastState?.rivers?.['rio-a']?.droplets?.length ?? 0) > 0, 8000, 'gotas');
  gate('G-ARG-E2E.4 riada', true, `${lastState.rivers['rio-a'].droplets.length} gotas en rio-a`);

  // G6 — cloak:equip reflejado en arg:state
  intent('uno', 'cloak:equip', { presetId: 'aleph-tronco-puro', label: 'tronco' });
  await waitFor(
    () => lastState?.actors?.uno?.cloak?.presetId === 'aleph-tronco-puro',
    5000,
    'cloak equipado'
  );
  gate(
    'G-ARG-E2E.6 cloak',
    lastState.actors.uno.cloak?.presetId === 'aleph-tronco-puro',
    lastState.actors.uno.cloak?.label ?? '—'
  );

  // G5 — dos monta el río y etiqueta la primera gota que pise
  await walkTo('dos', 'terraza-a');
  await walkTo('dos', 'embarcadero-a');
  intent('dos', 'ride', { riverId: 'rio-a' });
  await waitFor(() => lastState?.actors?.dos?.riding, 5000, 'ride');
  const labelDeadline = Date.now() + 30000;
  while (Date.now() < labelDeadline && !ledger.some((e) => e.kind === 'label')) {
    intent('dos', 'label:cast', { label: 'agora' });
    await sleep(300);
    if (!lastState?.actors?.dos?.riding) break;
  }
  gate(
    'G-ARG-E2E.5 etiqueta',
    ledger.some((e) => e.kind === 'label'),
    `ledger: ${ledger.map((e) => e.kind).join(', ') || 'vacío'}`
  );

  const presetsRes = await fetch(`http://${HOST}:${CONSOLE_PORT}/api/mcp/presets`);
  gate(
    'G-ARG-E2E.6b presets API',
    presetsRes.ok && (await presetsRes.json()).presets?.some((p) => p.name === 'aleph-firehose-browse'),
    `HTTP ${presetsRes.status}`
  );

  // G-ARG-E2E.9 — salvage: gota hundida → flotante + ledger detail.salvage
  await waitFor(() => lastState?.sea?.droplets?.some((d) => !d[1]), 35000, 'gota hundida en mar');
  const sunkenTuple = lastState.sea.droplets.find((d) => !d[1]);
  const sunkenId = sunkenTuple[0];
  // Cerrar grifo para congelar murk mientras uno camina al mar
  intent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 0 });
  await waitFor(() => lastState?.taps?.['grifo-a']?.aperture === 0, 5000, 'grifo cerrado');
  await walkPath('uno', 'terraza-a', 'plaza', 'orilla-mar');
  const murkBefore = lastState.sea.murk;
  const crystalsBefore = lastState.sea.crystals;
  intent('uno', 'salvage', { dropletId: sunkenId, label: 'memoria' });
  await waitFor(() => ledger.some((e) => e.detail?.salvage === true), 8000, 'ledger salvage');
  await waitFor(
    () => lastState?.sea?.droplets?.some((d) => d[0] === sunkenId && d[1] === 'memoria'),
    8000,
    'gota flotante'
  );
  gate(
    'G-ARG-E2E.9 salvage',
    ledger.some((e) => e.kind === 'label' && e.detail?.salvage === true) &&
      lastState.sea.droplets.some((d) => d[0] === sunkenId && d[1] === 'memoria') &&
      lastState.sea.murk <= murkBefore - 0.99 &&
      lastState.sea.crystals >= crystalsBefore + 1,
    `murk ${murkBefore}→${lastState.sea.murk}, crystals ${crystalsBefore}→${lastState.sea.crystals}`
  );

  // track:cast — arg:track firehose-browser sin mutar contadores
  const trackId = lastState.sea.droplets[0]?.[0];
  const crystalsSnap = lastState.sea.crystals;
  const murkSnap = lastState.sea.murk;
  if (trackId) {
    intent('uno', 'track:cast', { dropletId: trackId });
    await waitFor(
      () => tracks.some((t) => t.actorId === 'uno' && t.hint === 'firehose-browser'),
      8000,
      'arg:track'
    );
    gate(
      'G-ARG-E2E.10 track:cast',
      tracks.some((t) => t.actorId === 'uno' && t.hint === 'firehose-browser') &&
        lastState.sea.crystals === crystalsSnap &&
        lastState.sea.murk === murkSnap,
      tracks.find((t) => t.actorId === 'uno')?.ref?.uri ?? '—'
    );
  } else {
    gate('G-ARG-E2E.10 track:cast', false, 'sin gotas en mar');
  }
} catch (err) {
  gate('E2E', false, err.message);
}

socket.close();
for (const child of children) child.kill('SIGTERM');
await sleep(400);

console.log(failures === 0 ? '\n🟢 e2e CAUDAL: todos los gates en verde\n' : `\n🔴 e2e CAUDAL: ${failures} gate(s) en rojo\n`);
process.exit(failures === 0 ? 0 : 1);

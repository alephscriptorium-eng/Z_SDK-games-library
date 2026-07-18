/**
 * E2E arg-player-mcp: levanta socket-server + autoridad + 2 servidores MCP
 * de jugador (uno/dos) en puertos aislados y valida el juego vía JSON-RPC
 * HTTP crudo (POST /mcp: initialize + tools/call).
 *
 *   G-MCP.1  health de ambos + tools/list contiene player_move
 *   G-MCP.2  C-01: player_join(uno) ⇒ evidencia actor en estado (plaza)
 *   G-MCP.3  C-03: player_goto cima-a ⇒ nodeId final correcto
 *   G-MCP.4  C-04b: player_tap_set sin contacto ⇒ ok:false sin_contacto
 *   G-MCP.5  C-04+C-05: player_contact + player_tap_set 0.75 ⇒ apertura en estado
 *   G-MCP.6  MCP de dos: join+goto embarcadero+ride+label ⇒ ledger label
 *   G-MCP.7  C-17 salvage
 *   G-MCP.8  C-18 track
 *   G-MCP.9  C-33 empty (vaciado) ⇒ ledger empty + score.emptied
 *
 * Uso: npm run e2e:arg-mcp
 */

import { spawn } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo

const HOST = 'localhost';
const SOCKET_PORT = 13027;
const MCP_UNO_PORT = 14121;
const MCP_DOS_PORT = 14122;
const ROOM = 'ARG_MCP_E2E';
const SECRET = 'dev-secret';

const children = [];
let failures = 0;
let rpcSeq = 1;

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
      ZEUS_MCP_ARG_UNO: String(MCP_UNO_PORT),
      ZEUS_MCP_ARG_DOS: String(MCP_DOS_PORT),
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

/** Espera health con `connected: true` (bridge unido a la room) — sin carreras. */
async function waitForHealthConnected(port, timeoutMs = 25000) {
  const start = Date.now();
  let last = null;
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(`http://${HOST}:${port}/mcp/health`);
      if (res.ok) {
        last = await res.json();
        if (last.connected === true) return last;
      }
    } catch {
      /* retry */
    }
    await sleep(250);
  }
  throw new Error(`timeout esperando health connected en :${port} (último: ${JSON.stringify(last)})`);
}

// ── cliente JSON-RPC HTTP crudo ─────────────────────────────────────────
async function rpc(port, method, params = {}) {
  const res = await fetch(`http://${HOST}:${port}/mcp`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({ jsonrpc: '2.0', id: rpcSeq++, method, params })
  });
  const body = await res.json();
  if (body.error) throw new Error(`${method} → ${body.error.message}`);
  return body.result;
}

function initialize(port) {
  return rpc(port, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'e2e-arg-mcp', version: '0.1.0' }
  });
}

/** tools/call que devuelve el payload JSON { ok, error?, evidencia } del wrapper. */
async function callTool(port, name, args = {}) {
  const result = await rpc(port, 'tools/call', { name, arguments: args });
  return JSON.parse(result.content[0].text);
}

// ── arranque ────────────────────────────────────────────────────────────
console.log('\n🎮 e2e CAUDAL MCP · puertos aislados', { SOCKET_PORT, MCP_UNO_PORT, MCP_DOS_PORT, ROOM }, '\n');

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.deltaAuthority);
startApp('mcp-uno', paths.deltaPlayerMcp, {
  ZEUS_ARG_PLAYER_ACTOR: 'uno'
});
startApp('mcp-dos', paths.deltaPlayerMcp, {
  ZEUS_ARG_PLAYER_ACTOR: 'dos'
});

try {
  // G-MCP.1 — health + tools/list
  const healthUno = await waitForHealthConnected(MCP_UNO_PORT);
  const healthDos = await waitForHealthConnected(MCP_DOS_PORT);
  await initialize(MCP_UNO_PORT);
  await initialize(MCP_DOS_PORT);
  const toolsUno = await rpc(MCP_UNO_PORT, 'tools/list', {});
  const toolNames = toolsUno.tools.map((t) => t.name);
  gate(
    'G-MCP.1 health+tools',
    healthUno.status === 'ok' &&
      healthUno.actor === 'uno' &&
      healthDos.actor === 'dos' &&
      toolNames.includes('player_move') &&
      toolNames.includes('player_goto') &&
      toolNames.includes('player_label') &&
      toolNames.includes('player_salvage') &&
      toolNames.includes('player_track') &&
      toolNames.includes('player_empty'),
    `uno/dos connected · ${toolNames.filter((n) => n.startsWith('player_')).length} tools player_*`
  );

  // G-MCP.2 — C-01: join
  const join1 = await callTool(MCP_UNO_PORT, 'player_join', {});
  gate(
    'G-MCP.2 join (C-01)',
    join1.ok === true && join1.evidencia?.actor?.nodeId === 'plaza',
    `uno en ${join1.evidencia?.actor?.nodeId ?? '—'} (${join1.error ?? 'ok'})`
  );

  // G-MCP.3 — C-03: goto multi-salto
  const goto1 = await callTool(MCP_UNO_PORT, 'player_goto', { nodeId: 'cima-a' });
  gate(
    'G-MCP.3 goto (C-03)',
    goto1.ok === true && goto1.evidencia?.actor?.nodeId === 'cima-a',
    `ruta ${JSON.stringify(goto1.evidencia?.ruta ?? [])} → ${goto1.evidencia?.actor?.nodeId ?? goto1.error}`
  );

  // G-MCP.4 — C-04b: tap_set SIN contacto ⇒ rechazado
  const tapNoContact = await callTool(MCP_UNO_PORT, 'player_tap_set', {
    tapId: 'grifo-a',
    aperture: 0.75
  });
  gate(
    'G-MCP.4 tap sin contacto (C-04b)',
    tapNoContact.ok === false && tapNoContact.error === 'sin_contacto',
    `error=${tapNoContact.error ?? '—'}`
  );

  // G-MCP.5 — C-04 + C-05: contacto + apertura
  const contact = await callTool(MCP_UNO_PORT, 'player_contact', { targetId: 'grifo-a' });
  const tapSet = await callTool(MCP_UNO_PORT, 'player_tap_set', { tapId: 'grifo-a', aperture: 0.75 });
  gate(
    'G-MCP.5 contacto+tap (C-04/C-05)',
    contact.ok === true &&
      contact.evidencia?.contacto?.state === 'open' &&
      tapSet.ok === true &&
      tapSet.evidencia?.grifo?.aperture === 0.75,
    `contacto ${contact.evidencia?.contactId ?? contact.error} · apertura ${tapSet.evidencia?.grifo?.aperture ?? tapSet.error}`
  );

  // G-MCP.6 — con el MCP de dos: join + goto embarcadero + ride + label
  const join2 = await callTool(MCP_DOS_PORT, 'player_join', {});
  const goto2 = await callTool(MCP_DOS_PORT, 'player_goto', { nodeId: 'embarcadero-a' });
  const ride = await callTool(MCP_DOS_PORT, 'player_ride', { riverId: 'rio-a' });
  const label = await callTool(MCP_DOS_PORT, 'player_label', { label: 'agora', tries: 40 });
  gate(
    'G-MCP.6 ride+label (C-07/C-08)',
    join2.ok === true &&
      goto2.ok === true &&
      ride.ok === true &&
      label.ok === true &&
      label.evidencia?.ledger?.kind === 'label' &&
      label.evidencia?.ledger?.actorId === 'dos',
    label.ok
      ? `ledger label seq ${label.evidencia.ledger.seq} · intentos ${label.evidencia.intentos}`
      : `join=${join2.error ?? 'ok'} goto=${goto2.error ?? 'ok'} ride=${ride.error ?? 'ok'} label=${label.error ?? 'ok'}`
  );

  // G-MCP.7 — C-17: player_salvage (mar con grifo abierto desde G-MCP.5)
  await sleep(25000);
  const seaObs = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'sea' });
  const sunken = seaObs.data?.droplets?.find((d) => d.label == null);
  await callTool(MCP_UNO_PORT, 'player_tap_set', { tapId: 'grifo-a', aperture: 0 });
  const cloak = await callTool(MCP_UNO_PORT, 'player_cloak_equip', { presetId: 'aleph-firehose-browse' });
  const gotoSea = await callTool(MCP_UNO_PORT, 'player_goto', { nodeId: 'boya-1' });
  const seaPre = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'sea' });
  const murk0 = seaPre.data?.murk;
  const crystals0 = seaPre.data?.crystals ?? 0;
  const salvage =
    sunken?.dropletId &&
    (await callTool(MCP_UNO_PORT, 'player_salvage', { dropletId: sunken.dropletId, label: 'memoria' }));
  const seaAfter = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'sea' });
  gate(
    'G-MCP.7 salvage (C-17)',
    gotoSea.ok === true &&
      cloak.ok === true &&
      salvage?.ok === true &&
      salvage.evidencia?.ledger?.detail?.salvage === true &&
      seaAfter.data?.droplets?.some((d) => d.dropletId === sunken?.dropletId && d.label === 'memoria') &&
      seaAfter.data?.murk <= murk0 - 0.99 &&
      seaAfter.data?.crystals >= crystals0 + 1,
    salvage?.ok
      ? `droplet ${sunken.dropletId} · murk ${murk0}→${seaAfter.data?.murk}`
      : `sin gota hundida o error ${salvage?.error ?? gotoSea.error}`
  );

  // G-MCP.8 — C-18: player_track
  const trackTarget = seaAfter.data?.droplets?.[0]?.dropletId ?? sunken?.dropletId;
  const track = trackTarget
    ? await callTool(MCP_UNO_PORT, 'player_track', { dropletId: trackTarget })
    : { ok: false };
  const tracksObs = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'tracks', n: 5 });
  gate(
    'G-MCP.8 track (C-18)',
    track.ok === true &&
      track.evidencia?.track?.hint === 'firehose-browser' &&
      tracksObs.data?.some?.((t) => t.actorId === 'uno' && t.hint === 'firehose-browser'),
    track.ok ? track.evidencia.track.ref?.uri ?? 'ok' : track.error ?? 'sin gota'
  );

  // G-MCP.9 — C-33: player_empty sobre hundidas ya presentes (sin más vertido:
  // reabrir el grifo tras murk~28 colapsa la ronda en e2e).
  const seaPreEmpty = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'sea' });
  const sunkenCount = (seaPreEmpty.data?.droplets || []).filter((d) => d.label == null).length;
  const murkPre = seaPreEmpty.data?.murk ?? 0;
  const collapsed = seaPreEmpty.data?.collapsed === true;
  const gotoOrilla = await callTool(MCP_UNO_PORT, 'player_goto', { nodeId: 'orilla-mar' });
  const emptyRes = await callTool(MCP_UNO_PORT, 'player_empty', {});
  const seaPostEmpty = await callTool(MCP_UNO_PORT, 'player_observe', { what: 'sea' });
  const emptyAgain = await callTool(MCP_UNO_PORT, 'player_empty', {});
  gate(
    'G-MCP.9 empty (C-33)',
    !collapsed &&
      gotoOrilla.ok === true &&
      sunkenCount >= 1 &&
      emptyRes.ok === true &&
      emptyRes.evidencia?.ledger?.kind === 'empty' &&
      emptyRes.evidencia?.ledger?.detail?.opsIntent === 'empty_playable' &&
      (emptyRes.evidencia?.score?.emptied ?? 0) >= 1 &&
      (seaPostEmpty.data?.murk ?? murkPre) < murkPre,
    emptyRes.ok
      ? `removed=${emptyRes.evidencia?.ledger?.detail?.removed} · murk ${murkPre}→${seaPostEmpty.data?.murk} · again=${emptyAgain.error ?? emptyAgain.ok}`
      : `collapsed=${collapsed} sunken=${sunkenCount} · err=${emptyRes.error ?? gotoOrilla.error}`
  );
} catch (err) {
  gate('E2E MCP', false, err.message);
}

for (const child of children) child.kill('SIGTERM');
await sleep(500);

console.log(
  failures === 0
    ? '\n🟢 e2e CAUDAL MCP: todos los gates en verde\n'
    : `\n🔴 e2e CAUDAL MCP: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

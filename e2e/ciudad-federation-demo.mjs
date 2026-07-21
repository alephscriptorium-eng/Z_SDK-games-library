/**
 * E2E vivo Z04: socket zeus + authority ciudad + mock CP + peer + barrio-horse.
 * Puertos aislados. Sin servicios aleph.
 *
 *   npm run e2e:ciudad-federation
 *
 * Env ZEUS_* must be set BEFORE importing @zeus/rooms consumers (config freezes
 * at import-time). Static imports would bind to default :3017.
 *
 * Si A1/npm-ci o socket fallan → documentar defer; el smoke in-process cubre CA local.
 */

const HOST = 'localhost';
const SOCKET_PORT = 13057;
const CP_PORT = 14057;
const ROOM = 'CIUDAD_FED_E2E';
const SECRET = 'dev-secret';
const ACTOR = 'ext-rabbit';
const HORSE_ID = 'barrio-horse';

process.env.ZEUS_HOST = HOST;
process.env.ZEUS_PORT_SCRIPTORIUM = String(SOCKET_PORT);
process.env.ZEUS_SCRIPTORIUM_URL = `http://${HOST}:${SOCKET_PORT}`;
process.env.ZEUS_SCRIPTORIUM_SECRET = SECRET;
process.env.ZEUS_CIUDAD_ROOM = ROOM;

const { spawn } = await import('node:child_process');
const { libraryRoot as root, paths } = await import('./roots.mjs');
const { createMockControlPlane } = await import(
  '../packages/ciudad/fixtures/federation/mock-control-plane.mjs'
);
const { createFederationPeer } = await import(
  '../packages/ciudad/fixtures/federation/peer-external.mjs'
);
const { startBarrioHorse } = await import(
  '../packages/ciudad/fixtures/federation/barrio-horse.mjs'
);

const children = [];
let failures = 0;

function startApp(label, appPath, extraEnv = {}) {
  const child = spawn(process.execPath, [appPath], {
    cwd: root,
    env: {
      ...process.env,
      ZEUS_HOST: HOST,
      ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT),
      ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT}`,
      ZEUS_SCRIPTORIUM_SECRET: SECRET,
      ZEUS_CIUDAD_ROOM: ROOM,
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

async function waitForHttp(url, timeoutMs = 25000) {
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
  throw new Error(`timeout HTTP ${url}`);
}

console.log('\n🏙 e2e ciudad federación r/s/h ·', { SOCKET_PORT, CP_PORT, ROOM }, '\n');

const plane = createMockControlPlane({ port: CP_PORT, host: HOST });
let planeUrl;
try {
  ({ url: planeUrl } = await plane.listen());
} catch (err) {
  gate('G-FED.0 mock CP listen', false, err.message);
  process.exit(1);
}
gate('G-FED.0 mock CP', true, planeUrl);

let horse = null;
let peer = null;

try {
  startApp('socket', paths.socketServer);
  await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
  gate('G-FED.1 socket', true, `:${SOCKET_PORT}`);

  startApp('authority', paths.ciudadAuthority);
  await sleep(3000);

  horse = await startBarrioHorse({ horseId: HORSE_ID, room: ROOM });
  peer = createFederationPeer({
    actor: ACTOR,
    room: ROOM,
    controlPlane: plane.client(planeUrl)
  });

  await peer.registerBots();
  await peer.connect();
  await sleep(500);

  const ann = await peer.announcePresence('e2e federación');
  gate('G-FED.2 announce plaza', Boolean(ann?.actorId === ACTOR), ann?.message ?? '');

  // sin RNFP → distrito bloqueado
  const blocked = await peer.enterDistrict();
  gate(
    'G-FED.3 RNFP gate',
    blocked.ok === false && blocked.error === 'rnfp_inactive_distrito_bloqueado',
    blocked.error ?? 'unexpected pass'
  );

  await peer.federateRnfp('rnfp.distrito');
  const district = await peer.enterDistrict();
  gate('G-FED.4 distrito', district.ok === true, district.actor?.anchorId ?? district.error);

  const wake = await peer.horseWake({
    horsePeerId: HORSE_ID,
    tool: 'barrio.ping',
    barrioId: 'blockly-editor'
  });
  gate(
    'G-FED.5 horse wake',
    wake.ok &&
      wake.barrio?.estado === 'vivo' &&
      wake.wake?.horseMode === 'horse',
    wake.ok
      ? `${wake.barrio.estado}/${wake.wake.horseMode}`
      : wake.error
  );

  const snap = peer.lastState();
  gate(
    'G-FED.6 snapshot peer (contrato)',
    snap?.barrios?.['blockly-editor']?.estado === 'vivo' &&
      snap?.actors?.[ACTOR]?.announced === true,
    'state vía rooms — sin tocar dominio authority'
  );

  const reg = await plane.client(planeUrl).actorRegistry();
  gate(
    'G-FED.7 actor-registry',
    reg.data.peers?.some((p) => p.rnfp === 'active'),
    `${reg.data.peers?.length ?? 0} peers`
  );
} catch (err) {
  gate('G-FED e2e', false, err.message);
}

if (peer) peer.close();
if (horse) horse.close();
await plane.close();
for (const child of children) {
  try {
    child.kill('SIGTERM');
  } catch {
    /* ignore */
  }
}
await sleep(400);

console.log(
  failures === 0
    ? '\n🟢 e2e federación: gates en verde\n'
    : `\n🔴 e2e federación: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

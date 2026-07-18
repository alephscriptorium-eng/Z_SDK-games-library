/**
 * @zeus/arg-console server smoke — health + portal + vistas + rutas de
 * estáticos vendorizados (incluido /arg-domain, el dominio crudo browser-safe).
 */

import test from 'node:test';
import assert from 'node:assert/strict';

const { createArgConsoleServer } = await import('../src/server.mjs');

import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let threeAvailable = true;
try {
  require.resolve('three');
} catch {
  threeAvailable = false;
}

function includesJson(html, key, value) {
  return (
    html.includes(`&quot;${key}&quot;:&quot;${value}&quot;`) ||
    html.includes(`"${key}":"${value}"`)
  );
}

test('GET /health → 200 ok con las vistas registradas', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/health`);
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.status, 'ok');
  assert.equal(body.service, 'arg-console');
  assert.deepEqual(body.views, ['tablero', 'jugador']);
});

test('GET / → 200 portal con una tarjeta por vista', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/`);
  assert.equal(res.status, 200);
  const html = await res.text();
  assert.match(html, /portal-grid/);
  assert.match(html, /href="\/views\/tablero"/);
  assert.match(html, /href="\/views\/jugador"/);
});

for (const [id, entry] of [
  ['tablero', 'tablero.mjs'],
  ['jugador', 'jugador.mjs']
]) {
  test(`GET /views/${id} → 200 shell con import map + viewer-config + entry`, async (t) => {
    const handle = await createArgConsoleServer({ port: 0 });
    t.after(() => handle.close());
    const { port } = handle;

    const res = await fetch(`http://localhost:${port}/views/${id}`);
    assert.equal(res.status, 200);
    const html = await res.text();
    assert.match(html, /type="importmap"/);
    assert.match(html, /id="viewer-config"/);
    assert.ok(html.includes(`/assets/js/views/${entry}`), `vista ${id} sin entry ${entry}`);
    assert.ok(includesJson(html, 'view', id), `vista ${id} sin id en el config inyectado`);
    // el import map debe mapear el dominio crudo
    assert.ok(
      html.includes('/arg-domain/index.mjs') &&
        html.includes('/arg-domain/scenes/delta-v0.mjs') &&
        html.includes('/protocol/index.mjs'),
      `vista ${id} sin @zeus/arg-domain/@zeus/protocol en el import map`
    );
  });
}

test('GET /views/jugador?actor=uno → actor en el viewer-config inyectado', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const html = await (await fetch(`http://localhost:${port}/views/jugador?actor=uno`)).text();
  assert.ok(includesJson(html, 'actor', 'uno'), 'falta actor "uno" en el config');

  // sin query, actor viaja null (la vista cae a su default)
  const sinActor = await (await fetch(`http://localhost:${port}/views/jugador`)).text();
  assert.ok(
    sinActor.includes('&quot;actor&quot;:null') || sinActor.includes('"actor":null'),
    'sin ?actor= el config debe llevar actor:null'
  );
});

test('resolución de room: default ARG_DELTA < ZEUS_ARG_ROOM < ?room=', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const priorEnv = process.env.ZEUS_ARG_ROOM;
  t.after(() => {
    if (priorEnv === undefined) delete process.env.ZEUS_ARG_ROOM;
    else process.env.ZEUS_ARG_ROOM = priorEnv;
  });

  delete process.env.ZEUS_ARG_ROOM;
  const byDefault = await (await fetch(`http://localhost:${port}/views/tablero`)).text();
  assert.ok(byDefault.includes('ARG_DELTA'), 'sin env, la room es la del contrato (ARG_DELTA)');

  process.env.ZEUS_ARG_ROOM = 'arg.env-room';
  const byEnv = await (await fetch(`http://localhost:${port}/views/tablero`)).text();
  assert.ok(byEnv.includes('arg.env-room'), 'ZEUS_ARG_ROOM debe ganar al default');

  const overridden = await (await fetch(`http://localhost:${port}/views/tablero?room=custom.room`)).text();
  assert.ok(overridden.includes('custom.room'), '?room= debe ganar a todo');
});

test('GET /views/nada → 404', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/views/nada`);
  assert.equal(res.status, 404);
});

test('el tablero renderiza el panel DOM del ledger', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/views/tablero`);
  const html = await res.text();
  assert.match(html, /id="view-log"/);
});

test('GET /protocol/index.mjs → 200 (contrato único servido)', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/protocol/index.mjs`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /makeIntent|PROTOCOL_VERSION/);
});

test('GET /arg-domain/contract.mjs → 200 (dominio crudo servido)', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/arg-domain/contract.mjs`);
  assert.equal(res.status, 200);
  const body = await res.text();
  assert.match(body, /ARG_DELTA/);
});

test('GET /kit/index.mjs, /view-kit/index.mjs y /vendor/socket.io → 200', async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const kit = await fetch(`http://localhost:${port}/kit/index.mjs`);
  assert.equal(kit.status, 200);
  const viewKit = await fetch(`http://localhost:${port}/view-kit/index.mjs`);
  assert.equal(viewKit.status, 200);
  const io = await fetch(`http://localhost:${port}/vendor/socket.io/socket.io.esm.min.js`);
  assert.equal(io.status, 200);
});

test('GET /vendor/three/build/three.module.js → 200', { skip: threeAvailable ? false : 'three no instalado (npm install)' }, async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const res = await fetch(`http://localhost:${port}/vendor/three/build/three.module.js`);
  assert.equal(res.status, 200);
});

// Guardia de la cadena de imports del navegador (clase R2 del 3d-monitor):
// todo lo que el shell/import map referencia debe responder 200.
test('sirve toda la cadena de imports del navegador (sin 404s)', { skip: threeAvailable ? false : 'three no instalado (npm install)' }, async (t) => {
  const handle = await createArgConsoleServer({ port: 0 });
  t.after(() => handle.close());
  const { port } = handle;

  const routes = [
    '/view-kit/index.mjs',
    '/view-kit/scene.mjs',
    '/view-kit/hud.mjs',
    '/view-kit/room.mjs',
    '/view-kit/channel-events.mjs',
    '/view-kit/labels.mjs',
    '/view-kit/log-panel.mjs',
    '/view-kit/stick-poses.mjs',
    '/view-kit/stick-puppet.mjs',
    '/view-kit/actors-layer.mjs',
    '/view-kit/horse-client.mjs',
    '/view-kit/contact-render.mjs',
    '/view-kit/cloak-panel.mjs',
    '/view-kit/panel.mjs',
    '/assets/js/delta/index.mjs',
    '/assets/js/delta/delta-stage.mjs',
    '/assets/js/delta/river-droplets.mjs',
    '/assets/js/delta/intent-client.mjs',
    '/assets/js/delta/inspector.mjs',
    '/assets/js/delta/inspector-render.mjs',
    '/assets/js/views/tablero.mjs',
    '/assets/js/views/jugador.mjs',
    '/assets/css/viewer.css',
    '/assets/room-client/room-client.browser.mjs',
    '/assets/room-client/dev-room-config.mjs',
    '/arg-domain/index.mjs',
    '/arg-domain/contract.mjs',
    '/arg-domain/scenes/delta-v0.mjs',
    '/protocol/index.mjs',
    '/protocol/contract.mjs',
    '/game-engine/index.mjs',
    '/kit/core/scene-manager.mjs',
    '/models/SK_Alephillo.glb',
    '/vendor/three/examples/jsm/loaders/GLTFLoader.js',
    '/vendor/three/examples/jsm/controls/OrbitControls.js'
  ];

  for (const path of routes) {
    const res = await fetch(`http://localhost:${port}${path}`);
    assert.equal(res.status, 200, `esperaba 200 para ${path}, llegó ${res.status}`);
  }
});

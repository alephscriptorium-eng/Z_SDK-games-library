import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { loadStartPack, toMapScene, validateArbol } from '../index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);

test('loadStartPack: ciudad gamemap + 24 barrios + 6 zones + arbol', () => {
  const pack = loadStartPack({ root: ROOT });
  assert.equal(pack.game, 'ciudad');
  assert.equal(pack.packageName, '@zeus/startpack-ciudad');
  assert.equal(pack.manifest.schema, 'zeus.startpack/v0');
  assert.equal(pack.gamemap.id, 'ciudad-demo');
  assert.equal(pack.gamemap.sceneId, 'ciudad-v0');
  assert.notEqual(pack.gamemap.id, 'plaza-demo');
  assert.ok(Array.isArray(pack.zones) && pack.zones.length === 6);
  assert.equal(Object.keys(pack.gamemap.anclas).length, 24);
  assert.equal(Object.keys(pack.arbol.barrios).length, 24);
  assert.ok(pack.arbolValid);
  assert.ok(existsSync(join(pack.volumesRoot, 'volumes.json')));
  assert.equal(pack.env.ZEUS_CIUDAD_SCENE_ID, 'ciudad-v0');
});

test('barrio anchors carry estado enum', () => {
  const pack = loadStartPack({ root: ROOT });
  const allowed = new Set(['vivo', 'latente', 'muerto', 'roto']);
  for (const a of Object.values(pack.gamemap.anclas)) {
    assert.ok(allowed.has(a.estado), `${a.id} estado=${a.estado}`);
    assert.equal(a.kind, 'gamething.barrio');
  }
});

test('validateArbol accepts seed catalog', () => {
  const pack = loadStartPack({ root: ROOT });
  const r = validateArbol(pack.arbol);
  assert.equal(r.ok, true, r.errors.join('; '));
});

test('arbol.schema.json is present and draft-shaped', () => {
  const schemaPath = join(ROOT, 'schemas', 'arbol.schema.json');
  assert.ok(existsSync(schemaPath));
  const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
  assert.equal(schema.$id, 'zeus.startpack-ciudad.arbol/v0');
  assert.ok(schema.properties.barrios);
});

test('no id collision with startpack-plaza gamemap', () => {
  const plazaMap = join(ROOT, '..', 'startpack-plaza', 'seeds', 'gamemap.json');
  assert.ok(existsSync(plazaMap), 'plaza sibling expected in monorepo');
  const plaza = JSON.parse(readFileSync(plazaMap, 'utf8'));
  const pack = loadStartPack({ root: ROOT });
  assert.notEqual(pack.gamemap.id, plaza.id);
  assert.notEqual(pack.manifest.game, 'plaza');
  assert.notEqual(pack.manifest.id, 'startpack-plaza');
});

/**
 * Resolve @zeus/game-engine for eje I without hardcoding framework repo names
 * in the published package (only in this test runner).
 */
async function importGameEngine() {
  try {
    return await import('@zeus/game-engine');
  } catch {
    // fall through
  }

  const candidates = [];
  if (process.env.ZEUS_SDK_ROOT) {
    candidates.push(join(process.env.ZEUS_SDK_ROOT, 'packages/engine/game-engine/src/index.mjs'));
  }
  try {
    const { resolveZeusSdkRoot } = require(
      join(ROOT, '..', '..', 'scripts', 'zeus-sdk-root.cjs')
    );
    const sdk = resolveZeusSdkRoot();
    candidates.push(join(sdk, 'packages/engine/game-engine/src/index.mjs'));
  } catch {
    // optional
  }
  candidates.push(
    join(ROOT, '..', '..', '.deps', 'zeus-sdk', 'packages/engine/game-engine/src/index.mjs')
  );

  for (const p of candidates) {
    if (existsSync(p)) {
      return import(pathToFileURL(p).href);
    }
  }
  throw new Error(
    '⏳ @zeus/game-engine not resolvable — set ZEUS_SDK_ROOT or run npm run setup:zeus-sdk'
  );
}

test('eje I: createMapEngine loads ciudad scene without error', async () => {
  const pack = loadStartPack({ root: ROOT });
  const scene = toMapScene(pack.gamemap);
  assert.ok(scene.nodos.plaza);
  assert.ok(scene.nodos.zigurat);
  assert.ok(scene.enlaces['calle-plaza-zigurat']);

  const { createMapEngine } = await importGameEngine();
  const engine = createMapEngine(structuredClone(scene));
  assert.equal(engine.sceneId, 'ciudad-v0');
  engine.registerActor('walker', {
    zone: 'plaza',
    pose: 'idle',
    position: { ...scene.nodos.plaza.entrada }
  });
  const walk = engine.applyIntent('walker', {
    intent: 'walk',
    linkId: 'calle-plaza-zigurat',
    direction: 'a-to-b'
  });
  assert.equal(walk.ok, true, walk.error);
  for (let i = 0; i < 40; i += 1) engine.tick(0.2);
  const snap = engine.getSnapshot();
  assert.equal(snap.sceneId, 'ciudad-v0');
  assert.ok(snap.actors.walker);
  // arbol must not be required by engine — still present on pack seed only
  assert.ok(pack.arbol);
});

test('ceguera: published tree has zero framework/holon path tokens', () => {
  const files = [
    'index.mjs',
    'scene.mjs',
    'manifest.json',
    'package.json',
    'README.md',
    'seeds/gamemap.json',
    'volumes/volumes.json',
    'acta/ACTA.md',
    'schemas/arbol.schema.json'
  ];
  const banned =
    /SCRIPT_SDK|S_SDK|hol[oó]n|holarqu[ií]a|juntura|HOLONES|aleph-scriptorium/i;
  for (const rel of files) {
    const text = readFileSync(join(ROOT, rel), 'utf8');
    assert.equal(banned.test(text), false, `leak in ${rel}`);
  }
});

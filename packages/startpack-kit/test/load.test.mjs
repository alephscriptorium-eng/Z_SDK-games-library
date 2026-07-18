import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  loadStartPack,
  createStartPackLoader,
  readJsonIfExists,
  readTextIfExists
} from '../index.mjs';

function writeFixture({ game = 'fixture-game', withPresets = false } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'startpack-kit-'));
  mkdirSync(join(root, 'seeds'), { recursive: true });
  mkdirSync(join(root, 'volumes'), { recursive: true });
  mkdirSync(join(root, 'acta'), { recursive: true });
  const manifest = {
    game,
    version: '0.0.1',
    seeds: { gamemap: 'seeds/gamemap.json' },
    volumes: { root: 'volumes' },
    acta: 'acta/ACTA.md'
  };
  if (withPresets) {
    manifest.seeds.presets = 'seeds/presets.json';
    writeFileSync(join(root, 'seeds/presets.json'), JSON.stringify([{ id: 'p1' }]));
  }
  writeFileSync(join(root, 'manifest.json'), JSON.stringify(manifest));
  writeFileSync(
    join(root, 'seeds/gamemap.json'),
    JSON.stringify({ id: 'gm-1', label: 'demo' })
  );
  writeFileSync(join(root, 'volumes/volumes.json'), JSON.stringify({ disks: [] }));
  writeFileSync(join(root, 'acta/ACTA.md'), '# acta\n');
  return root;
}

test('loadStartPack: manifest + gamemap + volumes + acta', () => {
  const root = writeFixture();
  const pack = loadStartPack({
    root,
    packageName: '@zeus/startpack-fixture',
    game: 'fixture-game'
  });
  assert.equal(pack.game, 'fixture-game');
  assert.equal(pack.packageName, '@zeus/startpack-fixture');
  assert.equal(pack.gamemap.id, 'gm-1');
  assert.equal(pack.version, '0.0.1');
  assert.equal(pack.presets, null);
  assert.ok(pack.volumesRoot.endsWith('volumes'));
  assert.ok(pack.actaPath.endsWith('ACTA.md'));
});

test('loadStartPack: presets opcionales + enrich', () => {
  const root = writeFixture({ withPresets: true });
  const pack = loadStartPack({
    root,
    packageName: '@zeus/startpack-fixture',
    game: 'fixture-game',
    enrich(base) {
      return {
        env: { ZEUS_VOLUMES_ROOT: base.volumesRoot },
        tag: 'enriched'
      };
    }
  });
  assert.ok(Array.isArray(pack.presets));
  assert.equal(pack.presets[0].id, 'p1');
  assert.equal(pack.tag, 'enriched');
  assert.equal(pack.env.ZEUS_VOLUMES_ROOT, pack.volumesRoot);
});

test('loadStartPack: rejects missing manifest / wrong game', () => {
  assert.throws(
    () =>
      loadStartPack({
        root: join(tmpdir(), 'no-such-pack'),
        packageName: '@zeus/startpack-fixture',
        game: 'fixture-game'
      }),
    /missing manifest/
  );
  const root = writeFixture({ game: 'other' });
  assert.throws(
    () =>
      loadStartPack({
        root,
        packageName: '@zeus/startpack-fixture',
        game: 'fixture-game'
      }),
    /expected game=fixture-game/
  );
});

test('createStartPackLoader: thin wrapper API', () => {
  const root = writeFixture();
  const { loadStartPack: load, resolveStartPackRoot } = createStartPackLoader({
    packageRoot: root,
    packageName: '@zeus/startpack-fixture',
    game: 'fixture-game'
  });
  assert.equal(resolveStartPackRoot(), root);
  const pack = load();
  assert.equal(pack.gamemap.id, 'gm-1');
});

test('readJsonIfExists / readTextIfExists', () => {
  const root = writeFixture();
  assert.equal(readJsonIfExists(join(root, 'missing.json')), null);
  assert.equal(readTextIfExists(join(root, 'missing.md')), '');
  assert.equal(readJsonIfExists(join(root, 'seeds/gamemap.json')).id, 'gm-1');
  assert.match(readTextIfExists(join(root, 'acta/ACTA.md')), /acta/);
});

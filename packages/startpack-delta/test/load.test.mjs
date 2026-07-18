import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStartPack } from '../index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('loadStartPack: manifest delta + presets + volumes', () => {
  const pack = loadStartPack({ root: ROOT });
  assert.equal(pack.game, 'delta');
  assert.equal(pack.packageName, '@zeus/startpack-delta');
  assert.ok(pack.gamemap?.id);
  assert.ok(Array.isArray(pack.presets) && pack.presets.length >= 2);
  assert.ok(pack.gamemap.startPack.includes('aleph-tronco-puro'));
  assert.ok(existsSync(join(pack.volumesRoot, 'volumes.json')));
  assert.ok(existsSync(join(pack.volumesRoot, 'DISK_03', 'FORCES', 'registry.json')));
  assert.equal(pack.env.ZEUS_VOLUMES_ROOT, pack.volumesRoot);
  assert.match(pack.env.ZEUS_ARG_START_PACK, /aleph-tronco-puro/);
});

test('loadStartPack: rejects wrong root without manifest', () => {
  assert.throws(() => loadStartPack({ root: ROOT + '-missing' }), /missing manifest/);
});

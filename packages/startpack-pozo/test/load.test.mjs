import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStartPack } from '../index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('loadStartPack: manifest pozo + volumes', () => {
  const pack = loadStartPack({ root: ROOT });
  assert.equal(pack.game, 'pozo');
  assert.equal(pack.packageName, '@zeus/startpack-pozo');
  assert.ok(pack.gamemap?.id);
  assert.ok(existsSync(join(pack.volumesRoot, 'volumes.json')));
  assert.ok(existsSync(join(pack.volumesRoot, 'DISK_03', 'FORCES', 'registry.json')));
  assert.equal(pack.env.ZEUS_VOLUMES_ROOT, pack.volumesRoot);
  assert.ok(pack.env.ZEUS_POZO_FEED_SEED);
});

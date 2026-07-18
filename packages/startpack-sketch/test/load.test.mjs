import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStartPack } from '../index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('loadStartPack: sketch scene + labelset + line + casos', () => {
  const pack = loadStartPack({ root: ROOT });
  assert.equal(pack.game, 'sketch');
  assert.equal(pack.packageName, '@zeus/startpack-sketch');
  assert.ok(pack.gamemap?.id);
  assert.ok(pack.scene?.id);
  assert.ok(Array.isArray(pack.labelset) && pack.labelset.length > 0);
  assert.match(pack.casosMd, /## C-01/);
  assert.ok(existsSync(join(pack.volumesRoot, 'volumes.json')));
  assert.ok(existsSync(join(pack.volumesRoot, 'DISK_02', 'LINEAS', 'registry.yaml')));
  assert.equal(pack.env.ZEUS_VOLUMES_ROOT, pack.volumesRoot);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadStartPack } from '../index.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

test('loadStartPack: plaza story-board + labelset + casos', () => {
  const pack = loadStartPack({ root: ROOT });
  assert.equal(pack.game, 'plaza');
  assert.equal(pack.packageName, '@zeus/startpack-plaza');
  assert.ok(pack.gamemap?.id);
  assert.ok(pack.storyBoard?.acts?.length >= 1);
  assert.equal(pack.storyBoard.acts[0].id, 'act-0');
  assert.ok(Array.isArray(pack.labelset) && pack.labelset.length > 0);
  assert.match(pack.casosMd, /## C-01/);
  assert.ok(existsSync(join(pack.volumesRoot, 'volumes.json')));
  assert.equal(pack.env.ZEUS_VOLUMES_ROOT, pack.volumesRoot);
});

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { loadStartPack } from '../index.mjs';

describe('startpack-solve-coagula', () => {
  it('loadStartPack carga gamemap + volumes + story-board', () => {
    const pack = loadStartPack();
    assert.equal(pack.game, 'solve-coagula');
    assert.equal(pack.gamemap.id, 'solve-coagula-demo');
    assert.ok(pack.volumesRoot);
    assert.ok(pack.storyBoard?.acts?.length >= 8);
    assert.ok(pack.env.ZEUS_VOLUMES_ROOT);
  });
});

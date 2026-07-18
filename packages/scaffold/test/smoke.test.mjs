import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  GAME_SLOTS,
  LIBRARY_ID,
  LIBRARY_STATUS,
  isKnownGameSlot,
} from '../src/index.mjs';

describe('games-library scaffold smoke', () => {
  it('identifies the library without canonizing one game', () => {
    assert.equal(LIBRARY_ID, 'Z_SDK-games-library');
    assert.equal(LIBRARY_STATUS, 'scaffold');
    assert.ok(GAME_SLOTS.length >= 2, 'al menos dos slots (regla dos juegos)');
    assert.ok(isKnownGameSlot('delta'));
    assert.ok(isKnownGameSlot('pozo'));
    assert.equal(isKnownGameSlot('solo-canon'), false);
  });
});

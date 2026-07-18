import test from 'node:test';
import assert from 'node:assert/strict';

import { createLineBoard, DEFAULT_LINE_SEED, decodeLineStatus } from '../src/line-board.mjs';

test('cache → curate → milestone: cadena válida con eventos', () => {
  const board = createLineBoard(DEFAULT_LINE_SEED);
  assert.equal(board.cache('linea-aleph', 'P03', 'dj1').ok, true);
  assert.equal(board.registro('linea-aleph', 'P03').cached, true);
  assert.equal(board.curate('linea-aleph', 'P03', null, 'dj1').status, 'draft');
  assert.equal(board.curate('linea-aleph', 'P03', 'curated', 'dj1').status, 'curated');
  assert.equal(board.milestone('linea-aleph', 'P03', ['keyword'], 'dj1').ok, true);
  assert.deepEqual(board.registro('linea-aleph', 'P03').milestone.reasons, ['keyword']);

  const events = board.drainEvents();
  assert.deepEqual(
    events.map((e) => e.kind),
    ['cache', 'curate', 'curate', 'milestone']
  );
});

test('rechazos: ya_cacheado, no_cacheado, status_salto, ya_milestone', () => {
  const board = createLineBoard();
  board.cache('linea-aleph', 'P03');
  assert.equal(board.cache('linea-aleph', 'P03').error, 'ya_cacheado');
  assert.equal(board.curate('linea-aleph', 'P04', 'draft').error, 'no_cacheado');
  board.cache('linea-aleph', 'P04');
  assert.equal(board.curate('linea-aleph', 'P04', 'curated').error, 'status_salto');
  board.curate('linea-aleph', 'P04', 'draft');
  board.curate('linea-aleph', 'P04', 'curated');
  board.milestone('linea-aleph', 'P04', []);
  assert.equal(board.milestone('linea-aleph', 'P04', []).error, 'ya_milestone');
});

test('snapshot compacto: regs = arrays + decodeLineStatus', () => {
  const board = createLineBoard();
  board.cache('linea-aleph', 'P03');
  const snap = board.snapshot();
  assert.equal(snap.rev, 1);
  const p03 = snap.regs.find((r) => r[1] === 'P03');
  assert.deepEqual(p03, ['linea-aleph', 'P03', 1, 0, 0]);
  assert.equal(decodeLineStatus(p03[3]), 'pending');
});

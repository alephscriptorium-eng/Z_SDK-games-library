/**
 * Tests del cronista + contrato de lectura del story-board.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { validateIntent, INTENTS } from '../src/contract.mjs';
import {
  CANONICAL_STORY_BOARD,
  CRONISTA_ACTOR_ID,
  CRONISTA_ROLE,
  actToAnnounceMessage,
  createCronistaCursor,
  cronistaJoinIntent,
  inspectStoryBoard,
  listAnnounceableActs,
  loadStoryBoard,
  projectBoardToAnnounceIntents
} from '../src/cronista.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const STARTPACK = join(ROOT, '..', '..', 'startpack-ciudad', 'seeds', 'gamemap.json');

describe('cronista · story-board', () => {
  it('carga el destino canónico y expone ≥1 acto anunciable', () => {
    const board = loadStoryBoard(CANONICAL_STORY_BOARD);
    const view = inspectStoryBoard(board);
    assert.equal(view.slug, 'ciudad');
    assert.ok(view.actCount >= 2);
    const acts = listAnnounceableActs(board);
    assert.ok(acts.length >= 1);
    assert.ok(!acts.some((a) => a.id === 'act-0'));
  });

  it('mensaje traza al act.id y cabe en 128', () => {
    const msg = actToAnnounceMessage({
      id: 'act-1',
      title: 'Presencia en plaza',
      detail: { message: 'plaza abierta' }
    });
    assert.match(msg, /\[act-1\]/);
    assert.match(msg, /plaza abierta/);
    assert.ok(msg.length <= 128);
  });

  it('cursor: idempotencia por act.id', () => {
    const board = loadStoryBoard(CANONICAL_STORY_BOARD);
    const cursor = createCronistaCursor();
    const first = projectBoardToAnnounceIntents(board, { cursor, limit: 1 });
    assert.equal(first.length, 1);
    cursor.mark(first[0].actId);
    const second = projectBoardToAnnounceIntents(board, { cursor, limit: 1 });
    assert.notEqual(second[0]?.actId, first[0].actId);
    for (const a of listAnnounceableActs(board)) cursor.mark(a.id);
    assert.equal(projectBoardToAnnounceIntents(board, { cursor }).length, 0);
  });

  it('join + announce con rol dj pasan validateIntent y asientan ledger', () => {
    const board = loadStoryBoard(CANONICAL_STORY_BOARD);
    const join = cronistaJoinIntent();
    assert.equal(join.role, CRONISTA_ROLE);
    assert.equal(validateIntent(join, INTENTS).ok, true);

    const d = createCiudadDomainState({
      now: () => 1,
      gamemap: JSON.parse(readFileSync(STARTPACK, 'utf8'))
    });
    assert.equal(d.applyIntent(join).ok, true);

    const { actId, intent } = projectBoardToAnnounceIntents(board, { limit: 1 })[0];
    assert.equal(intent.role, CRONISTA_ROLE);
    assert.equal(validateIntent(intent, INTENTS).ok, true);
    assert.equal(d.applyIntent(intent).ok, true);

    const { ledger } = d.drainOutbox();
    const ann = ledger.find(
      (e) => e.kind === 'announce' && e.actorId === CRONISTA_ACTOR_ID
    );
    assert.ok(ann);
    assert.match(ann.detail.message, new RegExp(`\\[${actId}\\]`));
  });
});

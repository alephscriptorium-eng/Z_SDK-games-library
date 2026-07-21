/**
 * Smoke cronista: lee story-board canónico → join (rol dj) → ≥1 announce
 * trazable a un acto. Camino plaza = ledger announce (HUD bridge ya formatea
 * `announce`; audio de parte = campanas, dep cerrada — no reimplementar).
 *
 *   node packages/ciudad/fixtures/cronista-smoke.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import {
  CANONICAL_STORY_BOARD,
  CRONISTA_ACTOR_ID,
  CRONISTA_ROLE,
  createCronistaCursor,
  cronistaJoinIntent,
  loadStoryBoard,
  projectBoardToAnnounceIntents
} from '../src/cronista.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const STARTPACK = join(ROOT, '..', '..', 'startpack-ciudad', 'seeds', 'gamemap.json');

function must(label, r) {
  if (!r || r.ok === false) {
    console.error('FAIL', label, r?.error);
    process.exit(1);
  }
  console.log('ok', label);
}

const board = loadStoryBoard(CANONICAL_STORY_BOARD);
const d = createCiudadDomainState({
  now: () => 42,
  gamemap: JSON.parse(readFileSync(STARTPACK, 'utf8'))
});

must('join dj', d.applyIntent(cronistaJoinIntent()));

const cursor = createCronistaCursor();
const projected = projectBoardToAnnounceIntents(board, { cursor, limit: 1 });
if (projected.length < 1) {
  console.error('FAIL no announceable acts on board');
  process.exit(1);
}

const { actId, message, intent } = projected[0];
if (intent.role !== CRONISTA_ROLE) {
  console.error('FAIL role', intent.role);
  process.exit(1);
}
must(`announce ${actId}`, d.applyIntent(intent));
cursor.mark(actId);

const out = d.drainOutbox();
const ann = out.ledger.find((e) => e.kind === 'announce' && e.actorId === CRONISTA_ACTOR_ID);
if (!ann) {
  console.error('FAIL ledger sin announce del cronista', out.ledger);
  process.exit(1);
}
if (!String(ann.detail?.message || '').includes(`[${actId}]`)) {
  console.error('FAIL mensaje no traza al acto', ann.detail?.message, actId);
  process.exit(1);
}

const snap = d.snapshot('cronista-smoke');
console.log(
  'CRONISTA_SMOKE_OK',
  JSON.stringify({
    actorId: CRONISTA_ACTOR_ID,
    role: CRONISTA_ROLE,
    actId,
    message,
    ledgerSeq: ann.seq,
    announced: snap.actors[CRONISTA_ACTOR_ID]?.announced === true,
    boardSlug: board.slug,
    boardPath: 'kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json',
    bridgePath: 'ledger announce → operator-bridge LEDGER_CONTENT.announce (dep)',
    campanas: 'parte → campanas (dep cerrada; no reopen)'
  })
);

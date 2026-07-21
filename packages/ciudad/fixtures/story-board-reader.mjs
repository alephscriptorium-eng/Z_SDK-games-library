#!/usr/bin/env node
/**
 * Segundo lector del story-board (contrato multi-agente) — solo lectura.
 * Independiente del cronista (no emite announce). Mismo destino canónico.
 *
 *   node packages/ciudad/fixtures/story-board-reader.mjs
 *   node packages/ciudad/fixtures/story-board-reader.mjs --json
 */

import {
  CANONICAL_STORY_BOARD,
  inspectStoryBoard,
  listAnnounceableActs,
  loadStoryBoard
} from '../src/cronista.mjs';

function main(argv) {
  const asJson = argv.includes('--json');
  const board = loadStoryBoard(CANONICAL_STORY_BOARD);
  const view = inspectStoryBoard(board);
  const announceable = listAnnounceableActs(board).map((a) => a.id);
  const payload = {
    path: 'kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json',
    reader: 'story-board-reader',
    ...view,
    announceableActIds: announceable
  };
  if (asJson) {
    console.log(JSON.stringify(payload, null, 2));
  } else {
    console.log('STORY_BOARD_READER', {
      slug: payload.slug,
      actCount: payload.actCount,
      announceableActIds: announceable,
      ok: payload.actCount >= 1 && announceable.length >= 1
    });
  }
  if (payload.actCount < 1 || announceable.length < 1) {
    process.exitCode = 1;
  }
}

main(process.argv.slice(2));

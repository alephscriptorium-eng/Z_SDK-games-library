#!/usr/bin/env node
/**
 * Valida story-board.json vía @zeus/story-board-schema (WP-U117).
 * El schema vive en zeus; este script es CLI + reexport del kit.
 *
 * Uso:
 *   node validate-story-board.mjs <path.json> [<path.json> ...]
 *   node validate-story-board.mjs --fixtures
 */

import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateStoryBoard,
  validateStoryBoardFile
} from '@zeus/story-board-schema';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, '..');

export { validateStoryBoard, validateStoryBoardFile };

function defaultFixtures() {
  const hermetic = [
    join(KIT_ROOT, 'fixtures', 'solve-coagula-story-board.json'),
    join(KIT_ROOT, 'fixtures', 'aleph-et-omega-story-board.json')
  ].filter((c) => existsSync(c));
  if (hermetic.length >= 2) return hermetic;

  const live = [
    resolve(
      KIT_ROOT,
      '../../../scriptorium-network-games/SOLVE_ET_COAGULA/readerapp/solve-coagula-story-board.json'
    ),
    resolve(
      KIT_ROOT,
      '../../../scriptorium-network-games/ALEPH_ET_OMEGA/readerapp/aleph-et-omega-story-board.json'
    )
  ].filter((c) => existsSync(c));
  return [...hermetic, ...live.filter((c) => !hermetic.includes(c))];
}

function main(argv) {
  let paths = argv.filter((a) => !a.startsWith('--'));
  if (argv.includes('--fixtures') || paths.length === 0) {
    paths = defaultFixtures();
    if (paths.length === 0) {
      console.error(
        'No fixture story-boards found. Pass paths explicitly or clone scriptorium-network-games as sibling of SCRIPTORIUM_V0.'
      );
      process.exit(2);
    }
  }

  let failed = 0;
  for (const p of paths) {
    const r = validateStoryBoardFile(p);
    if (r.ok) {
      const summary = [...r.actsToWidgets.entries()]
        .map(([id, ws]) => `${id}→[${ws.join(',')}]`)
        .join('; ');
      console.log(`✅ ${r.path}`);
      console.log(`   dialect=${r.dialect}  ${summary}`);
    } else {
      failed += 1;
      console.error(`❌ ${r.path}`);
      for (const e of r.errors) console.error(`   - ${e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2));
}

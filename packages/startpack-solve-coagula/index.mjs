/**
 * @zeus/startpack-solve-coagula — loader (WP-U87 / U110).
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createStartPackLoader,
  readJsonIfExists,
  readTextIfExists
} from '@zeus/startpack-kit';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

const { loadStartPack, resolveStartPackRoot } = createStartPackLoader({
  packageRoot: PKG_ROOT,
  packageName: '@zeus/startpack-solve-coagula',
  game: 'solve-coagula',
  enrich(base) {
    const { root, gamemap, manifest, volumesRoot } = base;
    const storyRel = manifest.seeds?.storyBoard || 'seeds/story-board.json';
    const storyBoardPath = join(root, storyRel);
    const storyBoard = readJsonIfExists(storyBoardPath);
    const casosRel = manifest.seeds?.casos || 'seeds/casos.md';
    const casosMd = readTextIfExists(join(root, casosRel));
    return {
      storyBoard,
      storyBoardPath: storyBoard ? storyBoardPath : null,
      casosMd,
      env: {
        ZEUS_VOLUMES_ROOT: volumesRoot,
        ZEUS_SOLVE_STORY_BOARD: storyBoard ? storyBoardPath : '',
        ZEUS_SOLVE_LINE_ID: String(
          gamemap.lineId || manifest.round?.lineId || 'solve-coagula'
        )
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot };
export default { loadStartPack, resolveStartPackRoot };

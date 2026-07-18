/**
 * @zeus/startpack-plaza — loader narrativo (WP-U111 / U110 kit).
 * Juguete parametrizable con story-board solve-inline (carpeta dialect mínimo).
 * Sin nombres exclusivos de delta/pozo/solve-producto.
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
  packageName: '@zeus/startpack-plaza',
  game: 'plaza',
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
      labelset: Array.isArray(gamemap.labelset) ? gamemap.labelset : [],
      casosMd,
      env: {
        ZEUS_VOLUMES_ROOT: volumesRoot,
        ZEUS_PLAZA_STORY_BOARD: storyBoard ? storyBoardPath : '',
        ZEUS_PLAZA_LINE_ID: String(gamemap.lineId || manifest.round?.lineId || '')
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot };
export default { loadStartPack, resolveStartPackRoot };

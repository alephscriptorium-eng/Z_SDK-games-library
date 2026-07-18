/**
 * @zeus/startpack-solve-coagula — loader (WP-U87).
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

export function resolveStartPackRoot(root = PKG_ROOT) {
  return root;
}

/**
 * @param {{ root?: string }} [opts]
 */
export function loadStartPack(opts = {}) {
  const root = resolveStartPackRoot(opts.root);
  const manifestPath = join(root, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`startpack-solve-coagula: missing manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.game !== 'solve-coagula') {
    throw new Error(
      `startpack-solve-coagula: expected game=solve-coagula, got ${manifest.game}`
    );
  }

  const gamemapRel = manifest.seeds?.gamemap || 'seeds/gamemap.json';
  const gamemap = JSON.parse(readFileSync(join(root, gamemapRel), 'utf8'));
  const storyRel = manifest.seeds?.storyBoard || 'seeds/story-board.json';
  const storyBoardPath = join(root, storyRel);
  const storyBoard = existsSync(storyBoardPath)
    ? JSON.parse(readFileSync(storyBoardPath, 'utf8'))
    : null;
  const casosRel = manifest.seeds?.casos || 'seeds/casos.md';
  const casosPath = join(root, casosRel);
  const casosMd = existsSync(casosPath) ? readFileSync(casosPath, 'utf8') : '';
  const volumesRoot = join(root, manifest.volumes?.root || 'volumes');
  const actaPath = join(root, manifest.acta || 'acta/ACTA.md');

  return {
    root,
    packageName: '@zeus/startpack-solve-coagula',
    game: 'solve-coagula',
    version: manifest.version,
    manifest,
    gamemap,
    storyBoard,
    storyBoardPath: existsSync(storyBoardPath) ? storyBoardPath : null,
    casosMd,
    presets: null,
    volumesRoot,
    actaPath,
    env: {
      ZEUS_VOLUMES_ROOT: volumesRoot,
      ZEUS_SOLVE_STORY_BOARD: existsSync(storyBoardPath) ? storyBoardPath : '',
      ZEUS_SOLVE_LINE_ID: String(gamemap.lineId || manifest.round?.lineId || 'solve-coagula')
    }
  };
}

export default { loadStartPack, resolveStartPackRoot };

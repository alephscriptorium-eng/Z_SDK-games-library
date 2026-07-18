/**
 * Carga actos (story-board) y meta linea desde dramaturgia / startpack / env.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ volumesRoot?: string|null, storyBoardPath?: string|null }} [opts]
 */
export function loadSolveMaterials(opts = {}) {
  const storyBoardPath =
    opts.storyBoardPath ||
    process.env.ZEUS_SOLVE_STORY_BOARD ||
    join(PKG_ROOT, 'dramaturgia/readerapp/story-board.json');

  let acts = [];
  if (existsSync(storyBoardPath)) {
    const board = JSON.parse(readFileSync(storyBoardPath, 'utf8'));
    acts = Array.isArray(board.acts)
      ? board.acts.map((a) => ({
          id: a.id,
          title: a.title,
          blockchain: a.blockchain,
          widgets: a.widgets,
          status: a.status
        }))
      : [];
  }

  const volumesRoot =
    opts.volumesRoot ||
    process.env.ZEUS_VOLUMES_ROOT ||
    null;
  const lineaRoot =
    process.env.ZEUS_LINEA_ALEPH_ROOT ||
    (volumesRoot
      ? join(volumesRoot, 'DISK_02', 'LINEAS', 'solve-coagula')
      : null) ||
    join(
      dirname(fileURLToPath(import.meta.url)),
      '../../startpack-solve-coagula/volumes/DISK_02/LINEAS/solve-coagula'
    );

  let linea = null;
  const manifestPath = join(lineaRoot, 'manifest.json');
  if (existsSync(manifestPath)) {
    const m = JSON.parse(readFileSync(manifestPath, 'utf8'));
    linea = {
      title: m.meta?.title,
      corpus: m.meta?.corpus || 'linea-aleph',
      registro_count: m.meta?.registro_count ?? (m.registros?.length || 0),
      fixture: Boolean(m.meta?.fixture)
    };
  }

  return {
    acts,
    linea,
    storyBoardPath,
    lineaRoot: existsSync(manifestPath) ? lineaRoot : null
  };
}

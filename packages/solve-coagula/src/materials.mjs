/**
 * Carga actos (story-board), payloads de widgets y meta linea desde
 * dramaturgia / startpack / env.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/**
 * @param {{ volumesRoot?: string|null, storyBoardPath?: string|null, widgetsDir?: string|null }} [opts]
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

  const widgetsDir =
    opts.widgetsDir ||
    process.env.ZEUS_SOLVE_WIDGETS_DIR ||
    join(PKG_ROOT, 'dramaturgia/readerapp/widgets');

  /** @type {Record<string, object>} */
  const widgetData = {};
  const widgetIds = new Set();
  for (const act of acts) {
    for (const id of act.widgets || []) widgetIds.add(id);
  }
  for (const id of widgetIds) {
    const path = join(widgetsDir, `${id}.json`);
    if (!existsSync(path)) continue;
    try {
      widgetData[id] = JSON.parse(readFileSync(path, 'utf8'));
    } catch {
      /* payload roto: el runtime muestra vacío / unknown */
    }
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
    widgetData,
    storyBoardPath,
    widgetsDir,
    lineaRoot: existsSync(manifestPath) ? lineaRoot : null
  };
}

/**
 * @zeus/startpack-sketch — loader de start pack (WP-U70 / U110).
 * Juego mínimo parametrizable: escena, labelset, línea, casos.
 * Sin nombres exclusivos de delta/pozo (regla de los dos juegos en el pack).
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
  packageName: '@zeus/startpack-sketch',
  game: 'sketch',
  enrich(base) {
    const { root, gamemap, manifest, volumesRoot } = base;
    const sceneRel = manifest.seeds?.scene || gamemap.scene || 'seeds/scene.json';
    const scenePath = join(root, sceneRel);
    const scene = readJsonIfExists(scenePath);
    const casosRel = manifest.seeds?.casos || 'seeds/casos.md';
    const casosMd = readTextIfExists(join(root, casosRel));
    return {
      scene,
      labelset: Array.isArray(gamemap.labelset) ? gamemap.labelset : [],
      casosMd,
      env: {
        ZEUS_VOLUMES_ROOT: volumesRoot,
        ZEUS_SKETCH_SCENE_ID: String(gamemap.sceneId || scene?.id || ''),
        ZEUS_SKETCH_LINE_ID: String(gamemap.lineId || manifest.round?.lineId || '')
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot };
export default { loadStartPack, resolveStartPackRoot };

/**
 * @zeus/startpack-ciudad — city topology start pack (seeds + flat gamemap).
 * Loads via startpack-kit; scene projection for @zeus/game-engine via toMapScene.
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStartPackLoader } from '@zeus/startpack-kit';
import { toMapScene, validateArbol } from './scene.mjs';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

const { loadStartPack, resolveStartPackRoot } = createStartPackLoader({
  packageRoot: PKG_ROOT,
  packageName: '@zeus/startpack-ciudad',
  game: 'ciudad',
  enrich(base) {
    const { gamemap, volumesRoot } = base;
    const scene = toMapScene(gamemap);
    const arbolCheck = validateArbol(gamemap.arbol);
    return {
      scene,
      arbol: gamemap.arbol,
      zones: gamemap.zones,
      arbolValid: arbolCheck.ok,
      env: {
        ZEUS_VOLUMES_ROOT: volumesRoot,
        ZEUS_CIUDAD_SCENE_ID: String(scene.id),
        ZEUS_CIUDAD_GAMEMAP_ID: String(gamemap.id || '')
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot, toMapScene, validateArbol };
export default { loadStartPack, resolveStartPackRoot, toMapScene, validateArbol };

/**
 * @zeus/startpack-delta — loader de start pack (WP-U62 / U110).
 * Datos semilla versionados con los que arranca una ronda delta.
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStartPackLoader } from '@zeus/startpack-kit';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

const { loadStartPack, resolveStartPackRoot } = createStartPackLoader({
  packageRoot: PKG_ROOT,
  packageName: '@zeus/startpack-delta',
  game: 'delta',
  enrich(base) {
    const { gamemap, manifest, volumesRoot } = base;
    return {
      gamemap: {
        ...gamemap,
        startPack: gamemap.startPack ?? manifest.startPack,
        objetivo: gamemap.objetivo ?? manifest.objetivo,
        seeds: {
          ...(gamemap.seeds || {}),
          mazePack: gamemap.seeds?.mazePack ?? manifest.seeds?.mazePack ?? null,
          firehoseCursor:
            gamemap.seeds?.firehoseCursor ?? manifest.seeds?.firehoseCursor ?? 0
        }
      },
      env: {
        ZEUS_ARG_GAMEMAP: gamemap.id || manifest.round?.gamemapId || 'gamemap-demo',
        ZEUS_ARG_SEED: String(manifest.round?.seed ?? 1),
        ZEUS_ARG_FEEDS: manifest.round?.feeds || 'synthetic',
        ZEUS_ARG_START_PACK: (manifest.startPack || []).join(','),
        ZEUS_VOLUMES_ROOT: volumesRoot
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot };
export default { loadStartPack, resolveStartPackRoot };

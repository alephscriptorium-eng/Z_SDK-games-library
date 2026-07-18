/**
 * @zeus/startpack-pozo — loader de start pack (WP-U62 / U110).
 * Datos semilla versionados con los que arranca una ronda pozo.
 */

import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createStartPackLoader } from '@zeus/startpack-kit';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

const { loadStartPack, resolveStartPackRoot } = createStartPackLoader({
  packageRoot: PKG_ROOT,
  packageName: '@zeus/startpack-pozo',
  game: 'pozo',
  enrich(base) {
    const { gamemap, manifest, volumesRoot } = base;
    return {
      env: {
        ZEUS_POZO_FEED_SEED: String(
          gamemap.seeds?.feedSeed ??
            manifest.seeds?.feedSeed ??
            manifest.round?.seed ??
            1
        ),
        ZEUS_POZO_FEEDS: manifest.round?.feeds || 'synthetic',
        ZEUS_VOLUMES_ROOT: volumesRoot
      }
    };
  }
});

export { loadStartPack, resolveStartPackRoot };
export default { loadStartPack, resolveStartPackRoot };

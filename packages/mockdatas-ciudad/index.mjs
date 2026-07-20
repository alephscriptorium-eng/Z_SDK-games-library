/**
 * @zeus/mockdatas-ciudad — resolve generated volumes root for mesh browsers.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * Absolute path to the pack `volumes/` tree (set as ZEUS_VOLUMES_ROOT).
 */
export function resolveVolumesRoot() {
  return join(PKG_ROOT, 'volumes');
}

/**
 * Pack metadata + volumes root.
 */
export function loadMockdatas() {
  return {
    packageRoot: PKG_ROOT,
    volumesRoot: resolveVolumesRoot(),
    game: 'ciudad',
    env: {
      ZEUS_VOLUMES_ROOT: resolveVolumesRoot()
    }
  };
}

export default { loadMockdatas, resolveVolumesRoot };

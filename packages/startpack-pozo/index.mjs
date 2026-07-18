/**
 * @zeus/startpack-pozo — loader de start pack (WP-U62).
 * Datos semilla versionados con los que arranca una ronda pozo.
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
    throw new Error(`startpack-pozo: missing manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.game !== 'pozo') {
    throw new Error(`startpack-pozo: expected game=pozo, got ${manifest.game}`);
  }

  const gamemapRel = manifest.seeds?.gamemap || 'seeds/gamemap.json';
  const gamemap = JSON.parse(readFileSync(join(root, gamemapRel), 'utf8'));
  const volumesRoot = join(root, manifest.volumes?.root || 'volumes');
  const actaPath = join(root, manifest.acta || 'acta/ACTA.md');

  return {
    root,
    packageName: '@zeus/startpack-pozo',
    game: 'pozo',
    version: manifest.version,
    manifest,
    gamemap,
    presets: null,
    volumesRoot,
    actaPath,
    env: {
      ZEUS_POZO_FEED_SEED: String(
        gamemap.seeds?.feedSeed ?? manifest.seeds?.feedSeed ?? manifest.round?.seed ?? 1
      ),
      ZEUS_POZO_FEEDS: manifest.round?.feeds || 'synthetic',
      ZEUS_VOLUMES_ROOT: volumesRoot
    }
  };
}

export default { loadStartPack, resolveStartPackRoot };

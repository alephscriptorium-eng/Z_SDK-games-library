/**
 * @zeus/startpack-delta — loader de start pack (WP-U62).
 * Datos semilla versionados con los que arranca una ronda delta.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));

/**
 * @param {string} [root] override package root (tests / unpacked tarball)
 */
export function resolveStartPackRoot(root = PKG_ROOT) {
  return root;
}

/**
 * Load the start pack: manifest + gamemap + optional presets + volumes root.
 * @param {{ root?: string }} [opts]
 */
export function loadStartPack(opts = {}) {
  const root = resolveStartPackRoot(opts.root);
  const manifestPath = join(root, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`startpack-delta: missing manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.game !== 'delta') {
    throw new Error(`startpack-delta: expected game=delta, got ${manifest.game}`);
  }

  const gamemapRel = manifest.seeds?.gamemap || 'seeds/gamemap.json';
  const gamemapPath = join(root, gamemapRel);
  const gamemap = JSON.parse(readFileSync(gamemapPath, 'utf8'));

  let presets = null;
  if (manifest.seeds?.presets) {
    const presetsPath = join(root, manifest.seeds.presets);
    if (existsSync(presetsPath)) {
      presets = JSON.parse(readFileSync(presetsPath, 'utf8'));
    }
  }

  const volumesRoot = join(root, manifest.volumes?.root || 'volumes');
  const actaPath = join(root, manifest.acta || 'acta/ACTA.md');

  return {
    root,
    packageName: '@zeus/startpack-delta',
    game: 'delta',
    version: manifest.version,
    manifest,
    gamemap: {
      ...gamemap,
      startPack: gamemap.startPack ?? manifest.startPack,
      objetivo: gamemap.objetivo ?? manifest.objetivo,
      seeds: {
        ...(gamemap.seeds || {}),
        mazePack: gamemap.seeds?.mazePack ?? manifest.seeds?.mazePack ?? null,
        firehoseCursor: gamemap.seeds?.firehoseCursor ?? manifest.seeds?.firehoseCursor ?? 0
      }
    },
    presets,
    volumesRoot,
    actaPath,
    env: {
      ZEUS_ARG_GAMEMAP: gamemap.id || manifest.round?.gamemapId || 'gamemap-demo',
      ZEUS_ARG_SEED: String(manifest.round?.seed ?? 1),
      ZEUS_ARG_FEEDS: manifest.round?.feeds || 'synthetic',
      ZEUS_ARG_START_PACK: (manifest.startPack || []).join(','),
      ZEUS_VOLUMES_ROOT: volumesRoot
    }
  };
}

export default { loadStartPack, resolveStartPackRoot };

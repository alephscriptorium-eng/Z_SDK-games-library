/**
 * @zeus/startpack-sketch — loader de start pack (WP-U70).
 * Juego mínimo parametrizable: escena, labelset, línea, casos.
 * Sin nombres exclusivos de delta/pozo (regla de los dos juegos en el pack).
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
    throw new Error(`startpack-sketch: missing manifest at ${manifestPath}`);
  }
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  if (manifest.game !== 'sketch') {
    throw new Error(`startpack-sketch: expected game=sketch, got ${manifest.game}`);
  }

  const gamemapRel = manifest.seeds?.gamemap || 'seeds/gamemap.json';
  const gamemap = JSON.parse(readFileSync(join(root, gamemapRel), 'utf8'));
  const sceneRel = manifest.seeds?.scene || gamemap.scene || 'seeds/scene.json';
  const scenePath = join(root, sceneRel);
  const scene = existsSync(scenePath)
    ? JSON.parse(readFileSync(scenePath, 'utf8'))
    : null;
  const casosRel = manifest.seeds?.casos || 'seeds/casos.md';
  const casosPath = join(root, casosRel);
  const casosMd = existsSync(casosPath) ? readFileSync(casosPath, 'utf8') : '';
  const volumesRoot = join(root, manifest.volumes?.root || 'volumes');
  const actaPath = join(root, manifest.acta || 'acta/ACTA.md');

  return {
    root,
    packageName: '@zeus/startpack-sketch',
    game: 'sketch',
    version: manifest.version,
    manifest,
    gamemap,
    scene,
    labelset: Array.isArray(gamemap.labelset) ? gamemap.labelset : [],
    casosMd,
    presets: null,
    volumesRoot,
    actaPath,
    env: {
      ZEUS_VOLUMES_ROOT: volumesRoot,
      ZEUS_SKETCH_SCENE_ID: String(gamemap.sceneId || scene?.id || ''),
      ZEUS_SKETCH_LINE_ID: String(gamemap.lineId || manifest.round?.lineId || '')
    }
  };
}

export default { loadStartPack, resolveStartPackRoot };

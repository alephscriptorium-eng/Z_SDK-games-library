/**
 * @zeus/startpack-kit — una sola `loadStartPack` (WP-U110).
 * Núcleo genérico: sin nombres exclusivos de un juego (PRACTICAS §1.11).
 * Cada `@zeus/startpack-*` aporta packageName/game + enrich.
 */

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

/**
 * @param {string} root
 */
export function resolveStartPackRoot(root) {
  return root;
}

/**
 * @param {string} path
 */
export function readJsonFile(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

/**
 * @param {string} path
 * @returns {unknown | null}
 */
export function readJsonIfExists(path) {
  if (!existsSync(path)) return null;
  return readJsonFile(path);
}

/**
 * @param {string} path
 */
export function readTextIfExists(path) {
  if (!existsSync(path)) return '';
  return readFileSync(path, 'utf8');
}

/**
 * Única implementación de carga de start pack en la library.
 *
 * @param {{
 *   root: string,
 *   packageName: string,
 *   game: string,
 *   label?: string,
 *   enrich?: (base: {
 *     root: string,
 *     packageName: string,
 *     game: string,
 *     version: string,
 *     manifest: object,
 *     gamemap: object,
 *     presets: unknown,
 *     volumesRoot: string,
 *     actaPath: string
 *   }) => Record<string, unknown>
 * }} opts
 */
export function loadStartPack(opts) {
  const {
    root,
    packageName,
    game,
    label = packageName.replace(/^@zeus\//, ''),
    enrich
  } = opts;

  const manifestPath = join(root, 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`${label}: missing manifest at ${manifestPath}`);
  }
  const manifest = readJsonFile(manifestPath);
  if (manifest.game !== game) {
    throw new Error(`${label}: expected game=${game}, got ${manifest.game}`);
  }

  const gamemapRel = manifest.seeds?.gamemap || 'seeds/gamemap.json';
  const gamemap = readJsonFile(join(root, gamemapRel));

  let presets = null;
  if (manifest.seeds?.presets) {
    const presetsPath = join(root, manifest.seeds.presets);
    if (existsSync(presetsPath)) {
      presets = readJsonFile(presetsPath);
    }
  }

  const volumesRoot = join(root, manifest.volumes?.root || 'volumes');
  const actaPath = join(root, manifest.acta || 'acta/ACTA.md');

  const base = {
    root,
    packageName,
    game,
    version: manifest.version,
    manifest,
    gamemap,
    presets,
    volumesRoot,
    actaPath
  };

  const extra = typeof enrich === 'function' ? enrich(base) || {} : {};
  return { ...base, ...extra };
}

/**
 * Factory para thin wrappers en cada `@zeus/startpack-*`.
 *
 * @param {{
 *   packageRoot: string,
 *   packageName: string,
 *   game: string,
 *   enrich?: (base: object) => Record<string, unknown>
 * }} config
 */
export function createStartPackLoader(config) {
  const { packageRoot, packageName, game, enrich } = config;
  const label = packageName.replace(/^@zeus\//, '');

  function resolveRoot(root = packageRoot) {
    return resolveStartPackRoot(root);
  }

  function load(opts = {}) {
    return loadStartPack({
      root: resolveRoot(opts.root),
      packageName,
      game,
      label,
      enrich
    });
  }

  return { loadStartPack: load, resolveStartPackRoot: resolveRoot };
}

export default {
  loadStartPack,
  resolveStartPackRoot,
  createStartPackLoader,
  readJsonFile,
  readJsonIfExists,
  readTextIfExists
};

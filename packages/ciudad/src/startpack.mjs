/**
 * Carga @zeus/startpack-ciudad (Z02). Escena sembrada, no hardcodeada.
 */

import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { existsSync } from 'node:fs';

const PKG_DIR = dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = join(PKG_DIR, '../../..');
const SIBLING_STARTPACK = join(PKG_DIR, '../../startpack-ciudad');

export async function tryLoadCiudadStartPack() {
  const resolverUrl = pathToFileURL(join(LIBRARY_ROOT, 'scripts/resolve-startpack.mjs')).href;
  try {
    const { resolveInstalledStartPack } = await import(resolverUrl);
    return await resolveInstalledStartPack('ciudad', {
      root: process.env.ZEUS_STARTPACK_CIUDAD || process.env.ZEUS_STARTPACK_ROOT || undefined
    });
  } catch (err) {
    // Workspace sibling fallback (dev without resolve table env key).
    if (existsSync(join(SIBLING_STARTPACK, 'index.mjs'))) {
      const mod = await import(pathToFileURL(join(SIBLING_STARTPACK, 'index.mjs')).href);
      return mod.loadStartPack({ root: SIBLING_STARTPACK });
    }
    if (process.env.ZEUS_STARTPACK_REQUIRED === '1') throw err;
    return null;
  }
}

export function applyStartPackEnv(pack) {
  if (!pack?.env) return;
  for (const [k, v] of Object.entries(pack.env)) {
    if (v == null || v === '') continue;
    if (process.env[k] == null || process.env[k] === '') {
      process.env[k] = String(v);
    }
  }
}

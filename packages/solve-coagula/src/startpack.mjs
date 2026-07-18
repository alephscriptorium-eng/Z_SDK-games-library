/**
 * Carga opcional de @zeus/startpack-solve-coagula (WP-U87).
 */

import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PKG_DIR = dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = join(PKG_DIR, '../../..');

export async function tryLoadSolveStartPack() {
  const resolverUrl = pathToFileURL(join(LIBRARY_ROOT, 'scripts/resolve-startpack.mjs')).href;
  try {
    const { resolveInstalledStartPack } = await import(resolverUrl);
    return await resolveInstalledStartPack('solve-coagula');
  } catch (err) {
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

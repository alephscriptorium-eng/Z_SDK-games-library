/**
 * Carga opcional de @zeus/startpack-delta (WP-U62).
 * Si no hay pack instalado ni ZEUS_STARTPACK_ROOT, retorna null (demo clásica).
 */

import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { libraryRootFrom } from './roots.mjs';

/**
 * @returns {Promise<null | object>}
 */
export async function tryLoadDeltaStartPack() {
  // lib → arg-demos → delta → packages → library root
  const libraryRoot = libraryRootFrom(import.meta.url, 4);
  const resolverUrl = pathToFileURL(join(libraryRoot, 'scripts/resolve-startpack.mjs')).href;
  try {
    const { resolveInstalledStartPack } = await import(resolverUrl);
    return await resolveInstalledStartPack('delta');
  } catch (err) {
    if (process.env.ZEUS_STARTPACK_REQUIRED === '1') throw err;
    return null;
  }
}

/**
 * Aplica env del pack al process (VOLUMES + seed de ronda).
 * @param {object} pack
 */
export function applyStartPackEnv(pack) {
  if (!pack?.env) return;
  for (const [k, v] of Object.entries(pack.env)) {
    if (v == null || v === '') continue;
    if (process.env[k] == null || process.env[k] === '') {
      process.env[k] = String(v);
    }
  }
}

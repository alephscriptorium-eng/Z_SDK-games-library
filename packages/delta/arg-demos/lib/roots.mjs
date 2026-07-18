/**
 * Raíces library + monorepo Z_SDK (WP-U61).
 * Reexporta resolveZeusSdkRoot desde scripts/.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Desde packages/delta/<pkg>/… subir a library root. */
export function libraryRootFrom(metaUrl, upLevels) {
  let dir = dirname(fileURLToPath(metaUrl));
  for (let i = 0; i < upLevels; i++) dir = join(dir, '..');
  return dir;
}

/**
 * Carga scripts/zeus-sdk-root.cjs sin depender de un package export.
 * @param {string} libraryRoot
 */
export function loadZeusSdkRootResolver(libraryRoot) {
  return require(join(libraryRoot, 'scripts/zeus-sdk-root.cjs'));
}

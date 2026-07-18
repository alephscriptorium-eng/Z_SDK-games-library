/**
 * Resuelve la raíz del monorepo Z_SDK (engine + mesh) para deps file: y demos.
 * CJS a propósito: lo cargan launches/e2e vía createRequire.
 * Orden: ZEUS_SDK_ROOT → .deps/zeus-sdk → ../zeus-sdk → worktrees
 *
 * Siempre devuelve realpath (WP-U61 corrección): en Windows un junction
 * `.deps/zeus-sdk` hace fallar `isMain` de entrypoints mesh si se spawnea
 * con el path del enlace en vez del path real.
 */

const { existsSync, readdirSync, realpathSync } = require('node:fs');
const { dirname, join, resolve } = require('node:path');

const libraryRoot = resolve(__dirname, '..');

function looksLikeZeusSdk(root) {
  return (
    existsSync(join(root, 'packages/mesh/socket-server/package.json')) &&
    existsSync(join(root, 'packages/engine/protocol/package.json'))
  );
}

/**
 * @param {string} root
 * @returns {string}
 */
function toRealPath(root) {
  try {
    return typeof realpathSync.native === 'function'
      ? realpathSync.native(root)
      : realpathSync(root);
  } catch {
    return resolve(root);
  }
}

/**
 * @param {{ required?: boolean }} [opts]
 * @returns {string|null}
 */
function resolveZeusSdkRoot(opts = {}) {
  const required = opts.required !== false;
  const candidates = [];

  if (process.env.ZEUS_SDK_ROOT) {
    candidates.push(resolve(process.env.ZEUS_SDK_ROOT));
  }
  candidates.push(join(libraryRoot, '.deps/zeus-sdk'));
  candidates.push(join(libraryRoot, '../zeus-sdk'));

  const worktrees = join(libraryRoot, '../zeus-sdk/.worktrees');
  if (existsSync(worktrees)) {
    for (const name of readdirSync(worktrees)) {
      candidates.push(join(worktrees, name));
    }
  }

  for (const root of candidates) {
    if (looksLikeZeusSdk(root)) return toRealPath(root);
  }

  if (required) {
    throw new Error(
      [
        'No se encontró el monorepo Z_SDK (engine/mesh).',
        'Opciones:',
        '  1) export ZEUS_SDK_ROOT=/ruta/a/zeus-sdk',
        '  2) npm run setup:zeus-sdk   # enlaza .deps/zeus-sdk',
        '  3) clonar Z_SDK como hermano ../zeus-sdk'
      ].join('\n')
    );
  }
  return null;
}

module.exports = { libraryRoot, resolveZeusSdkRoot, toRealPath, looksLikeZeusSdk };

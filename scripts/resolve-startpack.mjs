/**
 * Resuelve un start pack instalado o vía ZEUS_STARTPACK_ROOT (WP-U62).
 * Usado por autoridad / demos / e2e — no hardcodea rutas absolutas.
 */

import { createRequire } from 'node:module';
import { existsSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';
import { resolveStartpackGame } from './lib/startpack-games.mjs';

const require = createRequire(import.meta.url);

/**
 * @param {string} game
 * @param {{ root?: string, env?: NodeJS.ProcessEnv }} [opts]
 */
export async function resolveInstalledStartPack(game, opts = {}) {
  const entry = resolveStartpackGame(game);
  const env = opts.env || process.env;
  const override =
    opts.root ||
    env.ZEUS_STARTPACK_ROOT ||
    (game === 'delta' ? env.ZEUS_STARTPACK_DELTA : null) ||
    (game === 'pozo' ? env.ZEUS_STARTPACK_POZO : null);

  if (override) {
    if (!existsSync(join(override, 'manifest.json'))) {
      throw new Error(`ZEUS_STARTPACK_ROOT missing manifest.json: ${override}`);
    }
    const mod = await import(pathToFileURL(join(override, 'index.mjs')).href);
    return mod.loadStartPack({ root: override });
  }

  let pkgRoot;
  try {
    pkgRoot = dirnameOf(require.resolve(`${entry.packageName}/package.json`));
  } catch {
    throw new Error(
      `${entry.packageName} not installed. npm install ${entry.packageName} ` +
        `or set ZEUS_STARTPACK_ROOT to an unpacked start pack.`
    );
  }
  const mod = await import(pathToFileURL(join(pkgRoot, 'index.mjs')).href);
  return mod.loadStartPack({ root: pkgRoot });
}

function dirnameOf(filePath) {
  return filePath.replace(/[/\\]package\.json$/, '');
}

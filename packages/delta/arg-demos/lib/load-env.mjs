import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

/** Raíz de Z_SDK-games-library (packages/delta/arg-demos/lib → ../../../../) */
export const libraryRoot = join(dirname(fileURLToPath(import.meta.url)), '../../../..');

const { resolveZeusSdkRoot } = require(join(libraryRoot, 'scripts/zeus-sdk-root.cjs'));

/** Raíz del monorepo Z_SDK (engine + mesh). Env ZEUS_SDK_ROOT o .deps/zeus-sdk. */
export const monorepoRoot = resolveZeusSdkRoot();

export function loadEnv() {
  const candidates = [
    join(libraryRoot, '.env'),
    join(monorepoRoot, '.env')
  ];
  let loaded = false;
  for (const envPath of candidates) {
    if (!existsSync(envPath)) continue;
    for (const line of readFileSync(envPath, 'utf8').split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eq = trimmed.indexOf('=');
      if (eq === -1) continue;
      const key = trimmed.slice(0, eq).trim();
      let value = trimmed.slice(eq + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!(key in process.env)) process.env[key] = value;
    }
    loaded = true;
  }
  return loaded;
}

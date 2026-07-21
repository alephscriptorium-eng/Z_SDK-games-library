/**
 * Roots para e2e de la games-library (WP-U61).
 * Juegos = este repo; mesh/socket = ZEUS_SDK_ROOT / .deps/zeus-sdk.
 */

import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);

export const libraryRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const { resolveZeusSdkRoot } = require(join(libraryRoot, 'scripts/zeus-sdk-root.cjs'));
export const sdkRoot = resolveZeusSdkRoot();

export const paths = {
  socketServer: join(sdkRoot, 'packages/mesh/socket-server/src/index.mjs'),
  cacheBrowser: join(sdkRoot, 'packages/mesh/cache-browser/src/server.mjs'),
  firehoseBrowser: join(sdkRoot, 'packages/mesh/firehose-browser/src/server.mjs'),
  deltaAuthority: join(libraryRoot, 'packages/delta/arg-demos/apps/authority/index.mjs'),
  deltaTapHorse: join(libraryRoot, 'packages/delta/arg-demos/apps/tap-horse/index.mjs'),
  deltaConsole: join(libraryRoot, 'packages/delta/arg-console/src/server.mjs'),
  deltaPlayerMcp: join(libraryRoot, 'packages/delta/arg-player-mcp/src/start.mjs'),
  deltaCasos: join(libraryRoot, 'packages/delta/spec/CASOS.md'),
  pozoAuthority: join(libraryRoot, 'packages/pozo/src/authority.mjs'),
  pozoMcp: join(libraryRoot, 'packages/pozo/src/player-mcp/start.mjs'),
  pozoRoot: join(libraryRoot, 'packages/pozo'),
  pozoCasos: join(libraryRoot, 'packages/pozo/spec/CASOS.md'),
  solveAuthority: join(libraryRoot, 'packages/solve-coagula/src/authority.mjs'),
  solveMcp: join(libraryRoot, 'packages/solve-coagula/src/player-mcp/start.mjs'),
  solveRoot: join(libraryRoot, 'packages/solve-coagula'),
  solveCasos: join(libraryRoot, 'packages/solve-coagula/spec/CASOS.md'),
  ciudadAuthority: join(libraryRoot, 'packages/ciudad/src/authority.mjs'),
  ciudadMcp: join(libraryRoot, 'packages/ciudad/src/player-mcp/start.mjs'),
  ciudadRoot: join(libraryRoot, 'packages/ciudad'),
  ciudadCasos: join(libraryRoot, 'packages/ciudad/spec/CASOS.md'),
  ciudadFederationSmoke: join(
    libraryRoot,
    'packages/ciudad/fixtures/federation-smoke.mjs'
  ),
  ciudadBarrioHorse: join(
    libraryRoot,
    'packages/ciudad/fixtures/federation/barrio-horse.mjs'
  )
};

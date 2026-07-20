#!/usr/bin/env node
/**
 * Start @zeus/cache-browser against this pack's volumes (ZEUS_VOLUMES_ROOT).
 * Open /?linea=ciudad for the city tree.
 */

import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveVolumesRoot } from '../index.mjs';

const PKG_ROOT = dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = resolve(PKG_ROOT, '../../..');

function resolveZeusSdkRoot() {
  if (process.env.ZEUS_SDK_ROOT && existsSync(process.env.ZEUS_SDK_ROOT)) {
    return resolve(process.env.ZEUS_SDK_ROOT);
  }
  const candidates = [
    join(LIBRARY_ROOT, '.deps', 'zeus-sdk'),
    join(LIBRARY_ROOT, '..', 'zeus-sdk'),
    join(LIBRARY_ROOT, '..', '..', 'zeus-sdk')
  ];
  for (const cand of candidates) {
    if (existsSync(join(cand, 'packages', 'mesh', 'cache-browser', 'src', 'server.mjs'))) {
      return cand;
    }
  }
  throw new Error(
    'Cannot find mesh monorepo. Set ZEUS_SDK_ROOT or run npm run setup:zeus-sdk from the library root.'
  );
}

const volumesRoot = resolveVolumesRoot();
const zeusRoot = resolveZeusSdkRoot();
const server = join(zeusRoot, 'packages', 'mesh', 'cache-browser', 'src', 'server.mjs');

const env = {
  ...process.env,
  ZEUS_VOLUMES_ROOT: volumesRoot
};

console.log(`[mockdatas-ciudad] ZEUS_VOLUMES_ROOT=${volumesRoot}`);
console.log(`[mockdatas-ciudad] starting cache-browser from ${server}`);
console.log(`[mockdatas-ciudad] tip: open http://localhost:3015/?linea=ciudad`);

const child = spawn(process.execPath, [server], {
  cwd: join(zeusRoot, 'packages', 'mesh', 'cache-browser'),
  env,
  stdio: 'inherit'
});

child.on('exit', (code) => process.exit(code ?? 1));

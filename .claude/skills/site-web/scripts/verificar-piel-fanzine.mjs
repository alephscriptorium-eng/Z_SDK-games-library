#!/usr/bin/env node
// Compat · alias de verificar-piel.mjs --piel fanzine (issue #15 / #18).
// Preferir: node verificar-piel.mjs --piel <familia-vp|fanzine>

import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const target = join(__dir, 'verificar-piel.mjs');
const passthrough = process.argv.slice(2);
const r = spawnSync(
  process.execPath,
  [target, '--piel', 'fanzine', ...passthrough],
  { stdio: 'inherit' }
);
process.exit(r.status ?? 1);

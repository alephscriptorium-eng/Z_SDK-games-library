#!/usr/bin/env node
/**
 * Enlaza o clona Z_SDK en .deps/zeus-sdk para overrides file: (WP-U61).
 * Retirar tras publish real de @zeus/* (U55 / ops).
 */

import { existsSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { libraryRoot, resolveZeusSdkRoot } from './zeus-sdk-root.mjs';

const depsDir = join(libraryRoot, '.deps');
const linkPath = join(depsDir, 'zeus-sdk');

function linkTo(target) {
  mkdirSync(depsDir, { recursive: true });
  if (existsSync(linkPath)) rmSync(linkPath, { recursive: true, force: true });
  const abs = resolve(target);
  try {
    symlinkSync(abs, linkPath, 'junction');
  } catch {
    symlinkSync(abs, linkPath, 'dir');
  }
  console.log(`[setup:zeus-sdk] ${relative(libraryRoot, linkPath)} → ${abs}`);
}

const existing = resolveZeusSdkRoot({ required: false });
if (existing && resolve(existing) === resolve(linkPath)) {
  console.log('[setup:zeus-sdk] .deps/zeus-sdk ya apunta a un Z_SDK válido');
  process.exit(0);
}

if (process.env.ZEUS_SDK_ROOT && existsSync(process.env.ZEUS_SDK_ROOT)) {
  linkTo(process.env.ZEUS_SDK_ROOT);
  process.exit(0);
}

const sibling = join(libraryRoot, '../zeus-sdk');
if (existsSync(join(sibling, 'packages/engine/protocol/package.json'))) {
  linkTo(sibling);
  process.exit(0);
}

if (existing) {
  linkTo(existing);
  process.exit(0);
}

if (process.env.CI === 'true' || process.env.GITHUB_ACTIONS === 'true') {
  mkdirSync(depsDir, { recursive: true });
  if (existsSync(linkPath)) rmSync(linkPath, { recursive: true, force: true });
  const r = spawnSync(
    'git',
    [
      'clone',
      '--depth',
      '1',
      '--branch',
      process.env.ZEUS_SDK_REF || 'main',
      'https://github.com/alephscriptorium-eng/Z_SDK.git',
      linkPath
    ],
    { stdio: 'inherit' }
  );
  process.exit(r.status ?? 1);
}

console.error(
  [
    '[setup:zeus-sdk] no hay ../zeus-sdk ni ZEUS_SDK_ROOT.',
    'Clona Z_SDK como hermano o exporta ZEUS_SDK_ROOT y reintenta.'
  ].join('\n')
);
process.exit(1);

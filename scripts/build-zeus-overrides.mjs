#!/usr/bin/env node
/**
 * Genera overrides file: → .deps/zeus-sdk (FALLBACK DEV, WP-U123).
 * El camino default es registry. Este script solo ayuda a re-montar un
 * puente local temporal — no lo uses en CI de install limpio.
 */

import { readdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { libraryRoot, resolveZeusSdkRoot } from './zeus-sdk-root.mjs';

const LOCAL = new Set([
  '@zeus/arg-domain',
  '@zeus/arg-feeds',
  '@zeus/arg-console',
  '@zeus/arg-demos',
  '@zeus/arg-player-mcp',
  '@zeus/pozo'
]);

const sdk = resolveZeusSdkRoot();
const overrides = {};

for (const area of ['engine', 'mesh', 'editor']) {
  const dir = join(sdk, 'packages', area);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    const pkgPath = join(dir, name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.name || LOCAL.has(pkg.name)) continue;
    if (!pkg.name.startsWith('@zeus/')) continue;
    overrides[pkg.name] = `file:.deps/zeus-sdk/packages/${area}/${name}`;
  }
}

const examples = join(sdk, 'examples');
if (existsSync(examples)) {
  for (const name of readdirSync(examples)) {
    const pkgPath = join(examples, name, 'package.json');
    if (!existsSync(pkgPath)) continue;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    if (!pkg.name?.startsWith('@zeus/') || LOCAL.has(pkg.name)) continue;
    overrides[pkg.name] = `file:.deps/zeus-sdk/examples/${name}`;
  }
}

const out = join(libraryRoot, 'zeus-file-overrides.json');
writeFileSync(out, `${JSON.stringify(overrides, null, 2)}\n`);
console.log(`[build-zeus-overrides] ${Object.keys(overrides).length} overrides → ${out}`);

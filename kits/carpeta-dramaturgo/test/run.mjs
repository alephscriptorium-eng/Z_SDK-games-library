#!/usr/bin/env node
/**
 * CA WP-U86: valida story-boards reales (si existen) + board de plantilla.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(__dirname, '..');
const validate = join(KIT, 'scripts', 'validate-story-board.mjs');

const plantillaBoard = join(KIT, 'plantilla', 'readerapp', 'story-board.json');
const toyBoard = join(KIT, 'instances', 'toy-plaza', 'readerapp', 'story-board.json');

/** @type {string[]} */
const paths = [plantillaBoard];
if (existsSync(toyBoard)) paths.push(toyBoard);

const fixtures = spawnSync(process.execPath, [validate, '--fixtures'], {
  encoding: 'utf8',
  cwd: resolve(KIT, '../..'),
});

console.log('--- fixtures (story-boards reales) ---');
process.stdout.write(fixtures.stdout || '');
process.stderr.write(fixtures.stderr || '');
if (fixtures.status !== 0) {
  console.error('CA FAIL: fixtures validation');
  process.exit(fixtures.status ?? 1);
}

console.log('--- plantilla / toy ---');
const local = spawnSync(process.execPath, [validate, ...paths], {
  encoding: 'utf8',
});
process.stdout.write(local.stdout || '');
process.stderr.write(local.stderr || '');
if (local.status !== 0) {
  console.error('CA FAIL: plantilla/toy validation');
  process.exit(local.status ?? 1);
}

console.log('🟢 test:carpeta-dramaturgo OK');

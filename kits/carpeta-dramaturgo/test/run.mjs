#!/usr/bin/env node
/**
 * CA WP-U86 + U112: valida story-boards reales + plantilla + instantiate --from.
 */
import { spawnSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, rmSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT = resolve(__dirname, '..');
const LIBRARY = resolve(KIT, '../..');
const validate = join(KIT, 'scripts', 'validate-story-board.mjs');
const instantiate = join(KIT, 'scripts', 'instantiate.mjs');

const plantillaBoard = join(KIT, 'plantilla', 'readerapp', 'story-board.json');
const toyBoard = join(KIT, 'instances', 'toy-plaza', 'readerapp', 'story-board.json');
const miniObra = join(KIT, 'fixtures', 'obra-solve-mini');
const fromMiniSlug = 'from-solve-mini';
const fromMiniBoard = join(
  KIT,
  'instances',
  fromMiniSlug,
  'readerapp',
  'story-board.json',
);

/**
 * @param {string} label
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 */
function run(label, args, opts = {}) {
  const r = spawnSync(process.execPath, args, {
    encoding: 'utf8',
    cwd: opts.cwd || LIBRARY,
  });
  process.stdout.write(r.stdout || '');
  process.stderr.write(r.stderr || '');
  if (r.status !== 0) {
    console.error(`CA FAIL: ${label}`);
    process.exit(r.status ?? 1);
  }
  return r;
}

const fixtures = spawnSync(process.execPath, [validate, '--fixtures'], {
  encoding: 'utf8',
  cwd: LIBRARY,
});

console.log('--- fixtures (story-boards reales) ---');
process.stdout.write(fixtures.stdout || '');
process.stderr.write(fixtures.stderr || '');
if (fixtures.status !== 0) {
  console.error('CA FAIL: fixtures validation');
  process.exit(fixtures.status ?? 1);
}

console.log('--- plantilla / toy ---');
/** @type {string[]} */
const paths = [plantillaBoard];
if (existsSync(toyBoard)) paths.push(toyBoard);
run('plantilla/toy validation', [validate, ...paths]);

console.log('--- instantiate --from (obra mini hermética) ---');
if (!existsSync(miniObra)) {
  console.error(`CA FAIL: missing hermetic obra ${miniObra}`);
  process.exit(1);
}
run('instantiate --from mini', [
  instantiate,
  '--slug',
  fromMiniSlug,
  '--from',
  miniObra,
  '--title',
  'From Solve Mini',
  '--force',
]);

if (!existsSync(fromMiniBoard)) {
  console.error(`CA FAIL: missing board after --from: ${fromMiniBoard}`);
  process.exit(1);
}
run('validate from-solve-mini', [validate, fromMiniBoard]);

const board = JSON.parse(readFileSync(fromMiniBoard, 'utf8'));
if (!Array.isArray(board.acts) || board.acts.length < 1) {
  console.error('CA FAIL: from-solve-mini board has no acts');
  process.exit(1);
}
const origin = join(KIT, 'instances', fromMiniSlug, 'ORIGIN.md');
if (!existsSync(origin)) {
  console.error('CA FAIL: missing ORIGIN.md on --from instance');
  process.exit(1);
}

// Live slug path when sibling network-games exists (optional, still CA-relevant).
const liveSolveCandidates = [
  resolve(LIBRARY, '../scriptorium-network-games/SOLVE_ET_COAGULA'),
  resolve(LIBRARY, '../../scriptorium-network-games/SOLVE_ET_COAGULA'),
  resolve(LIBRARY, '../../../scriptorium-network-games/SOLVE_ET_COAGULA'),
];
const liveSolve = liveSolveCandidates.find((p) => existsSync(p));
if (liveSolve) {
  console.log('--- instantiate --from SOLVE_ET_COAGULA (live sibling) ---');
  const liveSlug = 'from-solve-live';
  const liveInst = join(KIT, 'instances', liveSlug);
  run('instantiate --from SOLVE_ET_COAGULA', [
    instantiate,
    '--slug',
    liveSlug,
    '--from',
    'SOLVE_ET_COAGULA',
    '--force',
  ]);
  const liveBoard = join(liveInst, 'readerapp', 'story-board.json');
  run('validate from-solve-live', [validate, liveBoard]);
  // No commitear copia completa de SOLVE; limpiar tras CA.
  rmSync(liveInst, { recursive: true, force: true });
  console.log(`   cleaned ${liveSlug} (live overlay; not kept in tree)`);
} else {
  console.log(
    '--- skip live SOLVE_ET_COAGULA (sibling scriptorium-network-games absent) ---',
  );
}

console.log('🟢 test:carpeta-dramaturgo OK');

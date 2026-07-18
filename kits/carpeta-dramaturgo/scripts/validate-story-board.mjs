#!/usr/bin/env node
/**
 * Valida story-board.json contra schema/story-board.schema.json (AJV).
 * El schema es la fuente de verdad (WP-U115); dialectos históricos:
 * SOLVE = acts[].widgets; ALEPH = acts + blocks[].uichain.widgets.
 *
 * Uso:
 *   node validate-story-board.mjs <path.json> [<path.json> ...]
 *   node validate-story-board.mjs --fixtures
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import Ajv2020Module from 'ajv/dist/2020.js';

const Ajv2020 = Ajv2020Module.default ?? Ajv2020Module;

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = join(KIT_ROOT, 'schema', 'story-board.schema.json');

const ACT_ID = /^act-[0-9]+$/;

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/** @type {import('ajv').ValidateFunction | null} */
let rootValidate = null;
/** @type {import('ajv').ValidateFunction | null} */
let solveValidate = null;
/** @type {import('ajv').ValidateFunction | null} */
let alephValidate = null;
/** @type {string | null} */
let schemaLoadError = null;

/**
 * Compila el schema raíz (oneOf) y cada dialecto para errores claros.
 * @returns {{ ok: true } | { ok: false, errors: string[] }}
 */
function ensureCompiled() {
  if (rootValidate) return { ok: true };
  if (schemaLoadError) {
    return { ok: false, errors: [schemaLoadError] };
  }
  if (!existsSync(SCHEMA_PATH)) {
    schemaLoadError = `schema missing or unreadable: ${SCHEMA_PATH}`;
    return { ok: false, errors: [schemaLoadError] };
  }
  let schema;
  try {
    schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf8'));
  } catch (e) {
    schemaLoadError = `schema JSON parse: ${e.message}`;
    return { ok: false, errors: [schemaLoadError] };
  }
  const ajv = new Ajv2020({
    allErrors: true,
    strict: false,
    validateFormats: false,
  });
  rootValidate = ajv.compile(schema);
  const defs = schema.$defs ?? {};
  solveValidate = ajv.compile({
    $schema: schema.$schema,
    $defs: defs,
    ...defs.dialectSolve,
  });
  alephValidate = ajv.compile({
    $schema: schema.$schema,
    $defs: defs,
    ...defs.dialectAleph,
  });
  return { ok: true };
}

/**
 * @param {import('ajv').ErrorObject[] | null | undefined} errors
 * @returns {string[]}
 */
function formatAjvErrors(errors) {
  if (!errors?.length) return ['schema validation failed'];
  /** @type {string[]} */
  const out = [];
  const seen = new Set();
  for (const e of errors) {
    const path = e.instancePath || '(root)';
    const detail =
      e.keyword === 'pattern' && e.params?.pattern
        ? `${e.message} (${e.params.pattern})`
        : e.keyword === 'required' && e.params?.missingProperty
          ? `must have required property '${e.params.missingProperty}'`
          : e.message || e.keyword;
    const line = `${path}: ${detail}`;
    if (seen.has(line)) continue;
    seen.add(line);
    out.push(line);
  }
  return out;
}

/**
 * Dialecto probable para mensajes (no sustituye oneOf del schema).
 * @param {unknown} board
 * @returns {'aleph-blocks' | 'solve-inline'}
 */
function preferredDialect(board) {
  if (isObj(board) && Array.isArray(board.blocks)) return 'aleph-blocks';
  return 'solve-inline';
}

/**
 * Semántica que JSON Schema no expresa: block.act → act id conocido.
 * @param {Record<string, unknown>} board
 * @returns {string[]}
 */
function semanticAlephActRefs(board) {
  /** @type {string[]} */
  const errors = [];
  /** @type {Set<string>} */
  const actIds = new Set();
  if (Array.isArray(board.acts)) {
    for (const act of board.acts) {
      if (isObj(act) && typeof act.id === 'string' && ACT_ID.test(act.id)) {
        actIds.add(act.id);
      }
    }
  }
  if (!Array.isArray(board.blocks)) return errors;
  for (let i = 0; i < board.blocks.length; i++) {
    const block = board.blocks[i];
    if (!isObj(block)) continue;
    if (typeof block.act === 'string' && ACT_ID.test(block.act) && !actIds.has(block.act)) {
      errors.push(`blocks[${i}].act: unknown act id ${block.act}`);
    }
  }
  return errors;
}

/**
 * @param {Record<string, unknown>} board
 * @param {'solve-inline' | 'aleph-blocks'} dialect
 * @returns {Map<string, string[]>}
 */
function buildActsToWidgets(board, dialect) {
  /** @type {Map<string, string[]>} */
  const actsToWidgets = new Map();
  if (dialect === 'solve-inline') {
    for (const act of /** @type {unknown[]} */ (board.acts)) {
      if (!isObj(act) || typeof act.id !== 'string') continue;
      const widgets = Array.isArray(act.widgets)
        ? act.widgets.filter((w) => typeof w === 'string')
        : [];
      actsToWidgets.set(act.id, /** @type {string[]} */ (widgets));
    }
    return actsToWidgets;
  }
  for (const act of /** @type {unknown[]} */ (board.acts)) {
    if (isObj(act) && typeof act.id === 'string') {
      actsToWidgets.set(act.id, []);
    }
  }
  for (const block of /** @type {unknown[]} */ (board.blocks ?? [])) {
    if (!isObj(block) || typeof block.act !== 'string') continue;
    if (!isObj(block.uichain) || !Array.isArray(block.uichain.widgets)) continue;
    if (!actsToWidgets.has(block.act)) continue;
    const merged = actsToWidgets.get(block.act);
    for (const w of block.uichain.widgets) {
      if (typeof w === 'string' && !merged.includes(w)) merged.push(w);
    }
  }
  return actsToWidgets;
}

/**
 * @param {unknown} board
 * @returns {{ ok: true, dialect: string, actsToWidgets: Map<string, string[]> } | { ok: false, errors: string[] }}
 */
export function validateStoryBoard(board) {
  const compiled = ensureCompiled();
  if (!compiled.ok) return compiled;

  const ok = /** @type {boolean} */ (rootValidate(board));
  if (!ok) {
    const dialect = preferredDialect(board);
    const dialectFn = dialect === 'aleph-blocks' ? alephValidate : solveValidate;
    dialectFn(board);
    return {
      ok: false,
      errors: formatAjvErrors(dialectFn.errors),
    };
  }

  if (!isObj(board)) {
    return { ok: false, errors: ['(root): must be object'] };
  }

  const dialect = preferredDialect(board);
  if (dialect === 'aleph-blocks') {
    const semantic = semanticAlephActRefs(board);
    if (semantic.length) return { ok: false, errors: semantic };
  }

  return {
    ok: true,
    dialect,
    actsToWidgets: buildActsToWidgets(board, dialect),
  };
}

/**
 * @param {string} path
 */
export function validateStoryBoardFile(path) {
  const abs = resolve(path);
  if (!existsSync(abs)) {
    return { ok: false, path: abs, errors: [`file not found: ${abs}`] };
  }
  let board;
  try {
    board = JSON.parse(readFileSync(abs, 'utf8'));
  } catch (e) {
    return { ok: false, path: abs, errors: [`JSON parse: ${e.message}`] };
  }
  const result = validateStoryBoard(board);
  return { ...result, path: abs };
}

function defaultFixtures() {
  const hermetic = [
    join(KIT_ROOT, 'fixtures', 'solve-coagula-story-board.json'),
    join(KIT_ROOT, 'fixtures', 'aleph-et-omega-story-board.json'),
  ].filter((c) => existsSync(c));
  if (hermetic.length >= 2) return hermetic;

  const live = [
    resolve(
      KIT_ROOT,
      '../../../scriptorium-network-games/SOLVE_ET_COAGULA/readerapp/solve-coagula-story-board.json',
    ),
    resolve(
      KIT_ROOT,
      '../../../scriptorium-network-games/ALEPH_ET_OMEGA/readerapp/aleph-et-omega-story-board.json',
    ),
  ].filter((c) => existsSync(c));
  return [...hermetic, ...live.filter((c) => !hermetic.includes(c))];
}

function main(argv) {
  const compiled = ensureCompiled();
  if (!compiled.ok) {
    for (const e of compiled.errors) console.error(e);
    process.exit(2);
  }

  let paths = argv.filter((a) => !a.startsWith('--'));
  if (argv.includes('--fixtures') || paths.length === 0) {
    paths = defaultFixtures();
    if (paths.length === 0) {
      console.error(
        'No fixture story-boards found. Pass paths explicitly or clone scriptorium-network-games as sibling of SCRIPTORIUM_V0.',
      );
      process.exit(2);
    }
  }

  let failed = 0;
  for (const p of paths) {
    const r = validateStoryBoardFile(p);
    if (r.ok) {
      const summary = [...r.actsToWidgets.entries()]
        .map(([id, ws]) => `${id}→[${ws.join(',')}]`)
        .join('; ');
      console.log(`✅ ${r.path}`);
      console.log(`   dialect=${r.dialect}  ${summary}`);
    } else {
      failed += 1;
      console.error(`❌ ${r.path}`);
      for (const e of r.errors) console.error(`   - ${e}`);
    }
  }
  process.exit(failed ? 1 : 0);
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2));
}

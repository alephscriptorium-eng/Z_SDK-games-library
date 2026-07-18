#!/usr/bin/env node
/**
 * Valida story-board.json contra el contrato actos→widgets (WP-U86).
 * Sin dependencia externa: comprueba la forma de ambos dialectos
 * (SOLVE = acts[].widgets; ALEPH = acts + blocks[].uichain.widgets).
 *
 * Uso:
 *   node validate-story-board.mjs <path.json> [<path.json> ...]
 *   node validate-story-board.mjs --fixtures   # boards reales si hay path
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, '..');
const SCHEMA_PATH = join(KIT_ROOT, 'schema', 'story-board.schema.json');

const ACT_ID = /^act-[0-9]+$/;
const WIDGET_ID = /^[a-z][a-z0-9-]*$/;

/**
 * @param {unknown} v
 * @returns {v is Record<string, unknown>}
 */
function isObj(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}

/**
 * @param {unknown} board
 * @returns {{ ok: true, dialect: string, actsToWidgets: Map<string, string[]> } | { ok: false, errors: string[] }}
 */
export function validateStoryBoard(board) {
  const errors = [];
  if (!isObj(board)) {
    return { ok: false, errors: ['root must be an object'] };
  }
  if (!Array.isArray(board.acts) || board.acts.length < 1) {
    return { ok: false, errors: ['acts: required non-empty array'] };
  }

  const hasBlocks = Array.isArray(board.blocks);
  if (hasBlocks) {
    return validateAleph(board, errors);
  }
  return validateSolve(board, errors);
}

/**
 * @param {Record<string, unknown>} board
 * @param {string[]} errors
 */
function validateSolve(board, errors) {
  /** @type {Map<string, string[]>} */
  const actsToWidgets = new Map();
  for (let i = 0; i < board.acts.length; i++) {
    const act = board.acts[i];
    const prefix = `acts[${i}]`;
    if (!isObj(act)) {
      errors.push(`${prefix}: must be object`);
      continue;
    }
    if (typeof act.id !== 'string' || !ACT_ID.test(act.id)) {
      errors.push(`${prefix}.id: must match act-N`);
    }
    if (!Array.isArray(act.widgets) || act.widgets.length < 1) {
      errors.push(`${prefix}.widgets: required non-empty array`);
    } else {
      for (let j = 0; j < act.widgets.length; j++) {
        const w = act.widgets[j];
        if (typeof w !== 'string' || !WIDGET_ID.test(w)) {
          errors.push(`${prefix}.widgets[${j}]: invalid widget id`);
        }
      }
      if (typeof act.id === 'string') {
        actsToWidgets.set(act.id, /** @type {string[]} */ (act.widgets));
      }
    }
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, dialect: 'solve-inline', actsToWidgets };
}

/**
 * @param {Record<string, unknown>} board
 * @param {string[]} errors
 */
function validateAleph(board, errors) {
  /** @type {Map<string, string[]>} */
  const actsToWidgets = new Map();
  /** @type {Set<string>} */
  const actIds = new Set();

  for (let i = 0; i < board.acts.length; i++) {
    const act = board.acts[i];
    const prefix = `acts[${i}]`;
    if (!isObj(act)) {
      errors.push(`${prefix}: must be object`);
      continue;
    }
    if (typeof act.id !== 'string' || !ACT_ID.test(act.id)) {
      errors.push(`${prefix}.id: must match act-N`);
    } else {
      actIds.add(act.id);
      actsToWidgets.set(act.id, []);
    }
    if (!Array.isArray(act.blocks) || act.blocks.length < 1) {
      errors.push(`${prefix}.blocks: required non-empty array of numbers`);
    }
  }

  if (!Array.isArray(board.blocks) || board.blocks.length < 1) {
    errors.push('blocks: required non-empty array');
  } else {
    for (let i = 0; i < board.blocks.length; i++) {
      const block = board.blocks[i];
      const prefix = `blocks[${i}]`;
      if (!isObj(block)) {
        errors.push(`${prefix}: must be object`);
        continue;
      }
      if (typeof block.n !== 'number' && typeof block.n !== 'string') {
        errors.push(`${prefix}.n: required`);
      }
      if (typeof block.act !== 'string' || !ACT_ID.test(block.act)) {
        errors.push(`${prefix}.act: must match act-N`);
      } else if (!actIds.has(block.act)) {
        errors.push(`${prefix}.act: unknown act id ${block.act}`);
      }
      if (!isObj(block.uichain)) {
        errors.push(`${prefix}.uichain: required object`);
      } else {
        const widgets = block.uichain.widgets;
        if (!Array.isArray(widgets) || widgets.length < 1) {
          errors.push(`${prefix}.uichain.widgets: required non-empty array`);
        } else {
          for (let j = 0; j < widgets.length; j++) {
            const w = widgets[j];
            if (typeof w !== 'string' || !WIDGET_ID.test(w)) {
              errors.push(`${prefix}.uichain.widgets[${j}]: invalid widget id`);
            }
          }
          if (typeof block.act === 'string' && actsToWidgets.has(block.act)) {
            const merged = actsToWidgets.get(block.act);
            for (const w of widgets) {
              if (typeof w === 'string' && !merged.includes(w)) merged.push(w);
            }
          }
        }
      }
    }
  }

  if (errors.length) return { ok: false, errors };
  return { ok: true, dialect: 'aleph-blocks', actsToWidgets };
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
  // Prefer hermetic copies under kits/carpeta-dramaturgo/fixtures/.
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
  // touch schema so CA can cite it exists
  if (!existsSync(SCHEMA_PATH)) {
    console.error(`schema missing: ${SCHEMA_PATH}`);
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

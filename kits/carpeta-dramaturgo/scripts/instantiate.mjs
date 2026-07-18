#!/usr/bin/env node
/**
 * Instancia un juego narrativo desde la CARPETA DRAMATURGO (WP-U86 / U112).
 * Escribe SOLO bajo kits/carpeta-dramaturgo/instances/<slug>/.
 *
 * Fuentes (tabla — PRACTICAS §1.2):
 *   plantilla  — sin --from: plantilla vacía parametrizada
 *   obra       — --from <slug|path>: overlay de dramaturgia real
 *
 * Uso:
 *   node instantiate.mjs --slug toy-plaza --title "Plaza de juguete"
 *   node instantiate.mjs --slug from-solve --from SOLVE_ET_COAGULA --force
 *   node instantiate.mjs --slug from-aleph --from ALEPH_ET_OMEGA --force
 *   node instantiate.mjs --slug from-path --from /abs/path/to/obra --force
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, '..');
const PLANTILLA = join(KIT_ROOT, 'plantilla');
const INSTANCES = join(KIT_ROOT, 'instances');
const LIBRARY_ROOT = resolve(KIT_ROOT, '../..');
const SCRIPTORIUM_V0 = resolve(LIBRARY_ROOT, '..');

/** Capas de dramaturgia que se overlayan desde una obra fuente. */
const DRAMATURGY_DIRS = Object.freeze([
  'blockchain',
  'agentchain',
  'uichain',
  'readerapp',
]);

/**
 * Obras documentadas (slug → resolver). Alias → clave canónica.
 * @type {Record<string, { id: string, dirName: string, storyBoardCandidates: string[] }>}
 */
const KNOWN_OBRAS = Object.freeze({
  SOLVE_ET_COAGULA: {
    id: 'SOLVE_ET_COAGULA',
    dirName: 'SOLVE_ET_COAGULA',
    storyBoardCandidates: [
      'readerapp/story-board.json',
      'readerapp/solve-coagula-story-board.json',
    ],
  },
  ALEPH_ET_OMEGA: {
    id: 'ALEPH_ET_OMEGA',
    dirName: 'ALEPH_ET_OMEGA',
    storyBoardCandidates: [
      'readerapp/story-board.json',
      'readerapp/aleph-et-omega-story-board.json',
    ],
  },
});

/** @type {Record<string, string>} */
const OBRA_ALIASES = Object.freeze({
  SOLVE_ET_COAGULA: 'SOLVE_ET_COAGULA',
  'solve-et-coagula': 'SOLVE_ET_COAGULA',
  solve: 'SOLVE_ET_COAGULA',
  ALEPH_ET_OMEGA: 'ALEPH_ET_OMEGA',
  'aleph-et-omega': 'ALEPH_ET_OMEGA',
  aleph: 'ALEPH_ET_OMEGA',
});

/**
 * @param {string[]} argv
 */
function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const out = { force: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--force') out.force = true;
    else if (a === '--slug') out.slug = argv[++i];
    else if (a === '--title') out.title = argv[++i];
    else if (a === '--theme') out.theme = argv[++i];
    else if (a === '--from') out.from = argv[++i];
    else if (a === '--reic-r') out.reicR = argv[++i];
    else if (a === '--reic-e') out.reicE = argv[++i];
    else if (a === '--reic-i') out.reicI = argv[++i];
    else if (a === '--reic-c') out.reicC = argv[++i];
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

/**
 * @param {string} dir
 * @param {(rel: string, abs: string) => void} visit
 * @param {string} [base]
 */
function walkFiles(dir, visit, base = dir) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name);
    if (statSync(abs).isDirectory()) walkFiles(abs, visit, base);
    else visit(relative(base, abs).replace(/\\/g, '/'), abs);
  }
}

/**
 * @param {string} text
 * @param {Record<string, string>} vars
 */
function fill(text, vars) {
  return text.replace(/\{\{([A-Z0-9_]+)\}\}/g, (_, key) =>
    Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : `{{${key}}}`,
  );
}

/**
 * Raíces candidatas para scriptorium-network-games (sin hardcode de drive).
 * Sube desde el kit hasta encontrar un sibling `scriptorium-network-games`
 * (válido en clone principal y en `.worktrees/wp-*`).
 * @returns {string[]}
 */
function networkGamesRoots() {
  /** @type {string[]} */
  const roots = [];
  const env = process.env.ZEUS_NETWORK_GAMES || process.env.SCRIPTORIUM_NETWORK_GAMES;
  if (env) roots.push(resolve(env));

  let cur = KIT_ROOT;
  for (let i = 0; i < 10; i++) {
    const parent = dirname(cur);
    if (parent === cur) break;
    const sibling = join(parent, 'scriptorium-network-games');
    roots.push(sibling);
    cur = parent;
  }
  roots.push(join(SCRIPTORIUM_V0, 'scriptorium-network-games'));
  roots.push(resolve(LIBRARY_ROOT, '../scriptorium-network-games'));

  return [...new Set(roots)];
}

/**
 * @param {string} fromArg
 * @returns {{ kind: 'obra', id: string, root: string, storyBoardCandidates: string[] }}
 */
function resolveObraSource(fromArg) {
  const raw = String(fromArg).trim();
  if (!raw) {
    throw new Error('--from requiere slug documentado o path a una obra');
  }

  const aliasKey = OBRA_ALIASES[raw] || OBRA_ALIASES[raw.toUpperCase()];
  if (aliasKey && KNOWN_OBRAS[aliasKey]) {
    const meta = KNOWN_OBRAS[aliasKey];
    for (const netRoot of networkGamesRoots()) {
      const candidate = join(netRoot, meta.dirName);
      if (existsSync(candidate) && statSync(candidate).isDirectory()) {
        return {
          kind: 'obra',
          id: meta.id,
          root: candidate,
          storyBoardCandidates: meta.storyBoardCandidates,
        };
      }
    }
    throw new Error(
      `obra conocida «${meta.id}» no encontrada bajo scriptorium-network-games ` +
        `(probado: ${networkGamesRoots().join(', ')}). ` +
        `Pasa un path absoluto o define ZEUS_NETWORK_GAMES.`,
    );
  }

  const asPath = isAbsolute(raw) ? resolve(raw) : resolve(process.cwd(), raw);
  if (!existsSync(asPath) || !statSync(asPath).isDirectory()) {
    const known = Object.keys(KNOWN_OBRAS).join(', ');
    throw new Error(
      `--from «${raw}» no es un path de obra ni un slug conocido (${known}).`,
    );
  }

  /** @type {string[]} */
  const storyBoardCandidates = ['readerapp/story-board.json'];
  const readerapp = join(asPath, 'readerapp');
  if (existsSync(readerapp) && statSync(readerapp).isDirectory()) {
    for (const n of readdirSync(readerapp)) {
      if (n.endsWith('-story-board.json')) {
        storyBoardCandidates.push(`readerapp/${n}`);
      }
    }
  }

  return {
    kind: 'obra',
    id: raw,
    root: asPath,
    storyBoardCandidates,
  };
}

/**
 * Tabla de fuentes: plantilla | obra.
 * @param {string | undefined} fromArg
 */
function resolveSource(fromArg) {
  if (!fromArg) {
    return {
      kind: 'plantilla',
      id: 'plantilla',
      root: PLANTILLA,
      storyBoardCandidates: ['readerapp/story-board.json'],
    };
  }
  return resolveObraSource(fromArg);
}

/**
 * @param {string} obraRoot
 * @param {string[]} candidates
 * @returns {string | null}
 */
function findStoryBoard(obraRoot, candidates) {
  for (const rel of candidates) {
    const abs = join(obraRoot, rel);
    if (existsSync(abs)) return abs;
  }
  const readerapp = join(obraRoot, 'readerapp');
  if (!existsSync(readerapp)) return null;
  for (const name of readdirSync(readerapp)) {
    if (name === 'story-board.json' || name.endsWith('-story-board.json')) {
      return join(readerapp, name);
    }
  }
  return null;
}

/**
 * Overlay dramaturgia: copia dirs de obra sobre destino (read-only sobre fuente).
 * @param {string} obraRoot
 * @param {string} dest
 * @param {string[]} candidates
 */
function overlayDramaturgy(obraRoot, dest, candidates) {
  for (const dir of DRAMATURGY_DIRS) {
    const src = join(obraRoot, dir);
    if (!existsSync(src)) continue;
    const target = join(dest, dir);
    if (existsSync(target)) rmSync(target, { recursive: true, force: true });
    cpSync(src, target, { recursive: true });
  }

  const boardSrc = findStoryBoard(obraRoot, candidates);
  if (!boardSrc) {
    throw new Error(
      `no story-board en obra ${obraRoot} (buscado: ${candidates.join(', ')})`,
    );
  }
  const boardDestDir = join(dest, 'readerapp');
  mkdirSync(boardDestDir, { recursive: true });
  const boardDest = join(boardDestDir, 'story-board.json');
  cpSync(boardSrc, boardDest);

  // Quitar nombres de story-board de la obra (dejar solo story-board.json).
  for (const name of readdirSync(boardDestDir)) {
    if (name !== 'story-board.json' && name.endsWith('-story-board.json')) {
      rmSync(join(boardDestDir, name), { force: true });
    }
  }

  return boardDest;
}

/**
 * @param {Record<string, string>} vars
 * @param {{ kind: string, id: string, root: string }} source
 * @param {string} dest
 */
function writeOriginNote(vars, source, dest) {
  const body = `# Origen de la instancia

| Campo | Valor |
|-------|-------|
| Slug | \`${vars.SLUG}\` |
| Fuente | \`${source.kind}\` · \`${source.id}\` |
| Root fuente (lectura) | \`${source.root}\` |
| Fecha | ${vars.DATE} |

Esta instancia es una **copia confinada**. Los originales en
\`scriptorium-network-games/\` (si aplica) **no se modifican**.
`;
  writeFileSync(join(dest, 'ORIGIN.md'), body, 'utf8');
}

/**
 * @param {string} dest
 * @param {Record<string, string>} vars
 */
function fillPlaceholders(dest, vars) {
  const textExt = new Set(['.md', '.json', '.txt', '.yml', '.yaml']);
  walkFiles(dest, (_rel, abs) => {
    const ext = abs.slice(abs.lastIndexOf('.'));
    if (!textExt.has(ext)) return;
    const raw = readFileSync(abs, 'utf8');
    if (!raw.includes('{{')) return;
    writeFileSync(abs, fill(raw, vars), 'utf8');
  });
}

/**
 * @param {string[]} argv
 * @returns {{ dest: string, source: { kind: string, id: string, root: string }, board?: string }}
 */
export function instantiate(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.slug) {
    const msg = `Usage: node instantiate.mjs --slug <slug> [options]

Options:
  --from <obra>     Slug documentado (SOLVE_ET_COAGULA | ALEPH_ET_OMEGA)
                    o path a una obra con blockchain/readerapp/uichain
  --title <str>     Título del juego (default: slug humanizado)
  --theme <str>     Tema / corpus (default: genérico o título de obra)
  --reic-r|e|i|c    Etiquetas de ejes REIC (defaults genéricos)
  --force           Sobrescribe instances/<slug> si existe

Fuentes (tabla):
  plantilla  — sin --from (plantilla vacía)
  obra       — --from <slug|path> (overlay dramaturgia real)

Escribe SOLO bajo kits/carpeta-dramaturgo/instances/<slug>/`;
    if (args.help) {
      console.log(msg);
      return { dest: '', source: { kind: 'help', id: 'help', root: '' } };
    }
    console.error(msg);
    process.exitCode = 2;
    throw new Error('missing --slug');
  }

  const slug = String(args.slug);
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    throw new Error('slug must match ^[a-z][a-z0-9-]*$');
  }

  const source = resolveSource(
    typeof args.from === 'string' ? args.from : undefined,
  );

  const title =
    typeof args.title === 'string'
      ? args.title
      : slug
          .split('-')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
  const theme =
    typeof args.theme === 'string'
      ? args.theme
      : source.kind === 'obra'
        ? `instancia desde obra ${source.id}`
        : 'un tema narrativo de juguete (sustituye por tu corpus)';
  const today = new Date().toISOString().slice(0, 10);

  /** @type {Record<string, string>} */
  const vars = {
    SLUG: slug,
    TITLE: title,
    THEME: theme,
    DATE: today,
    REIC_R: typeof args.reicR === 'string' ? args.reicR : 'Ritmo / Representación',
    REIC_E: typeof args.reicE === 'string' ? args.reicE : 'Estrategia / Estado',
    REIC_I: typeof args.reicI === 'string' ? args.reicI : 'Interacción',
    REIC_C: typeof args.reicC === 'string' ? args.reicC : 'Corpus / Continuidad',
    REIC_R_HINT: 'qué mide el eje R en este juego',
    REIC_E_HINT: 'qué mide el eje E en este juego',
    REIC_I_HINT: 'qué mide el eje I en este juego',
    REIC_C_HINT: 'qué mide el eje C en este juego',
  };

  if (!existsSync(PLANTILLA)) {
    throw new Error(`plantilla missing: ${PLANTILLA}`);
  }

  mkdirSync(INSTANCES, { recursive: true });
  const dest = join(INSTANCES, slug);
  if (existsSync(dest)) {
    if (!args.force) {
      throw new Error(`exists: ${dest} (use --force)`);
    }
    rmSync(dest, { recursive: true, force: true });
  }
  mkdirSync(dest, { recursive: true });

  // 1) Base siempre desde plantilla (esqueleto + STUBS/EPISTEM).
  cpSync(PLANTILLA, dest, { recursive: true });
  fillPlaceholders(dest, vars);

  let board;
  if (source.kind === 'obra') {
    // 2) Overlay dramaturgia real (fuente solo lectura).
    board = overlayDramaturgy(
      source.root,
      dest,
      source.storyBoardCandidates,
    );
  } else {
    board = join(dest, 'readerapp', 'story-board.json');
  }

  writeOriginNote(vars, source, dest);

  return { dest, source, board };
}

function main(argv) {
  try {
    const args = parseArgs(argv);
    if (args.help) {
      instantiate(['--help']);
      process.exit(0);
    }
    const { dest, source, board } = instantiate(argv);
    console.log(`✅ instancia creada: ${dest}`);
    console.log(`   fuente=${source.kind}:${source.id}`);
    if (board) console.log(`   story-board=${board}`);
    console.log(
      `   (solo archivos bajo instances/ — originales de obra intactos)`,
    );
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(typeof process.exitCode === 'number' ? process.exitCode : 1);
  }
}

const isMain =
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  main(process.argv.slice(2));
}

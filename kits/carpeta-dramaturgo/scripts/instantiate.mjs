#!/usr/bin/env node
/**
 * Instancia un juego narrativo juguete desde la plantilla CARPETA DRAMATURGO.
 * Solo escribe dentro de kits/carpeta-dramaturgo/instances/<slug>/ (CA WP-U86).
 *
 * Uso:
 *   node instantiate.mjs --slug toy-plaza --title "Plaza de juguete" --theme "una plaza pública"
 *   node instantiate.mjs --slug toy-plaza --force
 */

import {
  cpSync,
  existsSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const KIT_ROOT = resolve(__dirname, '..');
const PLANTILLA = join(KIT_ROOT, 'plantilla');
const INSTANCES = join(KIT_ROOT, 'instances');

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

function main(argv) {
  const args = parseArgs(argv);
  if (args.help || !args.slug) {
    console.log(`Usage: node instantiate.mjs --slug <slug> [options]

Options:
  --title <str>     Título del juego (default: slug humanizado)
  --theme <str>     Tema / corpus (default: genérico)
  --reic-r|e|i|c    Etiquetas de ejes REIC (defaults genéricos)
  --force           Sobrescribe instances/<slug> si existe

Escribe SOLO bajo kits/carpeta-dramaturgo/instances/<slug>/`);
    process.exit(args.help ? 0 : 2);
  }

  const slug = String(args.slug);
  if (!/^[a-z][a-z0-9-]*$/.test(slug)) {
    console.error('slug must match ^[a-z][a-z0-9-]*$');
    process.exit(2);
  }

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
    console.error(`plantilla missing: ${PLANTILLA}`);
    process.exit(2);
  }

  mkdirSync(INSTANCES, { recursive: true });
  const dest = join(INSTANCES, slug);
  if (existsSync(dest)) {
    if (!args.force) {
      console.error(`exists: ${dest} (use --force)`);
      process.exit(2);
    }
  } else {
    mkdirSync(dest, { recursive: true });
  }

  // copy tree then fill placeholders in text files
  cpSync(PLANTILLA, dest, { recursive: true });

  const textExt = new Set(['.md', '.json', '.txt', '.yml', '.yaml']);
  walkFiles(dest, (_rel, abs) => {
    const ext = abs.slice(abs.lastIndexOf('.'));
    if (!textExt.has(ext)) return;
    const raw = readFileSync(abs, 'utf8');
    if (!raw.includes('{{')) return;
    writeFileSync(abs, fill(raw, vars), 'utf8');
  });

  // rename story-board if template used generic name
  console.log(`✅ instancia creada: ${dest}`);
  console.log(`   título=${title}`);
  console.log(`   (solo archivos bajo instances/${slug}/ — nada fuera del kit)`);
}

main(process.argv.slice(2));

/**
 * Build-time census loader for barrio `estado`.
 *
 * Authoritative source (sprint cantera): cantera/CIUDAD/CENSO-ESTADOS.md
 * Default pack projection: ../data/censo-estados.json
 *
 * Does not read TEMP/ or external dossier drafts.
 * Runtime never calls this — only generate-seeds / build scripts.
 */

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const DEFAULT_CENSO_JSON = join(HERE, '..', 'data', 'censo-estados.json');

/** @typedef {'vivo'|'latente'|'muerto'|'roto'} BarrioEstado */

const ALLOWED = new Set(['vivo', 'latente', 'muerto', 'roto']);

/**
 * Parse markdown table from cantera/CIUDAD/CENSO-ESTADOS.md
 * Expects columns: id | slug | displayName | distrito | estado
 * @param {string} text
 * @returns {Record<string, { slug: string, displayName: string, distrito: string, estado: BarrioEstado }>}
 */
export function parseCensoMarkdown(text) {
  /** @type {Record<string, { slug: string, displayName: string, distrito: string, estado: BarrioEstado }>} */
  const barrios = {};
  for (const line of text.split(/\r?\n/)) {
    if (!line.startsWith('|')) continue;
    const cells = line
      .split('|')
      .slice(1, -1)
      .map((c) => c.trim());
    if (cells.length < 5) continue;
    if (cells[0] === 'id' || cells[0].startsWith('-')) continue;
    const [id, slug, displayName, distrito, estado] = cells;
    if (!ALLOWED.has(estado)) {
      throw new Error(`invalid estado "${estado}" for barrio ${id}`);
    }
    barrios[id] = {
      slug,
      displayName,
      distrito,
      estado: /** @type {BarrioEstado} */ (estado)
    };
  }
  return barrios;
}

/**
 * @param {string} [path]
 * @returns {{
 *   source: string,
 *   barrios: Record<string, { slug?: string, displayName?: string, distrito?: string, estado: BarrioEstado }>
 * }}
 */
export function loadCensoEstados(path = DEFAULT_CENSO_JSON) {
  if (!existsSync(path)) {
    throw new Error(`censo not found: ${path}`);
  }
  const raw = readFileSync(path, 'utf8');
  const ext = extname(path).toLowerCase();

  if (ext === '.md') {
    const barrios = parseCensoMarkdown(raw);
    return { source: 'cantera/CIUDAD/CENSO-ESTADOS.md', barrios };
  }

  const json = JSON.parse(raw);
  if (!json.barrios || typeof json.barrios !== 'object') {
    throw new Error(`censo JSON missing barrios: ${path}`);
  }
  for (const [id, row] of Object.entries(json.barrios)) {
    if (!ALLOWED.has(row.estado)) {
      throw new Error(`invalid estado "${row.estado}" for barrio ${id}`);
    }
  }
  return {
    source: json.source || 'cantera/CIUDAD/CENSO-ESTADOS.md',
    barrios: json.barrios
  };
}

/**
 * Apply census estados onto barrio source rows (mutates copies).
 * @param {Array<{ id: string, estado?: BarrioEstado } & Record<string, unknown>>} barrios
 * @param {ReturnType<typeof loadCensoEstados>} censo
 */
export function applyCensoEstados(barrios, censo) {
  const ids = Object.keys(censo.barrios);
  if (ids.length !== 24) {
    throw new Error(`censo expected 24 barrios, got ${ids.length}`);
  }
  const missing = barrios.filter((b) => !censo.barrios[b.id]);
  if (missing.length) {
    throw new Error(
      `censo missing barrios: ${missing.map((b) => b.id).join(', ')}`
    );
  }
  return barrios.map((b) => ({
    ...b,
    estado: censo.barrios[b.id].estado
  }));
}

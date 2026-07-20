/**
 * Ceguera de método: cero tokens de marco en entregables del paquete.
 * Marca de producto/datos admisible. El propio test se excluye del scan.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, basename } from 'node:path';
import { fileURLToPath } from 'node:url';

const PKG = join(dirname(fileURLToPath(import.meta.url)), '..');
// Construido por partes para no auto-matchear este archivo.
const FORBIDDEN = new RegExp(
  ['SCRIPT', '_SDK'].join('') +
    '|' +
    ['S_', 'SDK'].join('') +
    '|hol[oó]n|holarqu[ií]a|juntura|' +
    ['HOL', 'ONES'].join('') +
    '|swarm-orquestacion',
  'i'
);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === '.git') continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(mjs|js|md|json)$/.test(name)) out.push(p);
  }
  return out;
}

describe('ciudad ceguera método', () => {
  it('árbol del paquete sin tokens de marco', () => {
    const hits = [];
    const self = basename(fileURLToPath(import.meta.url));
    for (const file of walk(PKG)) {
      if (basename(file) === self) continue;
      const text = readFileSync(file, 'utf8');
      if (FORBIDDEN.test(text)) {
        hits.push(relative(PKG, file));
      }
    }
    assert.deepEqual(hits, [], `ceguera rota en: ${hits.join(', ')}`);
  });
});

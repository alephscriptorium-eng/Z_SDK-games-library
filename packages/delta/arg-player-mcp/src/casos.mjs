/**
 * Lectura del playbook packages/delta/spec/CASOS.md.
 * Parseo genérico vive en @zeus/playbook-kit.
 */

import fs from 'node:fs';
import { listCasoIds, extractCaso } from '@zeus/playbook-kit';
import { CASOS_PATH } from './config.mjs';

export function readCasosMarkdown(casosPath = CASOS_PATH) {
  return fs.readFileSync(casosPath, 'utf8');
}

export { listCasoIds, extractCaso };

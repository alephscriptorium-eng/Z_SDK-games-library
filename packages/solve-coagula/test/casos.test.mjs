/**
 * Coherencia CASOS.md con tools MCP.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPlaybookCoherence, listCasoIds } from '@zeus/playbook-kit';

const CASOS = join(dirname(fileURLToPath(import.meta.url)), '../spec/CASOS.md');

describe('solve-coagula casos', () => {
  it('C-01..C-03 coherentes con tools player_*', () => {
    const md = readFileSync(CASOS, 'utf8');
    const ids = listCasoIds(md);
    assert.deepEqual(ids, ['C-01', 'C-02', 'C-03']);
    const coherence = checkPlaybookCoherence(md, {
      expectedIds: ids,
      toolPattern: /`player_\w+\s*\{/
    });
    assert.equal(coherence.ok, true, coherence.errors?.join('; '));
  });
});

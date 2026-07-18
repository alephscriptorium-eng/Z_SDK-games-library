/**
 * Coherencia del playbook CASOS.md (playbook-kit).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkPlaybookCoherence } from '@zeus/playbook-kit';

const CASOS = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'spec',
  'CASOS.md'
);

describe('pozo CASOS.md', () => {
  it('pasa coherencia playbook-kit con C-01..C-03', () => {
    const markdown = fs.readFileSync(CASOS, 'utf8');
    const result = checkPlaybookCoherence(markdown, {
      expectedIds: ['C-01', 'C-02', 'C-03'],
      toolPattern: /`player_\w+\s*\{/
    });
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(result.ids, ['C-01', 'C-02', 'C-03']);
    assert.ok(result.cases.every((c) => c.mcpStepCount >= 1));
  });
});

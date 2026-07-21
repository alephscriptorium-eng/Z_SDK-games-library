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

describe('ciudad CASOS.md', () => {
  it('pasa coherencia playbook-kit con C-01..C-07', () => {
    const markdown = fs.readFileSync(CASOS, 'utf8');
    const result = checkPlaybookCoherence(markdown, {
      expectedIds: ['C-01', 'C-02', 'C-03', 'C-04', 'C-05', 'C-06', 'C-07'],
      // C-01/C-02/C-05..C-07 = player_*; C-03/C-04 = peer rooms/cp/horse
      toolPattern: /`(player_\w+|cp_start_bot|rooms_intent|rnfp_activate|horse_tools_call|rooms_state)\s*\{/
    });
    assert.equal(result.ok, true, result.errors.join('; '));
    assert.deepEqual(result.ids, [
      'C-01',
      'C-02',
      'C-03',
      'C-04',
      'C-05',
      'C-06',
      'C-07'
    ]);
    assert.ok(result.cases.every((c) => c.mcpStepCount >= 1));
  });
});

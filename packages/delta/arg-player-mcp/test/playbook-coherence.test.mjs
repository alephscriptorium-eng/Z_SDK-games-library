/**
 * Coherencia del playbook delta vía @zeus/playbook-kit (WP-U13).
 * Demuele el test local de parseo/coherencia que vivía en casos.test.mjs.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { checkPlaybookCoherence, extractCaso } from '@zeus/playbook-kit';
import { readCasosMarkdown } from '../src/casos.mjs';

const EXPECTED_IDS = [
  'C-01',
  'C-02',
  'C-02b',
  'C-03',
  'C-04',
  'C-04b',
  'C-05',
  'C-06',
  'C-07',
  'C-08',
  'C-09',
  'C-10',
  'C-11',
  'C-12',
  'C-12b',
  'C-13',
  'C-14',
  'C-15',
  'C-16',
  'C-17',
  'C-18',
  'C-30',
  'C-31',
  'C-32',
  'C-33'
];

test('CASOS.md pasa coherencia del playbook-kit', () => {
  const markdown = readCasosMarkdown();
  const result = checkPlaybookCoherence(markdown, {
    expectedIds: EXPECTED_IDS,
    toolPattern: /`(?:player|dj)_\w+\s*\{/
  });
  assert.equal(result.ok, true, result.errors.join('\n'));
});

test('extractCaso (kit) no arrastra la sección siguiente', () => {
  const markdown = readCasosMarkdown();
  const c04b = extractCaso(markdown, 'C-04b');
  assert.ok(c04b.startsWith('## C-04b'));
  assert.match(c04b, /sin_contacto/);
  assert.match(c04b, /player_tap_set/);
  assert.ok(!c04b.includes('## C-05'));
  assert.equal(extractCaso(markdown, 'c-04B'), c04b);
  assert.equal(extractCaso(markdown, 'C-99'), null);
});

test('fase 1.6 cita tools del mar vivo (WP-32)', () => {
  const markdown = readCasosMarkdown();
  assert.match(extractCaso(markdown, 'C-17'), /player_salvage/);
  assert.match(extractCaso(markdown, 'C-18'), /player_track/);
});

test('fase DJ cita tools del manipulador (WP-U30)', () => {
  const markdown = readCasosMarkdown();
  assert.match(extractCaso(markdown, 'C-30'), /dj_cache/);
  assert.match(extractCaso(markdown, 'C-31'), /dj_curate/);
  assert.match(extractCaso(markdown, 'C-32'), /dj_milestone/);
});

test('fase vaciar cita player_empty (WP-U83)', () => {
  const markdown = readCasosMarkdown();
  assert.match(extractCaso(markdown, 'C-33'), /player_empty/);
  assert.match(extractCaso(markdown, 'C-33'), /empty_playable/);
});

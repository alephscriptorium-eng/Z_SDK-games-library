#!/usr/bin/env node
/**
 * Proyección mínima ledger/track → story-board (WP-Z07).
 * Solo lectura del fixture; escribe readerapp/story-board.json de esta instancia.
 * No toca el kit ni produce gamemap.
 *
 *   node kits/carpeta-dramaturgo/instances/ciudad/scripts/project-ledger-to-story-board.mjs
 *   node …/project-ledger-to-story-board.mjs --fixture path/to/ledger.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTANCE = resolve(__dirname, '..');
const DEFAULT_FIXTURE = join(INSTANCE, 'ledger', 'fixture-z03-mvp.json');
const STORY_BOARD = join(INSTANCE, 'readerapp', 'story-board.json');

function parseArgs(argv) {
  /** @type {{ fixture: string }} */
  const out = { fixture: DEFAULT_FIXTURE };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--fixture') out.fixture = resolve(argv[++i]);
  }
  return out;
}

/**
 * @param {{ ledger?: object[], tracks?: object[], gap?: string, source?: string }} fixture
 */
function projectActs(fixture) {
  const ledger = Array.isArray(fixture.ledger) ? fixture.ledger : [];
  const tracks = Array.isArray(fixture.tracks) ? fixture.tracks : [];

  /** @type {object[]} */
  const acts = [
    {
      id: 'act-0',
      blockchain: 0,
      title: 'Semilla',
      widgets: ['panel-seed', 'panel-reic'],
      agentchain: 'agentchain/<modelo-slug>/block-0.md',
      status: 'ready',
      ledger_kind: null
    }
  ];

  let next = 1;

  for (const entry of ledger) {
    if (entry.kind === 'announce') {
      acts.push({
        id: `act-${next}`,
        blockchain: next,
        title: 'Presencia en plaza',
        widgets: ['panel-announce'],
        agentchain: `agentchain/<modelo-slug>/block-${next}.md`,
        status: 'ready',
        ledger_kind: 'announce',
        ledger_seq: entry.seq,
        actorId: entry.actorId,
        detail: entry.detail ?? null,
        player_origin: 'rabbit'
      });
      next += 1;
    }
  }

  for (const tr of tracks) {
    if (tr.hint === 'walk' && tr.ref?.barrioId) {
      acts.push({
        id: `act-${next}`,
        blockchain: next,
        title: 'Cruce de distrito',
        widgets: ['panel-cruce'],
        agentchain: `agentchain/<modelo-slug>/block-${next}.md`,
        status: 'ready',
        ledger_kind: 'walk',
        track_hint: 'walk',
        actorId: tr.actorId,
        detail: tr.ref,
        player_origin: 'rabbit'
      });
      next += 1;
    }
  }

  for (const entry of ledger) {
    if (entry.kind === 'wake') {
      acts.push({
        id: `act-${next}`,
        blockchain: next,
        title: 'Un barrio despertó',
        widgets: ['panel-wake'],
        agentchain: `agentchain/<modelo-slug>/block-${next}.md`,
        status: 'ready',
        ledger_kind: 'wake',
        ledger_seq: entry.seq,
        actorId: entry.actorId,
        detail: entry.detail ?? null,
        player_origin: 'rabbit',
        gap_z04:
          fixture.gap ||
          'pendiente Z04 e2e — regenerar desde ledger rabbits r/s/h cuando Z04 ✅'
      });
      next += 1;
    }
  }

  return acts;
}

function main(argv) {
  const { fixture: fixturePath } = parseArgs(argv);
  const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));
  const acts = projectActs(fixture);

  const board = {
    version: 1,
    generated_at: new Date().toISOString().slice(0, 10),
    title: 'Ciudad — story-board',
    slug: 'ciudad',
    projection: {
      from: 'ledger+tracks',
      fixture: 'ledger/fixture-z03-mvp.json',
      source: fixture.source ?? null,
      gap: fixture.gap ?? 'pendiente Z04 e2e',
      mapeo: 'ledger/MAPEO.md'
    },
    acts,
    uichain_specs: 'uichain/*.prompt.md',
    ayuda: 'readerapp/AYUDA.md'
  };

  writeFileSync(STORY_BOARD, `${JSON.stringify(board, null, 2)}\n`, 'utf8');
  console.log(`wrote ${STORY_BOARD}`);
  console.log(
    `acts=${acts.map((a) => `${a.id}:${a.title}`).join(' · ')}`
  );
  if (fixture.gap) console.log(`gap: ${fixture.gap}`);
}

main(process.argv.slice(2));

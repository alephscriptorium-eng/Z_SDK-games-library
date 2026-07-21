#!/usr/bin/env node
/**
 * Proyección mínima ledger/track → story-board (WP-Z07 + tipología Z13).
 * Solo lectura del fixture; escribe readerapp/story-board.json de esta instancia.
 * No toca el kit ni produce gamemap.
 *
 * Cliente cronista (eje IV): etiqueta actos con player_origin desde el
 * contrato de mapeo `@zeus/ciudad/jugadores` (independiente del tablero).
 *
 *   node kits/carpeta-dramaturgo/instances/ciudad/scripts/project-ledger-to-story-board.mjs
 *   node …/project-ledger-to-story-board.mjs --fixture path/to/ledger.json
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const INSTANCE = resolve(__dirname, '..');
const GL_ROOT = resolve(INSTANCE, '..', '..', '..', '..');
const DEFAULT_FIXTURE = join(INSTANCE, 'ledger', 'fixture-z13-tres-jugadores.json');
const STORY_BOARD = join(INSTANCE, 'readerapp', 'story-board.json');
const JUGADORES = join(GL_ROOT, 'packages', 'ciudad', 'src', 'jugadores.mjs');

const { playerOriginFromLedgerEntry } = await import(pathToFileURL(JUGADORES).href);

function parseArgs(argv) {
  /** @type {{ fixture: string }} */
  const out = { fixture: DEFAULT_FIXTURE };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--fixture') out.fixture = resolve(argv[++i]);
  }
  return out;
}

/**
 * @param {{ ledger?: object[], tracks?: object[], gap?: string|null, source?: string, actors?: object }} fixture
 */
function projectActs(fixture) {
  const ledger = Array.isArray(fixture.ledger) ? fixture.ledger : [];
  const tracks = Array.isArray(fixture.tracks) ? fixture.tracks : [];
  const actorsIndex = fixture.actors && typeof fixture.actors === 'object' ? fixture.actors : null;
  const gap = fixture.gap || null;

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
        player_origin: playerOriginFromLedgerEntry(entry, actorsIndex)
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
        player_origin: playerOriginFromLedgerEntry(tr, actorsIndex)
      });
      next += 1;
    }
  }

  for (const entry of ledger) {
    if (entry.kind === 'wake') {
      /** @type {object} */
      const act = {
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
        player_origin: playerOriginFromLedgerEntry(entry, actorsIndex),
        residente_id: entry.detail?.residenteId ?? null
      };
      if (gap) act.gap_z04 = gap;
      acts.push(act);
      next += 1;
    }
  }

  for (const entry of ledger) {
    if (entry.kind === 'sleep') {
      acts.push({
        id: `act-${next}`,
        blockchain: next,
        title: 'Un barrio se apagó',
        widgets: ['panel-wake'],
        agentchain: `agentchain/<modelo-slug>/block-${next}.md`,
        status: 'ready',
        ledger_kind: 'sleep',
        ledger_seq: entry.seq,
        actorId: entry.actorId,
        detail: entry.detail ?? null,
        player_origin: playerOriginFromLedgerEntry(entry, actorsIndex),
        residente_id: entry.detail?.residenteId ?? null
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
  const fixtureRel = relative(INSTANCE, fixturePath).replace(/\\/g, '/');
  const gap = fixture.gap || null;

  const board = {
    version: 1,
    generated_at: new Date().toISOString().slice(0, 10),
    title: 'Ciudad — story-board',
    slug: 'ciudad',
    projection: {
      from: 'ledger+tracks',
      fixture: fixtureRel,
      source: fixture.source ?? null,
      gap,
      mapeo: 'ledger/MAPEO.md',
      jugadores: 'packages/ciudad/src/jugadores.mjs'
    },
    acts,
    uichain_specs: 'uichain/*.prompt.md',
    ayuda: 'readerapp/AYUDA.md'
  };

  writeFileSync(STORY_BOARD, `${JSON.stringify(board, null, 2)}\n`, 'utf8');
  console.log(`wrote ${STORY_BOARD}`);
  console.log(
    `acts=${acts.map((a) => `${a.id}:${a.title}/${a.player_origin ?? '—'}`).join(' · ')}`
  );
  if (gap) console.log(`gap: ${gap}`);
  else console.log('gap: (none)');
}

main(process.argv.slice(2));

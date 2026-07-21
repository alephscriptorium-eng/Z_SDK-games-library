#!/usr/bin/env node
/**
 * Volcado ledger Z13 — tres jugadores (acto V / cronista).
 * Escribe fixture consumido por el proyector dramaturgo.
 *
 *   CIUDAD_LEDGER_OUT=…/fixture-z13-tres-jugadores.json node fixtures/z13-ledger-dump.mjs
 */

import { mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const STARTPACK = join(ROOT, '..', '..', 'startpack-ciudad', 'seeds', 'gamemap.json');
const DEFAULT_OUT = resolve(
  ROOT,
  '..',
  '..',
  '..',
  'kits',
  'carpeta-dramaturgo',
  'instances',
  'ciudad',
  'ledger',
  'fixture-z13-tres-jugadores.json'
);

function run() {
  let t = 1000;
  const d = createCiudadDomainState({
    now: () => t,
    gamemap: JSON.parse(readFileSync(STARTPACK, 'utf8'))
  });

  d.applyIntent(makeIntent('visitante-ui', 'join', { playerType: 'visitante' }));
  d.applyIntent(
    makeIntent('visitante-ui', 'announce', { message: 'plaza abierta' })
  );
  d.applyIntent(makeIntent('corriente-peer', 'join', { playerType: 'corriente' }));
  d.applyIntent(makeIntent('corriente-peer', 'walk', { nodeId: 'zigurat' }));
  d.applyIntent(
    makeIntent('corriente-peer', 'walk', { anchorId: 'ancla-prolog-editor' })
  );
  t = 2000;
  d.applyIntent(
    makeIntent('corriente-peer', 'wake', {
      tool: 'oraculo.consultar',
      barrioId: 'prolog-editor',
      horseMode: 'stub'
    })
  );

  const snap = d.snapshot('z13-ledger');
  const outbox = d.drainOutbox();
  const outPath = process.env.CIUDAD_LEDGER_OUT
    ? resolve(process.env.CIUDAD_LEDGER_OUT)
    : DEFAULT_OUT;

  const fixture = {
    source: 'packages/ciudad/fixtures/z13-ledger-dump.mjs',
    gap: null,
    sceneId: snap.sceneId,
    actors: snap.actors,
    barrios: {
      'prolog-editor': snap.barrios['prolog-editor']
    },
    ledger: outbox.ledger,
    tracks: outbox.tracks
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
  console.log('Z13_LEDGER_OK', {
    out: outPath,
    ledgerKinds: outbox.ledger.map((e) => e.kind),
    types: Object.values(snap.actors).map((a) => a.playerType)
  });
}

run();

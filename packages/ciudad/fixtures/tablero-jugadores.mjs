#!/usr/bin/env node
/**
 * Cliente tablero (eje IV) — lee snapshot y clasifica tipos vía contrato
 * `jugadores.mjs`. Independiente del cronista (proyector dramaturgo).
 *
 *   node fixtures/tablero-jugadores.mjs
 *   node fixtures/tablero-jugadores.mjs --json
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent, classifySnapshotPlayers } from '../src/contract.mjs';

const ROOT = dirname(fileURLToPath(import.meta.url));
const STARTPACK = join(ROOT, '..', '..', 'startpack-ciudad', 'seeds', 'gamemap.json');

function demoSnapshot() {
  let t = 1000;
  const d = createCiudadDomainState({
    now: () => t,
    gamemap: JSON.parse(readFileSync(STARTPACK, 'utf8'))
  });

  d.applyIntent(
    makeIntent('visitante-ui', 'join', { playerType: 'visitante' })
  );
  d.applyIntent(
    makeIntent('corriente-peer', 'join', { playerType: 'corriente' })
  );
  d.applyIntent(
    makeIntent('corriente-peer', 'walk', { nodeId: 'zigurat' })
  );
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
  return d.snapshot('tablero-demo');
}

function main(argv) {
  const asJson = argv.includes('--json');
  const snap = demoSnapshot();
  const classified = classifySnapshotPlayers(snap);
  if (asJson) {
    console.log(
      JSON.stringify(
        {
          sceneId: snap.sceneId,
          typesPresent: classified.typesPresent,
          byType: classified.byType,
          ok: classified.ok,
          barrio: snap.barrios['prolog-editor']?.estado,
          residente: snap.actors['residente:prolog-editor'] || null
        },
        null,
        2
      )
    );
  } else {
    console.log('TABLERO_JUGADORES', {
      typesPresent: classified.typesPresent,
      byType: classified.byType,
      ok: classified.ok,
      barrio: snap.barrios['prolog-editor']?.estado
    });
  }
  if (!classified.ok || classified.typesPresent.length < 2) {
    process.exitCode = 1;
  }
}

main(process.argv.slice(2));

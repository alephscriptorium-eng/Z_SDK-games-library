/**
 * Smoke misiones: ciudadano censo → destino decay → viaje Z10 → walks.
 * Idle documentado cuando forceIdle.
 *
 *   node packages/ciudad/fixtures/misiones-smoke.mjs
 */

import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join as pathJoin, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import { nextCitizenBehavior } from '../src/misiones.mjs';

const seed = pathJoin(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);
const gamemap = JSON.parse(readFileSync(seed, 'utf8'));
const cacheDir = mkdtempSync(pathJoin(tmpdir(), 'ciudad-mision-'));

const d = createCiudadDomainState({ now: () => 1000, gamemap });
const joined = d.applyIntent(makeIntent('aleph', 'join', {}));
if (!joined.ok) {
  console.error('FAIL join', joined.error);
  process.exit(1);
}

const snap = d.snapshot('pre');
const behavior = await nextCitizenBehavior({
  barrios: snap.barrios,
  homeZoneId: 'plaza',
  currentNodeId: snap.actors.aleph.nodeId,
  gamemap,
  rng: () => 0,
  viajeId: 'misiones-smoke-aleph',
  cacheDir
});

if (behavior.kind !== 'viaje') {
  console.error('FAIL expected viaje mission', behavior);
  process.exit(1);
}
if (behavior.mission?.reason !== 'censo_decay_bias') {
  console.error('FAIL selection not censo-anchored', behavior.mission);
  process.exit(1);
}
if (!behavior.path || behavior.path[0] !== 'plaza') {
  console.error('FAIL path origin', behavior.path);
  process.exit(1);
}

console.log('ok selection', {
  barrioId: behavior.mission.barrioId,
  estado: behavior.mission.barrioEstado,
  origin: behavior.mission.origin,
  destination: behavior.mission.destination,
  path: behavior.path
});

for (const hop of behavior.walks) {
  const args = hop.anchorId ? { anchorId: hop.anchorId } : { nodeId: hop.nodeId };
  const r = d.applyIntent(makeIntent('aleph', 'walk', args));
  if (!r.ok) {
    console.error('FAIL walk', hop, r.error);
    process.exit(1);
  }
  console.log('ok walk', args);
}

const idle = await nextCitizenBehavior({
  barrios: snap.barrios,
  homeZoneId: 'plaza',
  currentNodeId: 'plaza',
  gamemap,
  forceIdle: true,
  rng: () => 0
});
if (idle.kind !== 'idle' || idle.reason !== 'idle_random_walk') {
  console.error('FAIL idle', idle);
  process.exit(1);
}
console.log('ok idle', idle.walk);

const end = d.snapshot('end');
console.log('MISIONES_SMOKE_OK', {
  actor: end.actors.aleph?.nodeId,
  barrio: behavior.mission.barrioId,
  hops: behavior.hops
});

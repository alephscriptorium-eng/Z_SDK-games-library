/**
 * Smoke mapa zonas (24 barrios / seed): 2º cliente con interés de zona.
 * Consume `@zeus/game-engine` zone filter (ruta worktree o ZEUS_GAME_ENGINE).
 *
 *   node packages/ciudad/fixtures/zone-subscription-smoke.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import { sceneFromGamemap } from '../src/scene.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const seed = join(here, '..', '..', 'startpack-ciudad', 'seeds', 'gamemap.json');

/** 01-mythos from this fixture (GL worktree layout). */
const mythosRoot = resolve(here, '../../../../../../');

function resolveGameEngineEntry() {
  if (process.env.ZEUS_GAME_ENGINE) return resolve(process.env.ZEUS_GAME_ENGINE);
  const candidates = [
    join(
      mythosRoot,
      'zeus-sdk',
      '.worktrees',
      'wp-gc-z05-f2-suscripcion-zonas',
      'packages',
      'engine',
      'game-engine',
      'src',
      'index.mjs'
    ),
    join(mythosRoot, 'zeus-sdk', 'packages', 'engine', 'game-engine', 'src', 'index.mjs'),
  ];
  for (const p of candidates) {
    try {
      readFileSync(p);
      return p;
    } catch {
      /* try next */
    }
  }
  throw new Error(
    'game-engine entry not found; set ZEUS_GAME_ENGINE to zone-subscription build'
  );
}

const gamemap = JSON.parse(readFileSync(seed, 'utf8'));
const barrioCount = Object.keys(gamemap.anclas || {}).length;
if (barrioCount < 24) {
  console.error('FAIL expected ≥24 anclas/barrios in seed, got', barrioCount);
  process.exit(1);
}
if (!Array.isArray(gamemap.zones) || gamemap.zones.length < 2) {
  console.error('FAIL seed.zones missing');
  process.exit(1);
}

const gePath = resolveGameEngineEntry();
const {
  buildZoneIndexFromCatalog,
  createZoneStateHandler,
  filterSnapshotByZones,
} = await import(pathToFileURL(gePath).href);

const index = buildZoneIndexFromCatalog(gamemap.zones);
const state = createCiudadDomainState({
  now: () => 1_700_000_000_000,
  scene: sceneFromGamemap(gamemap),
});

function mustOk(label, result) {
  if (!result?.ok) {
    console.error('FAIL', label, result?.error || result);
    process.exit(1);
  }
}

mustOk('join-a', state.applyIntent(makeIntent('peer-all', 'join', {})));
mustOk('join-b', state.applyIntent(makeIntent('peer-zone', 'join', {})));
mustOk(
  'walk-a-editores',
  state.applyIntent(makeIntent('peer-all', 'walk', { nodeId: 'editores' }))
);
mustOk(
  'walk-b-zigurat',
  state.applyIntent(makeIntent('peer-zone', 'walk', { nodeId: 'zigurat' }))
);

const raw = state.snapshot('zone-smoke');

/** Cliente 1 — firehose */
const seenAll = [];
createZoneStateHandler('*', (f) => seenAll.push(f))(raw);

/** Cliente 2 — solo zona editores */
const ZONE = 'editores';
const seenZone = [];
createZoneStateHandler([ZONE], (f) => seenZone.push(f), index)(raw);

const allActors = Object.keys(seenAll[0].actors);
const zoneActors = Object.keys(seenZone[0].actors);
const zoneBarrios = Object.keys(seenZone[0].barrios || {});

if (allActors.length < 2) {
  console.error('FAIL firehose expected ≥2 actors', allActors);
  process.exit(1);
}
if (zoneActors.includes('peer-zone')) {
  console.error('FAIL zone client saw foreign actor peer-zone', zoneActors);
  process.exit(1);
}
if (!zoneActors.includes('peer-all')) {
  console.error('FAIL zone client missing peer-all in editores', zoneActors);
  process.exit(1);
}
for (const id of zoneBarrios) {
  const b = seenZone[0].barrios[id];
  if (b.parent !== ZONE && index.zoneByBarrio[id] !== ZONE) {
    console.error('FAIL barrio outside interest', id, b);
    process.exit(1);
  }
}

const sliced = filterSnapshotByZones(raw, [ZONE], index);
if (Object.keys(sliced.actors).length !== zoneActors.length) {
  console.error('FAIL handler/filter mismatch');
  process.exit(1);
}

console.log('ZONE_SMOKE_OK', {
  barriosSeed: barrioCount,
  zones: gamemap.zones.length,
  firehoseActors: allActors.length,
  zoneActors: zoneActors.length,
  zoneBarrios: zoneBarrios.length,
  interest: ZONE,
  gameEngine: gePath,
});

/**
 * Smoke del loop: decay · energía · objetivo (sin transporte).
 *   node packages/ciudad/fixtures/loop-smoke.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';

const seed = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);
const gamemap = JSON.parse(readFileSync(seed, 'utf8'));

let t = 1000;
const dProbe = createCiudadDomainState({ now: () => t, gamemap });
const vivosSeed = dProbe.snapshot('probe').objetivo.vivos;

const d = createCiudadDomainState({
  now: () => t,
  gamemap,
  decayVivoMs: 100,
  decayLatenteMs: 200,
  aliveTargetK: vivosSeed + 1,
  initialEnergy: 1,
  wakeCost: 1,
  announceGain: 1,
  maxEnergy: 3
});

function must(label, r) {
  if (!r.ok) {
    console.error('FAIL', label, r.error);
    process.exit(1);
  }
  console.log('ok', label);
}

must('join', d.applyIntent(makeIntent('rabbit', 'join', {})));
const pre = d.snapshot('pre');
if (pre.objetivo.cumplido !== false || pre.actors.rabbit.energy !== 1) {
  console.error('FAIL pre objetivo/energy', pre.objetivo, pre.actors.rabbit.energy);
  process.exit(1);
}

must('walk zigurat', d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' })));
must(
  'walk ancla',
  d.applyIntent(makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' }))
);
must(
  'wake',
  d.applyIntent(
    makeIntent('rabbit', 'wake', {
      tool: 'barrio.ping',
      barrioId: 'blockly-editor',
      horseMode: 'stub'
    })
  )
);

let snap = d.snapshot('after-wake');
if (snap.barrios['blockly-editor'].estado !== 'vivo') {
  console.error('FAIL barrio not vivo');
  process.exit(1);
}
if (snap.actors.rabbit.energy !== 0) {
  console.error('FAIL energy not spent', snap.actors.rabbit.energy);
  process.exit(1);
}
if (!snap.objetivo.cumplido || snap.objetivo.vivos < 1) {
  console.error('FAIL objetivo', snap.objetivo);
  process.exit(1);
}
console.log('ok objetivo cumplido', snap.objetivo);

must('sleep', d.applyIntent(makeIntent('rabbit', 'sleep', { barrioId: 'blockly-editor' })));
const dry = d.applyIntent(
  makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
);
if (dry.ok || dry.error !== 'energia_insuficiente') {
  console.error('FAIL expected energia_insuficiente', dry);
  process.exit(1);
}
console.log('ok energia_insuficiente');

must('walk plaza', d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'plaza' })));
must('announce', d.applyIntent(makeIntent('rabbit', 'announce', { message: 'reposo' })));
if (d.snapshot('t').actors.rabbit.energy !== 1) {
  console.error('FAIL announce did not recharge');
  process.exit(1);
}
console.log('ok announce recharge');

must(
  'walk ancla2',
  d.applyIntent(makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' }))
);
must(
  'wake2',
  d.applyIntent(
    makeIntent('rabbit', 'wake', {
      tool: 'barrio.ping',
      barrioId: 'blockly-editor'
    })
  )
);

t = 1200;
d.tick(0.1, t);
snap = d.snapshot('decay-latente');
if (snap.barrios['blockly-editor'].estado !== 'latente') {
  console.error('FAIL decay vivo→latente', snap.barrios['blockly-editor'].estado);
  process.exit(1);
}
console.log('ok decay vivo→latente');

t = 1500;
d.tick(0.1, t);
snap = d.snapshot('decay-muerto');
if (snap.barrios['blockly-editor'].estado !== 'muerto') {
  console.error('FAIL decay latente→muerto', snap.barrios['blockly-editor'].estado);
  process.exit(1);
}
console.log('ok decay latente→muerto');

console.log('LOOP_SMOKE_OK', {
  sceneId: snap.sceneId,
  lastDecay: snap.lastDecay,
  objetivo: snap.objetivo,
  energy: snap.actors.rabbit?.energy
});

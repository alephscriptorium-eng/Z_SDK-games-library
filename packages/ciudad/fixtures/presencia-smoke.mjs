/**
 * Smoke presencia: señal sostiene vivo; corte → decay en TICKS_PRESENCIA+1.
 *   node packages/ciudad/fixtures/presencia-smoke.mjs
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import {
  createMockFuentePresencia,
  makeSeñalDePresencia
} from '../src/presencia.mjs';

const seed = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);
const gamemap = JSON.parse(readFileSync(seed, 'utf8'));

const TP = 2;
let t = 1000;
const d = createCiudadDomainState({
  now: () => t,
  gamemap,
  decayVivoMs: 100,
  decayLatenteMs: 200,
  ticksPresencia: TP,
  initialEnergy: 5
});

function must(label, r) {
  if (!r || r.ok === false) {
    console.error('FAIL', label, r?.error);
    process.exit(1);
  }
  console.log('ok', label);
}

must('join', d.applyIntent(makeIntent('rabbit', 'join', {})));
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

t = 1150;
const fuente = createMockFuentePresencia({
  barrioId: 'blockly-editor',
  agenteId: 'smoke-mock'
});
must('attach', d.attachFuentePresencia(fuente));

for (let i = 0; i < 4; i += 1) {
  fuente.emit({ clase: 'flujo', tick: i });
  d.tick(0.1, t);
  if (d.snapshot('t').barrios['blockly-editor'].estado !== 'vivo') {
    console.error('FAIL sostenido', i);
    process.exit(1);
  }
}
console.log('ok presencia sostenida (flujo, sin recarga energía)');
if (d.snapshot('t').actors.rabbit.energy !== 4) {
  // wake gastó 1 desde 5 → 4; flujo no tocó energía
  console.error('FAIL energía alterada por flujo', d.snapshot('t').actors.rabbit.energy);
  process.exit(1);
}
console.log('ok flujo no recarga energía');

d.detachFuentePresencia();
// Última señal ya aplicada; corte → TP ticks vivo, TP+1 latente.
for (let i = 1; i <= TP; i += 1) {
  d.tick(0.1, t);
  if (d.snapshot('t').barrios['blockly-editor'].estado !== 'vivo') {
    console.error('FAIL ventana', i, d.snapshot('t').barrios['blockly-editor'].estado);
    process.exit(1);
  }
}
d.tick(0.1, t);
if (d.snapshot('t').barrios['blockly-editor'].estado !== 'latente') {
  console.error('FAIL decay en TP+1', d.snapshot('t').barrios['blockly-editor'].estado);
  process.exit(1);
}
console.log('ok corte → decay en TICKS_PRESENCIA+1');

// Input directo por tick (sin adapter).
const d2 = createCiudadDomainState({
  now: () => 1,
  gamemap,
  ticksPresencia: 1,
  decayVivoMs: 1,
  initialEnergy: 5
});
d2.applyIntent(makeIntent('rabbit', 'join', {}));
d2.tick(0, 1, {
  señales: [
    makeSeñalDePresencia({
      barrioId: 'blockly-editor',
      agenteId: 'direct',
      clase: 'visitante',
      tick: 1
    })
  ]
});
if (!d2.snapshot('t').lastPresencia || d2.snapshot('t').lastPresencia.agenteId !== 'direct') {
  console.error('FAIL tick señales input', d2.snapshot('t').lastPresencia);
  process.exit(1);
}
console.log('ok tick consume señales input');

console.log('PRESENCIA_SMOKE_OK', {
  ticksPresencia: TP,
  lastDecay: d.snapshot('t').lastDecay,
  energy: d.snapshot('t').actors.rabbit?.energy
});

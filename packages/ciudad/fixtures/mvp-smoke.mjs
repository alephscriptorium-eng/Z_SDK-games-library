/**
 * Smoke mínimo MVP (sin transporte): startpack → dominio → wake.
 *   node packages/ciudad/fixtures/mvp-smoke.mjs
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
const d = createCiudadDomainState({ now: () => 42, gamemap });

const steps = [
  ['join', {}],
  ['walk', { nodeId: 'zigurat' }],
  ['walk', { anchorId: 'ancla-blockly-editor' }],
  ['wake', { tool: 'barrio.ping', barrioId: 'blockly-editor', horseMode: 'stub' }]
];

for (const [intent, args] of steps) {
  const r = d.applyIntent(makeIntent('rabbit', intent, args));
  if (!r.ok) {
    console.error('FAIL', intent, r.error);
    process.exit(1);
  }
  console.log('ok', intent);
}

const snap = d.snapshot('smoke');
if (snap.barrios['blockly-editor'].estado !== 'vivo') {
  console.error('FAIL snapshot barrio not vivo');
  process.exit(1);
}
console.log('SMOKE_OK', {
  sceneId: snap.sceneId,
  barrio: snap.barrios['blockly-editor'].estado,
  lastWake: snap.lastWake
});

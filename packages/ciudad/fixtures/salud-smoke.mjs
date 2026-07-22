/**
 * Smoke salud real: npm view @zeus/protocol (canal registry) → mapa.
 *   node packages/ciudad/fixtures/salud-smoke.mjs
 *
 * Cliente 1: applySalud sobre mcp-gallery (sync estado).
 * Cliente 2: wakeConSalud sobre blockly-editor (wake = npm-view).
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import {
  bindingsSalud,
  probeSalud,
  señalSaludDesdeProbe,
  wakeConSalud
} from '../src/salud.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const seed = join(root, '..', 'startpack-ciudad', 'seeds', 'gamemap.json');
const gamemap = JSON.parse(readFileSync(seed, 'utf8'));

let t = 1_000;
const d = createCiudadDomainState({
  now: () => t,
  gamemap,
  initialEnergy: 5
});

function must(label, cond, detail) {
  if (!cond) {
    console.error('FAIL', label, detail || '');
    process.exit(1);
  }
  console.log('ok', label);
}

const map = bindingsSalud(gamemap.arbol);
must('binding mcp-gallery npm-view', map['mcp-gallery']?.kind === 'npm-view');

const probeGallery = await probeSalud(map['mcp-gallery']);
must(
  `npm view @zeus/protocol → ${probeGallery.detail?.version || probeGallery.detail?.code}`,
  probeGallery.ok === true && String(probeGallery.detail?.version || '').length > 0,
  probeGallery
);

const apply = d.applySalud(señalSaludDesdeProbe(probeGallery));
must('applySalud mcp-gallery', apply.ok === true, apply);
must(
  'mapa refleja vivo',
  d.snapshot('t').barrios['mcp-gallery'].estado === 'vivo'
);
must(
  'snapshot.lastSalud version',
  d.snapshot('t').lastSalud?.detail?.version === probeGallery.detail.version
);

must('join', d.applyIntent(makeIntent('rabbit', 'join', {})).ok);
must('walk zigurat', d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' })).ok);
must(
  'walk blockly',
  d.applyIntent(
    makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
  ).ok
);

t = 2_000;
const wake = await wakeConSalud({
  domain: d,
  makeIntent,
  actorId: 'rabbit',
  barrioId: 'blockly-editor',
  binding: {
    barrioId: 'blockly-editor',
    kind: 'npm-view',
    packageName: '@zeus/protocol',
    registry: map['mcp-gallery'].registry
  }
});
must('wakeConSalud blockly', wake.ok === true, wake);
must('wake tool salud.npm-view', wake.wake?.ok === true && d.snapshot('t').lastWake?.tool === 'salud.npm-view');
must('blockly vivo tras wake', d.snapshot('t').barrios['blockly-editor'].estado === 'vivo');

console.log(
  JSON.stringify({
    ok: true,
    protocolVersion: probeGallery.detail.version,
    mcpGallery: d.snapshot('t').barrios['mcp-gallery'].estado,
    blockly: d.snapshot('t').barrios['blockly-editor'].estado,
    lastWakeTool: d.snapshot('t').lastWake?.tool,
    shape: 'salud/1'
  })
);
console.log('SALUD_SMOKE_OK');

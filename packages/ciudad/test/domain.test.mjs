/**
 * Tests del dominio ciudad: join → walk → wake; rechazo barrio muerto;
 * escena desde startpack (no hardcode).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import { sceneFromGamemap, nodesReachable } from '../src/scene.mjs';

const STARTPACK_SEED = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);

function loadGamemap() {
  return JSON.parse(readFileSync(STARTPACK_SEED, 'utf8'));
}

describe('ciudad domain', () => {
  it('escena viene del startpack (sceneId + 24 barrios)', () => {
    const gamemap = loadGamemap();
    const scene = sceneFromGamemap(gamemap);
    assert.equal(scene.sceneId, 'ciudad-v0');
    assert.equal(Object.keys(scene.barrios).length, 24);
    assert.equal(scene.barrios['blockly-editor'].estado, 'latente');
    assert.equal(scene.barrios['workflow-editor'].estado, 'muerto');
    assert.ok(nodesReachable(scene.enlaces, 'plaza', 'editores'));
  });

  it('MVP e2e dominio: join → walk → wake → snapshot cambia', () => {
    let t = 1000;
    const d = createCiudadDomainState({ now: () => t, gamemap: loadGamemap() });

    assert.equal(d.applyIntent(makeIntent('rabbit', 'join', {})).ok, true);
    assert.equal(d.snapshot('t').actors.rabbit.nodeId, 'plaza');

    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' })).ok,
      true
    );
    assert.equal(d.snapshot('t').actors.rabbit.nodeId, 'zigurat');

    assert.equal(
      d.applyIntent(
        makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
      ).ok,
      true
    );
    const mid = d.snapshot('t');
    assert.equal(mid.actors.rabbit.nodeId, 'editores');
    assert.equal(mid.actors.rabbit.anchorId, 'ancla-blockly-editor');
    assert.equal(mid.barrios['blockly-editor'].estado, 'latente');

    t = 2000;
    const wake = d.applyIntent(
      makeIntent('rabbit', 'wake', {
        tool: 'barrio.ping',
        barrioId: 'blockly-editor',
        horseMode: 'stub'
      })
    );
    assert.equal(wake.ok, true, wake.error);

    const snap = d.snapshot('after-wake');
    assert.equal(snap.barrios['blockly-editor'].estado, 'vivo');
    assert.equal(snap.lastWake.barrioId, 'blockly-editor');
    assert.equal(snap.lastWake.tool, 'barrio.ping');
    assert.equal(snap.lastWake.horseMode, 'stub');
    assert.equal(snap.actors.rabbit.wakes, 1);

    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === 'wake'));
    assert.ok(out.tracks.some((tr) => tr.hint === 'horse-offer'));
  });

  it('rechaza wake sobre barrio muerto', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    d.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-workflow-editor' })
    );
    const r = d.applyIntent(
      makeIntent('rabbit', 'wake', {
        tool: 'barrio.ping',
        barrioId: 'workflow-editor'
      })
    );
    assert.equal(r.ok, false);
    assert.equal(r.error, 'barrio_muerto');
    assert.equal(d.snapshot('t').barrios['workflow-editor'].estado, 'muerto');
  });

  it('announce solo en plaza; walk inalcanzable falla', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'announce', { message: 'hola' })).ok,
      true
    );
    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'announce', {})).error,
      'fuera_de_plaza'
    );
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'walk', { anchorId: 'no-existe' })).error,
      'ancla_desconocida'
    );
  });

  it('validateIntent rechaza rol no autorizado en wake', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    const bad = makeIntent(
      'op',
      'wake',
      { tool: 'x' },
      { from: 'op', role: 'dj' }
    );
    const r = d.applyIntent(bad);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'rol_no_autorizado');
  });
});

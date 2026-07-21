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

  it('decay: vivo sin visita → latente → muerto (reloj inyectable)', () => {
    let t = 1000;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      decayVivoMs: 100,
      decayLatenteMs: 200,
      initialEnergy: 5
    });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
    );
    assert.equal(
      d.applyIntent(
        makeIntent('rabbit', 'wake', {
          tool: 'barrio.ping',
          barrioId: 'blockly-editor'
        })
      ).ok,
      true
    );
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
    assert.ok(d.snapshot('t').actors['residente:blockly-editor']);

    t = 1100;
    d.tick(0.1, t);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'latente');
    assert.equal(d.snapshot('t').actors['residente:blockly-editor'], undefined);
    assert.equal(d.snapshot('t').lastDecay.from, 'vivo');
    assert.equal(d.snapshot('t').lastDecay.to, 'latente');

    t = 1300;
    d.tick(0.1, t);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'muerto');
    assert.equal(d.snapshot('t').lastDecay.from, 'latente');
    assert.equal(d.snapshot('t').lastDecay.to, 'muerto');

    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === 'decay'));
  });

  it('energía: wake gasta; announce recarga; sin energía falla', () => {
    let t = 1;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      initialEnergy: 1,
      wakeCost: 1,
      announceGain: 1,
      maxEnergy: 2
    });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    assert.equal(d.snapshot('t').actors.rabbit.energy, 1);

    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
    );
    assert.equal(
      d.applyIntent(
        makeIntent('rabbit', 'wake', {
          tool: 'barrio.ping',
          barrioId: 'blockly-editor'
        })
      ).ok,
      true
    );
    assert.equal(d.snapshot('t').actors.rabbit.energy, 0);

    d.applyIntent(makeIntent('rabbit', 'sleep', { barrioId: 'blockly-editor' }));
    const noEnergy = d.applyIntent(
      makeIntent('rabbit', 'wake', {
        tool: 'barrio.ping',
        barrioId: 'blockly-editor'
      })
    );
    assert.equal(noEnergy.ok, false);
    assert.equal(noEnergy.error, 'energia_insuficiente');

    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'plaza' }));
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'announce', { message: 'reposo' })).ok,
      true
    );
    assert.equal(d.snapshot('t').actors.rabbit.energy, 1);

    d.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
    );
    assert.equal(
      d.applyIntent(
        makeIntent('rabbit', 'wake', {
          tool: 'barrio.ping',
          barrioId: 'blockly-editor'
        })
      ).ok,
      true
    );
  });

  it('objetivo colectivo: snapshot.objetivo vivos/umbral/cumplido', () => {
    const d = createCiudadDomainState({
      now: () => 1,
      gamemap: loadGamemap(),
      aliveTargetK: 999,
      initialEnergy: 3
    });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    let snap = d.snapshot('pre');
    const vivosSeed = snap.objetivo.vivos;
    assert.equal(snap.objetivo.umbral, 999);
    assert.equal(snap.objetivo.cumplido, false);
    assert.ok(vivosSeed >= 0);

    // Umbral = vivos actuales + 1 → hace falta un wake para cumplir.
    const d2 = createCiudadDomainState({
      now: () => 1,
      gamemap: loadGamemap(),
      aliveTargetK: vivosSeed + 1,
      initialEnergy: 3
    });
    d2.applyIntent(makeIntent('rabbit', 'join', {}));
    snap = d2.snapshot('pre');
    assert.equal(snap.objetivo.cumplido, false);

    d2.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
    d2.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
    );
    d2.applyIntent(
      makeIntent('rabbit', 'wake', {
        tool: 'barrio.ping',
        barrioId: 'blockly-editor'
      })
    );
    snap = d2.snapshot('post');
    assert.equal(snap.objetivo.vivos, vivosSeed + 1);
    assert.equal(snap.objetivo.umbral, vivosSeed + 1);
    assert.equal(snap.objetivo.cumplido, true);
  });
});

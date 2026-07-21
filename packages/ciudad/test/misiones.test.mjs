/**
 * CA misiones: selección por censo + viaje Z10 + idle random-walk.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import { sceneFromGamemap } from '../src/scene.mjs';
import {
  DECAY_BIAS_ESTADOS,
  nextCitizenBehavior,
  nextIdleWalk,
  planMissionViaje,
  selectMission,
  streetsFromGamemap
} from '../src/misiones.mjs';

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

describe('ciudad misiones', () => {
  it('selectMission elige barrio decay (no random puro) trazable al censo', () => {
    const gamemap = loadGamemap();
    const scene = sceneFromGamemap(gamemap);
    const sel = selectMission({
      barrios: scene.barrios,
      homeZoneId: 'plaza',
      currentNodeId: 'plaza',
      rng: () => 0
    });
    assert.equal(sel.kind, 'viaje');
    assert.equal(sel.reason, 'censo_decay_bias');
    assert.ok(DECAY_BIAS_ESTADOS.includes(sel.barrioEstado));
    assert.equal(sel.origin, 'plaza');
    assert.ok(sel.destination);
    assert.ok(sel.selection?.picked);
    assert.ok(sel.selection?.candidateIds?.includes(sel.barrioId));
    // workflow-editor es muerto en seeds — rank alto entre decay.
    assert.ok(
      ['workflow-editor', 'stream-desktop', 'stream-desktop-app-cronos'].includes(
        sel.barrioId
      ) || sel.barrioEstado === 'muerto' || sel.barrioEstado === 'roto' || sel.barrioEstado === 'latente'
    );
  });

  it('selectMission prioriza mismo distrito home cuando hay candidatos', () => {
    const barrios = {
      'local-latente': {
        id: 'local-latente',
        estado: 'latente',
        parent: 'editores',
        anchorId: 'ancla-local'
      },
      'far-muerto': {
        id: 'far-muerto',
        estado: 'muerto',
        parent: 'infra-ui',
        anchorId: 'ancla-far'
      }
    };
    const sel = selectMission({
      barrios,
      homeZoneId: 'editores',
      currentNodeId: 'editores',
      rng: () => 0
    });
    // sameZone latente gana sobre far muerto? sort: sameZone first, then rank.
    // far-muerto rank=1, local-latente rank=2 but sameZone — sameZone wins.
    assert.equal(sel.barrioId, 'local-latente');
    assert.equal(sel.destination, 'editores');
    assert.equal(sel.selection.sameZone, true);
  });

  it('idle random-walk no usa viaje (solo vecino)', () => {
    const gamemap = loadGamemap();
    const idle = nextIdleWalk({
      currentNodeId: 'plaza',
      enlaces: gamemap.enlaces,
      rng: () => 0
    });
    assert.equal(idle.kind, 'idle');
    assert.equal(idle.reason, 'idle_random_walk');
    assert.equal(idle.walk.nodeId, 'zigurat');
    assert.ok(idle.candidates.includes('zigurat'));
  });

  it('planMissionViaje usa grafo Z10 (path plaza→editores)', async () => {
    const gamemap = loadGamemap();
    const streets = streetsFromGamemap(gamemap);
    assert.ok(streets.plaza?.includes('zigurat'));
    const planned = await planMissionViaje({
      gamemap,
      origin: 'plaza',
      destination: 'editores',
      barrioId: 'workflow-editor',
      anchorId: 'ancla-workflow-editor',
      viajeId: 'test-mision-workflow'
    });
    assert.equal(planned.ok, true, JSON.stringify(planned));
    assert.deepEqual(planned.path, ['plaza', 'zigurat', 'editores']);
    assert.ok(planned.walks.length >= 2);
    assert.equal(planned.walks[0].nodeId, 'zigurat');
    assert.equal(planned.walks[1].nodeId, 'editores');
    const last = planned.walks[planned.walks.length - 1];
    assert.equal(last.anchorId, 'ancla-workflow-editor');
  });

  it('nextCitizenBehavior misión → walks aplicables al dominio', async () => {
    const gamemap = loadGamemap();
    const d = createCiudadDomainState({ now: () => 42, gamemap });
    d.applyIntent(makeIntent('aleph', 'join', {}));

    const behavior = await nextCitizenBehavior({
      barrios: d.snapshot('t').barrios,
      homeZoneId: 'plaza',
      currentNodeId: 'plaza',
      gamemap,
      rng: () => 0,
      viajeId: 'smoke-mision-aleph'
    });
    assert.equal(behavior.kind, 'viaje', JSON.stringify(behavior));
    assert.equal(behavior.mission.reason, 'censo_decay_bias');
    assert.ok(behavior.path?.length >= 2);

    for (const hop of behavior.walks) {
      const args = hop.anchorId
        ? { anchorId: hop.anchorId }
        : { nodeId: hop.nodeId };
      const r = d.applyIntent(makeIntent('aleph', 'walk', args));
      assert.equal(r.ok, true, JSON.stringify({ hop, r }));
    }
    const actor = d.snapshot('end').actors.aleph;
    assert.ok(actor.nodeId);
  });

  it('forceIdle ignora decay y hace random-walk', async () => {
    const gamemap = loadGamemap();
    const behavior = await nextCitizenBehavior({
      barrios: sceneFromGamemap(gamemap).barrios,
      homeZoneId: 'plaza',
      currentNodeId: 'plaza',
      gamemap,
      forceIdle: true,
      rng: () => 0
    });
    assert.equal(behavior.kind, 'idle');
    assert.equal(behavior.reason, 'idle_random_walk');
    assert.equal(behavior.walk.nodeId, 'zigurat');
  });
});

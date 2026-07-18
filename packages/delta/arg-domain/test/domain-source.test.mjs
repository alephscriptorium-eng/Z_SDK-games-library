/**
 * WP-U94 — una sola fuente por transición: gate y mutador comparten
 * validateCurate / validateEmptySea y el mismo error en casos inválidos.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  makeIntent,
  reduceArgIntent,
  createLineBoard,
  createFlowEngine,
  deltaV0,
  validateCurate,
  validateEmptySea
} from '../src/index.mjs';

function curateView(regPatch = {}) {
  return {
    scene: { spawnNodeId: 'plaza', contactRadius: 3.5, labelset: [], mar: {} },
    nav: { nodos: { plaza: { id: 'plaza', zone: 'terraza', position: { x: 0, y: 0, z: 0 } } }, enlaces: {} },
    actors: {
      uno: {
        id: 'uno',
        zone: 'terraza',
        nodeId: 'plaza',
        score: { curated: 0 }
      }
    },
    lines: {
      'linea-aleph': {
        id: 'linea-aleph',
        registros: {
          P03: {
            id: 'P03',
            oldid: 1882,
            cached: true,
            deltaStatus: 'pending',
            milestone: null,
            ...regPatch
          }
        }
      }
    }
  };
}

test('curate: gate y mutador comparten validateCurate (status_salto)', () => {
  const reg = { cached: true, deltaStatus: 'pending' };
  const shared = validateCurate(reg, 'curated');
  assert.equal(shared.ok, false);
  assert.equal(shared.error, 'status_salto');

  const gate = reduceArgIntent(
    curateView(),
    makeIntent('uno', 'curate', {
      lineId: 'linea-aleph',
      registroId: 'P03',
      to: 'curated',
      role: 'dj'
    })
  );
  assert.equal(gate.error, shared.error);

  const board = createLineBoard();
  board.cache('linea-aleph', 'P03');
  const mut = board.curate('linea-aleph', 'P03', 'curated');
  assert.equal(mut.error, shared.error);
});

test('curate: mismo error no_cacheado desde validateCurate', () => {
  const shared = validateCurate({ cached: false, deltaStatus: 'pending' }, 'draft');
  assert.equal(shared.error, 'no_cacheado');

  const gate = reduceArgIntent(
    curateView({ cached: false }),
    makeIntent('uno', 'curate', {
      lineId: 'linea-aleph',
      registroId: 'P03',
      to: 'draft',
      role: 'dj'
    })
  );
  assert.equal(gate.error, shared.error);
  assert.equal(createLineBoard().curate('linea-aleph', 'P03', 'draft').error, shared.error);
});

test('vaciar: gate y mutador comparten validateEmptySea (nada_que_vaciar)', () => {
  const sea = { collapsed: false };
  const droplets = [{ id: 'f1', state: 'floating' }];
  const shared = validateEmptySea(sea, droplets);
  assert.equal(shared.ok, false);
  assert.equal(shared.error, 'nada_que_vaciar');

  const view = {
    scene: {
      spawnNodeId: 'plaza',
      contactRadius: 3.5,
      labelset: [],
      mar: {}
    },
    nav: {
      nodos: {
        'orilla-mar': { id: 'orilla-mar', zone: 'mar', position: { x: 0, y: 0, z: 10 } }
      },
      enlaces: {}
    },
    actors: {
      uno: { id: 'uno', zone: 'mar', nodeId: 'orilla-mar', score: { emptied: 0 } }
    },
    sea,
    seaDroplets: () => droplets
  };
  const gate = reduceArgIntent(view, makeIntent('uno', 'empty', {}));
  assert.equal(gate.error, shared.error);

  const feed = {
    nextDroplet: () => ({ id: 'x', ref: { kind: 'micropost', uri: 'syn://x' } }),
    commitLabel: async () => {}
  };
  const flow = createFlowEngine(deltaV0, feed);
  flow.sea.droplets.push({ id: 'f1', ref: { uri: 'b' }, label: 'agora', state: 'floating', seq: 1 });
  assert.equal(flow.emptySoft('uno').error, shared.error);
});

test('vaciar: mismo error mar_colapsado desde validateEmptySea', () => {
  const shared = validateEmptySea({ collapsed: true }, [{ id: 's1', state: 'sunken' }]);
  assert.equal(shared.error, 'mar_colapsado');

  const view = {
    scene: { spawnNodeId: 'plaza', contactRadius: 3.5, labelset: [], mar: {} },
    nav: {
      nodos: {
        'orilla-mar': { id: 'orilla-mar', zone: 'mar', position: { x: 0, y: 0, z: 10 } }
      },
      enlaces: {}
    },
    actors: {
      uno: { id: 'uno', zone: 'mar', nodeId: 'orilla-mar', score: { emptied: 0 } }
    },
    sea: { collapsed: true },
    seaDroplets: () => [{ id: 's1', state: 'sunken' }]
  };
  assert.equal(reduceArgIntent(view, makeIntent('uno', 'empty', {})).error, shared.error);

  const feed = {
    nextDroplet: () => ({ id: 'x', ref: { kind: 'micropost', uri: 'syn://x' } }),
    commitLabel: async () => {}
  };
  const flow = createFlowEngine(deltaV0, feed);
  flow.sea.collapsed = true;
  flow.sea.droplets.push({ id: 's1', ref: { uri: 'a' }, label: null, state: 'sunken', seq: 1 });
  assert.equal(flow.emptySoft('uno').error, shared.error);
});

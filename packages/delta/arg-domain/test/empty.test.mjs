/**
 * WP-U83 — ciclo vaciar en delta: empty Soft del mar + score/ledger.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  makeIntent,
  INTENT_DEFS,
  reduceArgIntent,
  createArgDomainState,
  resolveFeeds,
  createFlowEngine,
  deltaV0
} from '../src/index.mjs';

function baseView(overrides = {}) {
  return {
    scene: {
      spawnNodeId: 'plaza',
      contactRadius: 3.5,
      labelset: ['agora', 'memoria', 'ruido'],
      mar: {}
    },
    nav: {
      nodos: {
        plaza: { id: 'plaza', zone: 'terraza', position: { x: 0, y: 0, z: 0 } },
        'orilla-mar': { id: 'orilla-mar', zone: 'mar', position: { x: 0, y: 0, z: 10 } }
      },
      enlaces: {}
    },
    actors: {
      uno: {
        id: 'uno',
        zone: 'mar',
        nodeId: 'orilla-mar',
        score: {
          labeled: 0,
          excavated: 0,
          cached: 0,
          curated: 0,
          milestoned: 0,
          emptied: 0
        }
      }
    },
    sea: { collapsed: false, murk: 2, crystals: 0 },
    seaDroplets: () => [
      { id: 'd1', state: 'sunken', label: null },
      { id: 'd2', state: 'floating', label: 'agora' }
    ],
    seaDropletById: (id) =>
      ({ d1: { id: 'd1', state: 'sunken' }, d2: { id: 'd2', state: 'floating' } })[id] ?? null,
    ...overrides
  };
}

function walkTo(state, actorId, nodeId, maxTicks = 400) {
  const res = state.applyIntent(makeIntent(actorId, 'move', { nodeId }));
  assert.equal(res.ok, true, `move ${actorId} → ${nodeId}: ${res.error}`);
  for (let i = 0; i < maxTicks; i++) {
    state.tick(0.1);
    if (state.snapshot().actors[actorId].nodeId === nodeId) return;
  }
  assert.fail(`no llegó a ${nodeId}`);
}

test('empty roles: player|dj (espejo empty_playable U82)', () => {
  assert.deepEqual([...INTENT_DEFS.empty.roles].sort(), ['dj', 'player']);
});

test('empty (reducer): purga sunken cerca del mar + score emptied', () => {
  const res = reduceArgIntent(baseView(), makeIntent('uno', 'empty', {}));
  assert.equal(res.ok, true);
  assert.ok(res.ops.some((o) => o.op === 'sea:empty'));
  assert.ok(res.ops.some((o) => o.op === 'actor:score' && o.key === 'emptied'));
});

test('empty (reducer): rechazos fuera_de_mar / nada_que_vaciar / mar_colapsado', () => {
  assert.equal(
    reduceArgIntent(
      baseView({
        actors: {
          uno: { id: 'uno', zone: 'terraza', nodeId: 'plaza', score: { emptied: 0 } }
        }
      }),
      makeIntent('uno', 'empty', {})
    ).error,
    'fuera_de_mar'
  );
  assert.equal(
    reduceArgIntent(baseView({ seaDroplets: () => [] }), makeIntent('uno', 'empty', {})).error,
    'nada_que_vaciar'
  );
  assert.equal(
    reduceArgIntent(baseView({ sea: { collapsed: true } }), makeIntent('uno', 'empty', {})).error,
    'mar_colapsado'
  );
});

test('flow.emptySoft: quita sunken, baja murk, emite empty', () => {
  const feed = {
    nextDroplet: () => ({ id: 'x', ref: { kind: 'micropost', uri: 'syn://x' } }),
    commitLabel: async () => {}
  };
  const flow = createFlowEngine(deltaV0, feed);
  flow.sea.murk = 3;
  flow.sea.droplets.push(
    { id: 's1', ref: { uri: 'a' }, label: null, state: 'sunken', seq: 1 },
    { id: 'f1', ref: { uri: 'b' }, label: 'agora', state: 'floating', seq: 2 }
  );
  const r = flow.emptySoft('uno');
  assert.equal(r.ok, true);
  assert.equal(r.removed, 1);
  assert.equal(flow.sea.murk, 2);
  assert.equal(flow.sea.droplets.length, 1);
  assert.equal(flow.sea.droplets[0].state, 'floating');
  const ev = flow.drainEvents().find((e) => e.kind === 'empty');
  assert.ok(ev);
  assert.equal(ev.actorId, 'uno');
  assert.equal(flow.emptySoft('uno').error, 'nada_que_vaciar');
});

test('empty (domain-state): ledger + score.emptied tras vertido', () => {
  const scene = {
    ...deltaV0,
    mar: { ...deltaV0.mar, murkCapacity: 10000 },
    taps: {
      'grifo-a': { ...deltaV0.taps['grifo-a'], spawnRate: 2, inflowRate: 0, releaseRate: 1 },
      'grifo-b': { ...deltaV0.taps['grifo-b'], spawnRate: 0, inflowRate: 0, releaseRate: 1 }
    }
  };
  const state = createArgDomainState({
    scene,
    feeds: resolveFeeds({ mode: 'synthetic', seed: 11 }),
    gamemap: { id: 'gm-empty', objetivo: { labeled: 99, excavated: 99 } }
  });
  assert.equal(state.applyIntent(makeIntent('uno', 'join')).ok, true);

  walkTo(state, 'uno', 'terraza-a');
  walkTo(state, 'uno', 'cima-a');
  assert.equal(
    state.applyIntent(makeIntent('uno', 'contact:request', { targetId: 'grifo-a' })).ok,
    true
  );
  assert.equal(
    state.applyIntent(makeIntent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 })).ok,
    true
  );

  for (let i = 0; i < 80; i++) state.tick(0.2);
  assert.equal(state.snapshot().sea.collapsed, false);
  const murkBefore = state.snapshot().sea.murk;
  assert.ok(murkBefore >= 1, `murk≥1, got ${murkBefore}`);

  state.applyIntent(makeIntent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 0 }));
  walkTo(state, 'uno', 'terraza-a');
  walkTo(state, 'uno', 'plaza');
  walkTo(state, 'uno', 'orilla-mar');

  const emptied = state.applyIntent(makeIntent('uno', 'empty', {}));
  assert.equal(emptied.ok, true, emptied.error);
  state.tick(0.1);
  const out = state.drainOutbox();
  const entry = out.ledger.find((e) => e.kind === 'empty');
  assert.ok(entry, 'ledger empty');
  assert.equal(entry.actorId, 'uno');
  assert.equal(entry.detail.opsIntent, 'empty_playable');
  assert.ok(entry.detail.removed >= 1);
  assert.equal(state.snapshot().actors.uno.score.emptied, 1);
  assert.ok(state.snapshot().sea.murk < murkBefore);
  assert.equal(state.applyIntent(makeIntent('uno', 'empty', {})).error, 'nada_que_vaciar');
});

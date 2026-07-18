import test from 'node:test';
import assert from 'node:assert/strict';

import { checkSnapshotBudget, SNAPSHOT_BUDGET_BYTES } from '@zeus/protocol';
import { createArgDomainState, resolveFeeds, makeIntent, deltaV0, createFlowEngine } from '../src/index.mjs';
/** Escena de estrés: ríos largos + grifos rápidos → muchas gotas en vuelo y mar lleno. */
function stressScene() {
  const longWp = [
    { x: 0, y: 0, z: 0 },
    { x: 400, y: 0, z: 0 }
  ];
  return {
    ...deltaV0,
    taps: {
      'grifo-a': { ...deltaV0.taps['grifo-a'], spawnRate: 2.5, inflowRate: 0, releaseRate: 1 },
      'grifo-b': { ...deltaV0.taps['grifo-b'], spawnRate: 2.5, inflowRate: 0, releaseRate: 1 }
    },
    rios: {
      'rio-a': { ...deltaV0.rios['rio-a'], flowSpeed: 10, waypoints: longWp },
      'rio-b': { ...deltaV0.rios['rio-b'], flowSpeed: 10, waypoints: longWp }
    },
    mar: { ...deltaV0.mar, murkCapacity: 10000 }
  };
}

function makeState() {
  return createArgDomainState({
    feeds: resolveFeeds({ mode: 'synthetic', seed: 11 }),
    gamemap: { id: 'gm-test', objetivo: { labeled: 1, excavated: 1 } }
  });
}

function actor(state, id) {
  return state.snapshot().actors[id];
}

function walkTo(state, actorId, nodeId, maxTicks = 400) {
  const res = state.applyIntent(makeIntent(actorId, 'move', { nodeId }));
  assert.equal(res.ok, true, `move ${actorId} → ${nodeId}: ${res.error}`);
  for (let i = 0; i < maxTicks; i++) {
    state.tick(0.1);
    if (actor(state, actorId).nodeId === nodeId) return;
  }
  assert.fail(`no llegó a ${nodeId}`);
}

test('nav-graph delta-v0: todo nodo alcanzable desde el spawn (WP-01)', () => {
  const state = makeState();
  const { nodos, enlaces } = state.nav;
  const seen = new Set([deltaV0.spawnNodeId]);
  const queue = [deltaV0.spawnNodeId];
  while (queue.length) {
    const node = queue.shift();
    for (const link of Object.values(enlaces)) {
      for (const next of [link.from === node ? link.to : null, link.to === node ? link.from : null]) {
        if (next && !seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
  }
  assert.equal(seen.size, Object.keys(nodos).length, 'nodos inalcanzables en el nav-graph');
});

test('bucle completo: join → cima → grifo → río → etiqueta → ledger → objetivo', () => {
  const state = makeState();
  assert.equal(state.applyIntent(makeIntent('uno', 'join')).ok, true);
  assert.equal(state.applyIntent(makeIntent('dos', 'join')).ok, true);
  assert.equal(actor(state, 'uno').nodeId, 'plaza');

  // tap:set sin contacto es inválido (no-op)
  assert.equal(state.applyIntent(makeIntent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 })).error, 'sin_contacto');

  walkTo(state, 'uno', 'terraza-a');
  walkTo(state, 'uno', 'cima-a');
  assert.equal(state.applyIntent(makeIntent('uno', 'contact:request', { targetId: 'grifo-a' })).ok, true);
  assert.equal(state.applyIntent(makeIntent('uno', 'tap:set', { tapId: 'grifo-a', aperture: 1 })).ok, true);

  // dos baja al embarcadero y monta el río
  walkTo(state, 'dos', 'terraza-a');
  walkTo(state, 'dos', 'embarcadero-a');
  for (let i = 0; i < 20; i++) state.tick(0.1); // que el grifo suelte gotas
  assert.equal(state.applyIntent(makeIntent('dos', 'ride', { riverId: 'rio-a' })).ok, true);
  assert.equal(actor(state, 'dos').pose, 'ride');

  // cabalga hasta tener gota debajo y etiqueta
  let labeled = false;
  for (let i = 0; i < 300 && !labeled; i++) {
    state.tick(0.1);
    const res = state.applyIntent(makeIntent('dos', 'label:cast', { label: 'agora' }));
    if (res.ok) labeled = true;
    if (!actor(state, 'dos').riding) break; // llegó a la desembocadura
  }
  assert.equal(labeled, true, 'nunca hubo gota bajo los pies');
  state.tick(0.1); // recoger el evento label en el ledger

  const out = state.drainOutbox();
  assert.ok(out.ledger.some((e) => e.kind === 'label'), 'ledger label');
  assert.ok(out.tracks.some((t) => t.actorId === 'dos' && t.hint === 'firehose-browser'), 'track de gota');
  assert.equal(actor(state, 'dos').score.labeled, 1);
});

test('desembocadura: el río suelta al jinete en la orilla', () => {
  const state = makeState();
  state.applyIntent(makeIntent('uno', 'join'));
  walkTo(state, 'uno', 'terraza-a');
  walkTo(state, 'uno', 'embarcadero-a');
  state.applyIntent(makeIntent('uno', 'ride', { riverId: 'rio-a' }));
  for (let i = 0; i < 800 && actor(state, 'uno').riding; i++) state.tick(0.1);
  assert.equal(actor(state, 'uno').riding, null);
  assert.equal(actor(state, 'uno').nodeId, 'orilla-mar');
  assert.equal(actor(state, 'uno').zone, 'mar');
});

test('cantera: caminar cámaras emite track, excavar abre pasillo y ledger', () => {
  const state = makeState();
  state.applyIntent(makeIntent('uno', 'join'));
  walkTo(state, 'uno', 'orilla-mar');
  walkTo(state, 'uno', 'cantera-entrada');
  walkTo(state, 'uno', 'camara-0-2');

  let out = state.drainOutbox();
  assert.ok(
    out.tracks.some((t) => t.ref.uri.startsWith('linea://nodo/') && t.hint === 'cache-browser'),
    'track de cámara cacheada'
  );

  // pasillo fantasma hacia arriba: excavar y esperar la apertura
  assert.equal(
    state.applyIntent(makeIntent('uno', 'move', { nodeId: 'camara-0-1' })).error,
    'pasillo_cerrado'
  );
  assert.equal(
    state.applyIntent(makeIntent('uno', 'excavate', { corridorId: 'pasillo-camara-0-1--camara-0-2' })).ok,
    true
  );
  for (let i = 0; i < 30; i++) state.tick(0.1);
  out = state.drainOutbox();
  assert.ok(out.ledger.some((e) => e.kind === 'excavate'), 'ledger excavate');
  walkTo(state, 'uno', 'camara-0-1'); // ahora sí
});

test('snapshot compacto: cabe en presupuesto con carga (G-ARG.5)', () => {
  const state = makeState();
  for (let i = 0; i < 8; i++) state.applyIntent(makeIntent(`bot-${i}`, 'join'));
  state.applyIntent(makeIntent('op', 'join'));
  walkTo(state, 'op', 'terraza-a');
  walkTo(state, 'op', 'cima-a');
  state.applyIntent(makeIntent('op', 'contact:request', { targetId: 'grifo-a' }));
  state.applyIntent(makeIntent('op', 'tap:set', { tapId: 'grifo-a', aperture: 1 }));
  for (let i = 0; i < 600; i++) state.tick(0.1); // ~60 s de gotas
  const snap = state.snapshot('change', { fullMaze: true });
  const { ok, bytes, budget } = checkSnapshotBudget(snap);
  assert.ok(ok, `snapshot ${bytes} bytes ≥ ${budget}`);
  assert.equal(budget, SNAPSHOT_BUDGET_BYTES);
  assert.equal(snap.sceneId, 'delta-v0');
  assert.ok(Object.keys(snap.rivers['rio-a'].droplets.length ? snap.rivers : snap.rivers).length);
});
test('budget G-ARG.5: pool mar lleno + 200 gotas de río < 32 KB', () => {
  const scene = stressScene();
  const feeds = resolveFeeds({ mode: 'synthetic', seed: 42 });
  const flow = createFlowEngine(scene, feeds.firehose);
  const { floating: maxF, sunken: maxS } = scene.mar.seaPoolMax;
  const poolMax = maxF + maxS;

  flow.setAperture('grifo-a', 1);
  flow.setAperture('grifo-b', 1);

  for (let i = 0; i < 8000; i++) {
    flow.tick(0.05);
    for (const d of flow.droplets('rio-a')) {
      if (!d.label && flow.sea.droplets.filter((x) => x.state === 'floating').length < maxF) {
        flow.labelDroplet('rio-a', d.id, 'agora');
      }
    }
    const seaCount = flow.sea.droplets.length;
    const riverCount = flow.droplets('rio-a').length + flow.droplets('rio-b').length;
    if (seaCount >= poolMax && riverCount >= 200) {
      flow.setAperture('grifo-a', 0);
      flow.setAperture('grifo-b', 0);
      break;
    }
  }

  const flowSnap = flow.snapshot();
  assert.ok(flowSnap.sea.droplets.length >= poolMax, `pool ${flowSnap.sea.droplets.length}/${poolMax}`);
  const riverDroplets =
    flowSnap.rivers['rio-a'].droplets.length + flowSnap.rivers['rio-b'].droplets.length;
  assert.ok(riverDroplets >= 200, `solo ${riverDroplets} gotas en río`);

  const state = createArgDomainState({
    scene,
    feeds,
    gamemap: { id: 'gm-stress', objetivo: { labeled: 999, excavated: 999 } }
  });
  const baseSnap = state.snapshot('change');
  const snap = { ...baseSnap, taps: flowSnap.taps, rivers: flowSnap.rivers, sea: flowSnap.sea };

  const { ok, bytes, budget } = checkSnapshotBudget(snap);
  assert.ok(ok, `snapshot ${bytes} bytes ≥ ${budget}`);
  assert.equal(budget, SNAPSHOT_BUDGET_BYTES);
});
test('contacto: cerca del grifo en la cima abre contacto', () => {
  const state = makeState();
  state.applyIntent(makeIntent('uno', 'join'));
  walkTo(state, 'uno', 'terraza-a');
  walkTo(state, 'uno', 'cima-a');
  const res = state.applyIntent(makeIntent('uno', 'contact:request', { targetId: 'grifo-a' }));
  assert.equal(res.ok, true);
  const contacts = state.snapshot().contacts;
  assert.equal(Object.values(contacts)[0].state, 'open');
});

test('rol no autorizado ⇒ rechazo (WP-U10)', () => {
  const state = makeState();
  assert.equal(state.applyIntent(makeIntent('uno', 'join')).ok, true);
  const denied = state.applyIntent(
    makeIntent('uno', 'move', { nodeId: 'terraza-a', role: 'dj' })
  );
  assert.equal(denied.ok, false);
  assert.equal(denied.error, 'rol_no_autorizado');
  assert.equal(actor(state, 'uno').nodeId, deltaV0.spawnNodeId);
});

test('WP-U30 dj: cache/curate/milestone → ledger + score; player rechazado', () => {
  const state = makeState();
  assert.equal(state.applyIntent(makeIntent('dj1', 'join')).ok, true);

  const asPlayer = state.applyIntent(
    makeIntent('dj1', 'cache', { lineId: 'linea-aleph', registroId: 'P03' })
  );
  assert.equal(asPlayer.ok, false);
  assert.equal(asPlayer.error, 'rol_no_autorizado');

  assert.equal(
    state.applyIntent(
      makeIntent('dj1', 'cache', { lineId: 'linea-aleph', registroId: 'P03', role: 'dj' })
    ).ok,
    true
  );
  assert.equal(
    state.applyIntent(
      makeIntent('dj1', 'curate', { lineId: 'linea-aleph', registroId: 'P03', role: 'dj' })
    ).ok,
    true
  );
  assert.equal(
    state.applyIntent(
      makeIntent('dj1', 'curate', {
        lineId: 'linea-aleph',
        registroId: 'P03',
        to: 'curated',
        role: 'dj'
      })
    ).ok,
    true
  );
  assert.equal(
    state.applyIntent(
      makeIntent('dj1', 'milestone', {
        lineId: 'linea-aleph',
        registroId: 'P03',
        reasons: ['byte_delta'],
        role: 'dj'
      })
    ).ok,
    true
  );

  state.tick(0.1);
  const out = state.drainOutbox();
  assert.ok(out.ledger.some((e) => e.kind === 'cache' && e.actorId === 'dj1'), 'ledger cache');
  assert.ok(
    out.ledger.some((e) => e.kind === 'curate' && e.detail?.status === 'draft'),
    'ledger curate draft'
  );
  assert.ok(
    out.ledger.some((e) => e.kind === 'curate' && e.detail?.status === 'curated'),
    'ledger curate curated'
  );
  assert.ok(
    out.ledger.some(
      (e) => e.kind === 'milestone' && e.detail?.reasons?.includes('byte_delta')
    ),
    'ledger milestone'
  );

  const score = actor(state, 'dj1').score;
  assert.equal(score.cached, 1);
  assert.equal(score.curated, 2);
  assert.equal(score.milestoned, 1);

  const lines = state.snapshot().lines;
  assert.ok(lines.regs.some((r) => r[1] === 'P03' && r[2] === 1 && r[3] === 2 && r[4] === 1));
});

test('WP-U32 operator: inspect → ledger; player rechazado', () => {
  const state = makeState();

  const asPlayer = state.applyIntent(
    makeIntent('spoof', 'inspect', { targetId: 'spawn' }, { role: 'player' })
  );
  assert.equal(asPlayer.ok, false);
  assert.equal(asPlayer.error, 'rol_no_autorizado');

  const asOp = state.applyIntent(
    makeIntent('op-1', 'inspect', { targetId: 'spawn', label: 'look' }, { role: 'operator' })
  );
  assert.equal(asOp.ok, true);

  const out = state.drainOutbox();
  const entry = out.ledger.find((e) => e.kind === 'inspect');
  assert.ok(entry, 'ledger inspect');
  assert.equal(entry.actorId, 'op-1');
  assert.equal(entry.detail?.targetId, 'spawn');
  assert.equal(entry.detail?.label, 'look');
});

const U92_FORCES = {
  boot: 'boot-x',
  activation: {
    session_budget: { max_active_forces: 2, boot_always_on: true },
    exclusions: [{ pair: ['force-p', 'force-q'], reason: 'exclusive' }],
    cotas: { lower: 'cota-lo', upper: 'cota-hi' }
  },
  forces: [
    { id: 'boot-x', kind: 'boot', anchor_scene: 'sesion-01/01-boot' },
    { id: 'force-p', kind: 'force', anchor_scene: 'sesion-01/01-p' },
    { id: 'force-q', kind: 'force', anchor_scene: 'sesion-01/01-q' },
    { id: 'force-r', kind: 'force', anchor_scene: 'sesion-01/01-r' }
  ],
  cotas: [
    { id: 'cota-lo', bound: 'lower', pole: 'colapso', anchor_scene: 'sesion-01/01-lo' },
    { id: 'cota-hi', bound: 'upper', pole: 'victoria', anchor_scene: 'sesion-01/01-hi' }
  ]
};

test('WP-U92 force:activate → ledger + track; budget y exclusión en dry-run', () => {
  const state = createArgDomainState({
    feeds: resolveFeeds({ mode: 'synthetic', seed: 11 }),
    gamemap: { id: 'gm-force', objetivo: { labeled: 99, excavated: 99 } },
    forcesRegistry: U92_FORCES
  });

  const snap0 = state.snapshot();
  assert.deepEqual(snap0.forces.active, ['boot-x']);
  assert.equal(snap0.forces.cotas.lower, 'cota-lo');
  assert.equal(snap0.forces.cotas.upper, 'cota-hi');
  assert.equal(snap0.forces.cotas.pole, 'entre');

  const asPlayer = state.applyIntent(
    makeIntent('p', 'force:activate', { forceId: 'force-p' }, { role: 'player' })
  );
  assert.equal(asPlayer.error, 'rol_no_autorizado');

  const ok = state.applyIntent(
    makeIntent('dj-1', 'force:activate', { forceId: 'force-p' }, { role: 'dj' })
  );
  assert.equal(ok.ok, true);
  assert.deepEqual(state.snapshot().forces.active, ['boot-x', 'force-p']);

  const out = state.drainOutbox();
  const led = out.ledger.find((e) => e.kind === 'force:activate');
  assert.ok(led, 'ledger force:activate');
  assert.equal(led.detail.forceId, 'force-p');
  const tr = out.tracks.find((t) => t.hint === 'force-browser');
  assert.ok(tr, 'track ancla');
  assert.equal(tr.ref.uri, 'force://force-p/scene/sesion-01/01-p');

  const third = state.applyIntent(
    makeIntent('dj-1', 'force:activate', { forceId: 'force-r' }, { role: 'operator' })
  );
  assert.equal(third.ok, false);
  assert.equal(third.error, 'session_budget_exceeded');
  assert.equal(state.drainOutbox().ledger.length, 0);

  const wide = createArgDomainState({
    feeds: resolveFeeds({ mode: 'synthetic', seed: 12 }),
    gamemap: { id: 'gm-force2', objetivo: { labeled: 99, excavated: 99 } },
    forcesRegistry: {
      ...U92_FORCES,
      activation: {
        ...U92_FORCES.activation,
        session_budget: { max_active_forces: 3, boot_always_on: true }
      }
    }
  });
  assert.equal(
    wide.applyIntent(makeIntent('op', 'force:activate', { forceId: 'force-p' }, { role: 'operator' })).ok,
    true
  );
  assert.equal(
    wide.applyIntent(makeIntent('op', 'force:activate', { forceId: 'force-q' }, { role: 'operator' })).error,
    'pair_excluded'
  );
});

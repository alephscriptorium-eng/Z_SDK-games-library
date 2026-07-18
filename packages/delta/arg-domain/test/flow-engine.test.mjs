import test from 'node:test';
import assert from 'node:assert/strict';

import { createFlowEngine } from '../src/flow-engine.mjs';
import { createSyntheticFirehoseFeed } from '../src/feeds/synthetic.mjs';

/** Mini-escena: un grifo y un río corto, números redondos para testear. */
function miniScene({ murkCapacity = 3, seaPoolMax, inflowRate = 0.1 } = {}) {
  return {
    taps: {
      'grifo-t': {
        id: 'grifo-t',
        summitNodeId: 'cima-t',
        riverId: 'rio-t',
        aperture: 0,
        spawnRate: 1,
        inflowRate,
        releaseRate: 0.2,
        floodMurkRate: 1,
        burstDurationSec: 2,
        burstCooldownSec: 1
      }
    },
    rios: {
      'rio-t': {
        id: 'rio-t',
        tapId: 'grifo-t',
        flowSpeed: 1,
        embarkNodeId: 'nodo-e',
        embarkProgress: 0.5,
        mouthNodeId: 'nodo-m',
        waypoints: [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 }
        ]
      }
    },
    mar: {
      murkCapacity,
      ...(seaPoolMax ? { seaPoolMax } : {})
    }
  };
}

function makeEngine(opts) {
  return createFlowEngine(miniScene(opts), createSyntheticFirehoseFeed({ seed: 7 }));
}

test('presión: sube con grifo cerrado, alivia con grifo abierto', () => {
  const flow = makeEngine();
  flow.tick(5); // cerrado: +0.1/s
  assert.ok(Math.abs(flow.taps['grifo-t'].pressure - 0.5) < 1e-9);
  flow.setAperture('grifo-t', 1);
  flow.tick(2); // abierto: -0.2/s
  assert.ok(Math.abs(flow.taps['grifo-t'].pressure - 0.1) < 1e-9);
});

test('gotas: spawn con apertura, avanzan y sin etiqueta vierten murk', () => {
  const flow = makeEngine({ murkCapacity: 100 });
  flow.setAperture('grifo-t', 1);
  flow.tick(1); // spawnRate 1 → 1 gota
  assert.equal(flow.droplets('rio-t').length, 1);
  const [d] = flow.droplets('rio-t');
  assert.equal(d.ref.kind, 'micropost');
  flow.setAperture('grifo-t', 0); // una sola gota en cauce
  // flowSpeed 1 × apertura 1 sobre 10 unidades → 10 s hasta el mar
  for (let i = 0; i < 45; i++) flow.tick(1);
  assert.ok(flow.sea.murk >= 1);
  assert.equal(flow.sea.crystals, 0);
  assert.equal(flow.sea.droplets.length, 1);
  assert.equal(flow.sea.droplets[0].state, 'sunken');
  assert.equal(flow.sea.droplets[0].label, null);
});

test('gotas etiquetadas cristalizan y hacen commitLabel al feed', async () => {
  const commits = [];
  const feed = {
    nextDroplets: (n) => Array.from({ length: n }, (_, i) => ({ kind: 'micropost', uri: `u${i}`, corpus: 'raw', index: i })),
    commitLabel: (ref, label) => {
      commits.push({ ref, label });
      return Promise.resolve({ ok: true });
    }
  };
  const flow = createFlowEngine(miniScene({ murkCapacity: 100 }), feed);
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  const [d] = flow.droplets('rio-t');
  const res = flow.labelDroplet('rio-t', d.id, 'agora', 'uno');
  assert.equal(res.ok, true);
  assert.equal(flow.labelDroplet('rio-t', d.id, 'agora').error, 'ya_etiquetada');
  flow.setAperture('grifo-t', 0); // que no entren más gotas al cauce
  for (let i = 0; i < 45; i++) flow.tick(1); // velocidad residual 0.25
  assert.equal(flow.sea.crystals, 1);
  assert.equal(commits.length, 1);
  assert.equal(commits[0].label, 'agora');
  assert.equal(flow.sea.droplets.length, 1);
  assert.equal(flow.sea.droplets[0].state, 'floating');
  assert.equal(flow.sea.droplets[0].label, 'agora');
  const kinds = flow.drainEvents().map((e) => e.kind);
  assert.ok(kinds.includes('label') && kinds.includes('crystal'));
});

test('presión 1 → riada (burst): vierte murk y sale por cooldown a 0.5', () => {
  const flow = makeEngine({ murkCapacity: 100 });
  flow.tick(10); // 0.1/s × 10 s = presión 1 → burst
  assert.equal(flow.taps['grifo-t'].state, 'burst');
  flow.tick(2); // burstDurationSec 2, floodMurkRate 1
  assert.ok(flow.sea.murk >= 2 - 1e-9);
  assert.equal(flow.taps['grifo-t'].state, 'cooldown');
  flow.tick(1.1);
  assert.equal(flow.taps['grifo-t'].state, 'ok');
  assert.ok(Math.abs(flow.taps['grifo-t'].pressure - 0.5) < 1e-9);
  assert.ok(flow.drainEvents().some((e) => e.kind === 'burst'));
});

test('murk sobre capacidad → colapso y el motor se congela', () => {
  const flow = makeEngine({ murkCapacity: 1 });
  flow.tick(10); // burst
  flow.tick(2); // murk 2 > 1 → collapse
  assert.equal(flow.sea.collapsed, true);
  assert.ok(flow.drainEvents().some((e) => e.kind === 'collapse'));
  const murkBefore = flow.sea.murk;
  flow.tick(5);
  assert.equal(flow.sea.murk, murkBefore); // congelado
});

test('dropletUnder: encuentra la gota dentro de la ventana', () => {
  const flow = makeEngine();
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  const [d] = flow.droplets('rio-t');
  assert.equal(flow.dropletUnder('rio-t', d.progress + 0.05)?.id, d.id);
  assert.equal(flow.dropletUnder('rio-t', d.progress + 0.2), null);
});

test('snapshot compacto: la tupla de gota lleva uri (5º slot, WP-25)', () => {
  const flow = makeEngine();
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  const [d] = flow.droplets('rio-t');
  const snap = flow.snapshot();
  const [tuple] = snap.rivers['rio-t'].droplets;
  assert.equal(tuple[0], d.id);
  assert.equal(tuple[2], 'flowing');
  assert.equal(tuple[3], null); // sin etiqueta
  assert.equal(tuple[4], d.ref.uri); // la uri alimenta el inspector HTML
  flow.labelDroplet('rio-t', d.id, 'agora', 'uno');
  const [labeled] = flow.snapshot().rivers['rio-t'].droplets;
  assert.equal(labeled[2], 'crystal');
  assert.equal(labeled[3], 'agora');
  assert.equal(labeled[4], d.ref.uri);
});

test('mar: llegada etiquetada entra floating, sin etiqueta sunken', () => {
  const feed = {
    nextDroplets: (n) => Array.from({ length: n }, (_, i) => ({ kind: 'micropost', uri: `u${i}`, corpus: 'raw', index: i })),
    commitLabel: () => Promise.resolve({ ok: true })
  };
  const flow = createFlowEngine(miniScene({ murkCapacity: 100 }), feed);
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  const [d1] = flow.droplets('rio-t');
  flow.labelDroplet('rio-t', d1.id, 'memoria');
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  flow.setAperture('grifo-t', 0);
  for (let i = 0; i < 45; i++) flow.tick(1);
  const floating = flow.sea.droplets.filter((d) => d.state === 'floating');
  const sunken = flow.sea.droplets.filter((d) => d.state === 'sunken');
  assert.equal(floating.length, 1);
  assert.equal(sunken.length, 1);
  assert.equal(floating[0].label, 'memoria');
});

test('mar: overflow FIFO no toca contadores', () => {
  const feed = {
    nextDroplets: (n) => Array.from({ length: n }, (_, i) => ({ kind: 'micropost', uri: `u${i}`, corpus: 'raw', index: i })),
    commitLabel: () => Promise.resolve({ ok: true })
  };
  const flow = createFlowEngine(
    miniScene({ murkCapacity: 100, seaPoolMax: { floating: 1, sunken: 1 }, inflowRate: 0 }),
    feed
  );
  flow.setAperture('grifo-t', 1);
  for (let round = 0; round < 2; round++) {
    flow.tick(1);
    const [d] = flow.droplets('rio-t');
    flow.labelDroplet('rio-t', d.id, 'agora');
    flow.setAperture('grifo-t', 0);
    for (let j = 0; j < 45; j++) flow.tick(1);
    flow.setAperture('grifo-t', 1);
  }
  for (let round = 0; round < 2; round++) {
    flow.tick(1);
    flow.setAperture('grifo-t', 0);
    for (let j = 0; j < 45; j++) flow.tick(1);
    flow.setAperture('grifo-t', 1);
  }
  flow.setAperture('grifo-t', 0);
  assert.equal(flow.sea.droplets.length, 2);
  assert.equal(flow.sea.droplets.filter((d) => d.state === 'floating').length, 1);
  assert.equal(flow.sea.droplets.filter((d) => d.state === 'sunken').length, 1);
  assert.equal(flow.sea.crystals, 2);
  assert.equal(flow.sea.murk, 2);
  const events = flow.drainEvents();
  assert.ok(events.some((e) => e.kind === 'sea:consolidate'));
  assert.ok(events.some((e) => e.kind === 'sea:lost'));
});

test('mar: salvage sunken→floating, murk−1 crystals+1, commitLabel', async () => {
  const commits = [];
  const feed = {
    nextDroplets: (n) => Array.from({ length: n }, (_, i) => ({ kind: 'micropost', uri: `u${i}`, corpus: 'raw', index: i })),
    commitLabel: (ref, label) => {
      commits.push({ ref, label });
      return Promise.resolve({ ok: true });
    }
  };
  const flow = createFlowEngine(miniScene({ murkCapacity: 100 }), feed);
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  flow.setAperture('grifo-t', 0);
  for (let i = 0; i < 45; i++) flow.tick(1);
  const sunken = flow.sea.droplets[0];
  assert.equal(sunken.state, 'sunken');
  const murkBefore = flow.sea.murk;
  const crystalsBefore = flow.sea.crystals;
  const res = flow.salvage(sunken.id, 'agora', 'rescuer');
  assert.equal(res.ok, true);
  assert.equal(flow.sea.murk, murkBefore - 1);
  assert.equal(flow.sea.crystals, crystalsBefore + 1);
  assert.equal(flow.sea.droplets[0].state, 'floating');
  assert.equal(flow.sea.droplets[0].label, 'agora');
  assert.equal(commits.length, 1);
  const labelEv = flow.drainEvents().find((e) => e.kind === 'label' && e.salvage);
  assert.ok(labelEv);
  assert.equal(labelEv.actorId, 'rescuer');
});

test('mar: salvage rechazado si colapsado', () => {
  const feed = {
    nextDroplets: (n) => Array.from({ length: n }, (_, i) => ({ kind: 'micropost', uri: `u${i}`, corpus: 'raw', index: i })),
    commitLabel: () => Promise.resolve({ ok: true })
  };
  const flow = createFlowEngine(miniScene({ murkCapacity: 100 }), feed);
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  flow.setAperture('grifo-t', 0);
  for (let i = 0; i < 45; i++) flow.tick(1);
  const sunken = flow.sea.droplets[0];
  flow.sea.collapsed = true;
  const res = flow.salvage(sunken.id, 'agora');
  assert.equal(res.ok, false);
  assert.equal(res.error, 'colapsado');
});

test('mar: snapshot incluye droplets compactos', () => {
  const flow = makeEngine({ murkCapacity: 100 });
  flow.setAperture('grifo-t', 1);
  flow.tick(1);
  flow.setAperture('grifo-t', 0);
  for (let i = 0; i < 45; i++) flow.tick(1);
  const snap = flow.snapshot();
  assert.ok(Array.isArray(snap.sea.droplets));
  assert.equal(snap.sea.droplets.length, 1);
  const [id, label, uri, seq] = snap.sea.droplets[0];
  assert.match(id, /^d\d+$/);
  assert.equal(label, null);
  assert.ok(uri);
  assert.equal(typeof seq, 'number');
});

/**
 * Proyección arg:state → vista de reducer (dry-run explicativo) y
 * extractos de evidencia. G-ARG.4: reducción pura, jamás se aplican ops.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  explainIntent,
  compactActor,
  contactsOf,
  summarizeState,
  corridorsFrom
} from '../src/projection.mjs';

function makeActor(overrides = {}) {
  return {
    id: 'uno',
    kind: 'player',
    tier: 'stick',
    cloak: null,
    zone: 'cima',
    nodeId: 'cima-a',
    linkId: null,
    direction: null,
    progress: null,
    riding: null,
    pose: 'idle',
    emote: null,
    score: { labeled: 0, excavated: 0 },
    position: { x: -14, y: 12, z: -18 },
    ...overrides
  };
}

function makeState(overrides = {}) {
  return {
    v: 1,
    ts: 1000,
    tick: 10,
    reason: 'change',
    sceneId: 'delta-v0',
    gamemapId: 'gamemap-demo',
    actors: { uno: makeActor() },
    taps: {
      'grifo-a': { aperture: 0, pressure: 0.2, state: 'ok' },
      'grifo-b': { aperture: 0, pressure: 0.1, state: 'ok' }
    },
    rivers: {
      'rio-a': { droplets: [['d1', 0.52, 'flowing', null, 'firehose://post/raw/b1/p1.json']] },
      'rio-b': { droplets: [] }
    },
    sea: { crystals: 0, murk: 0, murkCapacity: 60, collapsed: false },
    maze: { rev: 1 },
    contacts: {},
    objetivo: { labeled: [0, 10], excavated: [0, 2] },
    ...overrides
  };
}

function intent(name, args = {}) {
  return { v: 1, from: 'mcp-uno', ts: Date.now(), actorId: 'uno', intent: name, ...args };
}

test('tap:set sin contacto ⇒ sin_contacto (regla real del reducer)', () => {
  const verdict = explainIntent(makeState(), null, intent('tap:set', { tapId: 'grifo-a', aperture: 0.75 }));
  assert.deepEqual(verdict, { ok: false, error: 'sin_contacto' });
});

test('tap:set con contacto abierto ⇒ ok', () => {
  const state = makeState({
    contacts: { 'c-grifo-a--uno': { a: 'uno', b: 'grifo-a', state: 'open' } }
  });
  const verdict = explainIntent(state, null, intent('tap:set', { tapId: 'grifo-a', aperture: 0.75 }));
  assert.equal(verdict.ok, true);
});

test('move a nodo no adyacente ⇒ sin_enlace; a adyacente ⇒ ok (ambos sentidos)', () => {
  const state = makeState();
  assert.equal(explainIntent(state, null, intent('move', { nodeId: 'plaza' })).error, 'sin_enlace');
  assert.equal(explainIntent(state, null, intent('move', { nodeId: 'terraza-a' })).ok, true);
});

test('move por agua depende del cloak-mod (nadar_no_permitido)', () => {
  const seco = makeState({
    actors: {
      uno: makeActor({
        nodeId: 'orilla-mar',
        zone: 'mar',
        cloak: { presetId: 'aleph-tronco-puro', label: 'tronco' },
        position: { x: 0, y: 1, z: 7 }
      })
    }
  });
  assert.equal(explainIntent(seco, null, intent('move', { nodeId: 'boya-1' })).error, 'nadar_no_permitido');
  seco.actors.uno.cloak = { presetId: 'aleph-firehose-browse', label: 'fh' };
  assert.equal(explainIntent(seco, null, intent('move', { nodeId: 'boya-1' })).ok, true);
});

test('label:cast montado encuentra la gota compacta bajo los pies', () => {
  const montado = makeState({
    actors: { uno: makeActor({ nodeId: null, zone: 'rio', riding: { riverId: 'rio-a', progress: 0.5 }, pose: 'ride' }) }
  });
  assert.equal(explainIntent(montado, null, intent('label:cast', { label: 'agora' })).ok, true);
  assert.equal(
    explainIntent(montado, null, intent('label:cast', { label: 'no-es-etiqueta' })).error,
    'etiqueta_invalida'
  );
  // Lejos de toda gota ⇒ sin_gota (ventana LABEL_WINDOW).
  montado.actors.uno.riding.progress = 0.9;
  assert.equal(explainIntent(montado, null, intent('label:cast', { label: 'agora' })).error, 'sin_gota');
});

test('excavate: fuera_de_camara vs adyacente-ghost ok (maze proyectado)', () => {
  const enCamara = makeState({
    actors: { uno: makeActor({ nodeId: 'camara-0-2', zone: 'cantera', position: { x: 20, y: 1, z: 2 } }) }
  });
  // Sin maze recibido: corridorsFrom degrada todo a ghost.
  assert.equal(
    explainIntent(enCamara, null, intent('excavate', { corridorId: 'pasillo-camara-0-2--camara-1-2' })).ok,
    true
  );
  assert.equal(
    explainIntent(enCamara, null, intent('excavate', { corridorId: 'pasillo-camara-2-0--camara-3-0' })).error,
    'fuera_de_camara'
  );
  const maze = {
    rev: 2,
    corridors: { 'pasillo-camara-0-2--camara-1-2': { a: 'camara-0-2', b: 'camara-1-2', state: 'open' } }
  };
  assert.equal(
    explainIntent(enCamara, maze, intent('excavate', { corridorId: 'pasillo-camara-0-2--camara-1-2' })).error,
    'ya_abierto'
  );
});

test('contact:request usa posiciones proyectadas (grifo en su cima)', () => {
  const state = makeState();
  assert.equal(explainIntent(state, null, intent('contact:request', { targetId: 'grifo-a' })).ok, true);
  const lejos = makeState({
    actors: { uno: makeActor({ nodeId: 'plaza', zone: 'terraza', position: { x: 0, y: 4, z: -2 } }) }
  });
  assert.equal(
    explainIntent(lejos, null, intent('contact:request', { targetId: 'grifo-a' })).error,
    'fuera_de_alcance'
  );
});

test('dry-run jamás muta el estado proyectado', () => {
  const state = makeState();
  const frozen = JSON.stringify(state);
  explainIntent(state, null, intent('move', { nodeId: 'terraza-a' }));
  explainIntent(state, null, intent('join'));
  assert.equal(JSON.stringify(state), frozen);
});

test('corridorsFrom sin maze degrada la topología a ghost', () => {
  const corridors = corridorsFrom(null);
  assert.equal(corridors['pasillo-camara-0-2--camara-1-2'].state, 'ghost');
  const maze = { corridors: { x: { state: 'open' } } };
  assert.equal(corridorsFrom(maze).x.state, 'open');
});

test('evidencia: compactActor, contactsOf y summarizeState', () => {
  const state = makeState({
    contacts: {
      'c-grifo-a--uno': { a: 'uno', b: 'grifo-a', state: 'open' },
      'c-dos--grifo-b': { a: 'dos', b: 'grifo-b', state: 'open' }
    }
  });
  assert.equal(compactActor(state, 'uno').nodeId, 'cima-a');
  assert.equal(compactActor(state, 'nadie'), null);
  assert.deepEqual(Object.keys(contactsOf(state, 'uno')), ['c-grifo-a--uno']);

  const resumen = summarizeState(state, 'uno');
  assert.equal(resumen.conectado, true);
  assert.equal(resumen.actor.nodeId, 'cima-a');
  assert.deepEqual(resumen.rios, { 'rio-a': { gotasEnVuelo: 1 }, 'rio-b': { gotasEnVuelo: 0 } });
  assert.deepEqual(resumen.objetivo, { labeled: [0, 10], excavated: [0, 2] });
  assert.deepEqual(summarizeState(null, 'uno'), { conectado: false, actor: null });
});

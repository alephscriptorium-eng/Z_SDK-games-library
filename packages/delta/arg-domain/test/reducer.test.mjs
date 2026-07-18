import test from 'node:test';
import assert from 'node:assert/strict';

import { reduceArgIntent } from '../src/reducer.mjs';
import { makeIntent } from '../src/contract.mjs';
import { effectiveLinkSpeed, cloakModFor } from '../src/cloak-mods.mjs';

function deepFreeze(obj) {
  for (const value of Object.values(obj)) {
    if (value && typeof value === 'object') deepFreeze(value);
  }
  return Object.freeze(obj);
}

/** Vista mínima congelada: cualquier mutación del reducer lanzaría TypeError. */
function makeView({
  actorPatch = {},
  droplet = null,
  contacts = {},
  extraNodos = {},
  extraEnlaces = {},
  lines = null
} = {}) {
  const scene = {
    spawnNodeId: 'plaza',
    labelset: ['agora', 'memoria'],
    contactRadius: 3.5,
    rios: {
      'rio-t': { id: 'rio-t', embarkNodeId: 'embarcadero', embarkProgress: 0.5, mouthNodeId: 'orilla' }
    }
  };
  const nav = {
    nodos: {
      plaza: { id: 'plaza', zone: 'terraza', position: { x: 0, y: 0, z: 0 } },
      'mar-boya': { id: 'mar-boya', zone: 'mar', position: { x: 0, y: 0, z: 8 } },
      embarcadero: { id: 'embarcadero', zone: 'terraza', position: { x: 5, y: 0, z: 0 } },
      orilla: { id: 'orilla', zone: 'mar', position: { x: 10, y: 0, z: 0 } },
      cima: { id: 'cima', zone: 'cima', position: { x: 0, y: 10, z: -5 } },
      'camara-x': { id: 'camara-x', zone: 'cantera', position: { x: 20, y: 0, z: 0 } },
      'camara-y': { id: 'camara-y', zone: 'cantera', position: { x: 24, y: 0, z: 0 } },
      ...extraNodos
    },
    enlaces: {
      'plaza--embarcadero': {
        id: 'plaza--embarcadero', from: 'plaza', to: 'embarcadero', medium: 'tierra',
        waypoints: [{ x: 0, y: 0, z: 0 }, { x: 5, y: 0, z: 0 }], walkSpeed: 2
      },
      'pasillo-xy': {
        id: 'pasillo-xy', from: 'camara-x', to: 'camara-y', medium: 'tierra', corridorId: 'pasillo-xy',
        waypoints: [{ x: 20, y: 0, z: 0 }, { x: 24, y: 0, z: 0 }], walkSpeed: 2
      },
      'plaza--mar': {
        id: 'plaza--mar', from: 'plaza', to: 'mar-boya', medium: 'agua',
        waypoints: [{ x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 8 }], walkSpeed: 1.5
      },
      ...extraEnlaces
    }
  };
  const actors = {
    uno: {
      id: 'uno', kind: 'player', tier: 'stick', cloak: null, zone: 'terraza',
      nodeId: 'plaza', linkId: null, direction: null, progress: null,
      riding: null, pose: 'idle', emote: null,
      score: { labeled: 0, excavated: 0, cached: 0, curated: 0, milestoned: 0 },
      position: { x: 0, y: 0, z: 0 },
      ...actorPatch
    }
  };
  const defaultLines = {
    'linea-aleph': {
      id: 'linea-aleph',
      registros: {
        P03: { id: 'P03', oldid: 1882, cached: false, deltaStatus: 'pending', milestone: null },
        P04: { id: 'P04', oldid: 1898, cached: true, deltaStatus: 'draft', milestone: null }
      }
    }
  };
  const view = {
    scene,
    nav,
    actors,
    taps: { 'grifo-t': { id: 'grifo-t', summitNodeId: 'cima' } },
    corridors: { 'pasillo-xy': { id: 'pasillo-xy', a: 'camara-x', b: 'camara-y', state: 'ghost' } },
    contacts: { ...contacts },
    lines: lines ?? defaultLines,
    dropletUnder: () => droplet,
    positionOf: (id) => actors[id]?.position ?? (id === 'grifo-t' ? nav.nodos.cima.position : null)
  };
  deepFreeze(view.scene);
  deepFreeze(view.nav);
  deepFreeze(view.actors);
  deepFreeze(view.taps);
  deepFreeze(view.corridors);
  deepFreeze(view.lines);
  return view;
}

test('join: alta en spawn; re-join idempotente (G-ARG.4 puro sobre vista congelada)', () => {
  const view = makeView();
  const first = reduceArgIntent(view, makeIntent('dos', 'join', { kind: 'player', tier: 'puppet' }));
  assert.equal(first.ok, true);
  assert.equal(first.ops[0].op, 'actor:add');
  assert.equal(first.ops[0].actor.nodeId, 'plaza');
  assert.equal(first.ops[0].actor.tier, 'puppet');
  const again = reduceArgIntent(view, makeIntent('uno', 'join'));
  assert.deepEqual(again, { ok: true, ops: [] });
});

test('mismo estado + mismo intent ⇒ mismo resultado (determinismo)', () => {
  const view = makeView();
  const intent = { ...makeIntent('uno', 'move', { nodeId: 'embarcadero' }), ts: 123 };
  assert.deepEqual(reduceArgIntent(view, intent), reduceArgIntent(view, intent));
});

test('move: resuelve enlace por nodeId destino y respeta el medio', () => {
  const view = makeView();
  const res = reduceArgIntent(view, makeIntent('uno', 'move', { nodeId: 'embarcadero' }));
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].patch.linkId, 'plaza--embarcadero');
  assert.equal(res.ops[0].patch.pose, 'walk');
  assert.equal(reduceArgIntent(view, makeIntent('uno', 'move', { nodeId: 'orilla' })).error, 'sin_enlace');
});

test('move por pasillo fantasma → pasillo_cerrado', () => {
  const view = makeView({ actorPatch: { nodeId: 'camara-x', zone: 'cantera' } });
  const res = reduceArgIntent(view, makeIntent('uno', 'move', { linkId: 'pasillo-xy', direction: 'a-to-b' }));
  assert.equal(res.error, 'pasillo_cerrado');
});

test('ride: solo desde el embarcadero del río', () => {
  const lejos = reduceArgIntent(makeView(), makeIntent('uno', 'ride', { riverId: 'rio-t' }));
  assert.equal(lejos.error, 'fuera_de_embarcadero');
  const view = makeView({ actorPatch: { nodeId: 'embarcadero' } });
  const res = reduceArgIntent(view, makeIntent('uno', 'ride', { riverId: 'rio-t' }));
  assert.equal(res.ok, true);
  assert.deepEqual(res.ops[0].patch.riding, { riverId: 'rio-t', progress: 0.5 });
});

test('label:cast: exige montado, etiqueta del labelset y gota bajo los pies', () => {
  const riding = { riding: { riverId: 'rio-t', progress: 0.5 }, nodeId: null, pose: 'ride', zone: 'rio' };
  const droplet = { id: 'd1', progress: 0.52, label: null };
  const res = reduceArgIntent(
    makeView({ actorPatch: riding, droplet }),
    makeIntent('uno', 'label:cast', { label: 'agora' })
  );
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].op, 'droplet:label');
  assert.equal(res.ops[1].op, 'actor:score');

  assert.equal(
    reduceArgIntent(makeView({ actorPatch: riding, droplet }), makeIntent('uno', 'label:cast', { label: 'spam' })).error,
    'etiqueta_invalida'
  );
  assert.equal(
    reduceArgIntent(makeView({ actorPatch: riding, droplet: null }), makeIntent('uno', 'label:cast', { label: 'agora' })).error,
    'sin_gota'
  );
  assert.equal(
    reduceArgIntent(makeView({ droplet }), makeIntent('uno', 'label:cast', { label: 'agora' })).error,
    'no_montado'
  );
});

test('tap:set: exige contacto abierto con el grifo y apertura 0..1', () => {
  assert.equal(
    reduceArgIntent(makeView(), makeIntent('uno', 'tap:set', { tapId: 'grifo-t', aperture: 0.5 })).error,
    'sin_contacto'
  );
  const withContact = makeView({
    actorPatch: { nodeId: 'cima', zone: 'cima' },
    contacts: { 'c-grifo-t--uno': { id: 'c-grifo-t--uno', a: 'grifo-t', b: 'uno', state: 'open' } }
  });
  assert.equal(
    reduceArgIntent(withContact, makeIntent('uno', 'tap:set', { tapId: 'grifo-t', aperture: 2 })).error,
    'apertura_invalida'
  );
  const res = reduceArgIntent(withContact, makeIntent('uno', 'tap:set', { tapId: 'grifo-t', aperture: 0.6 }));
  assert.deepEqual(res.ops, [{ op: 'tap:aperture', tapId: 'grifo-t', value: 0.6 }]);
});

test('excavate: solo pasillos fantasma desde cámara adyacente', () => {
  const view = makeView({ actorPatch: { nodeId: 'camara-x', zone: 'cantera' } });
  const res = reduceArgIntent(view, makeIntent('uno', 'excavate', { corridorId: 'pasillo-xy' }));
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].op, 'corridor:excavate');
  assert.equal(
    reduceArgIntent(makeView(), makeIntent('uno', 'excavate', { corridorId: 'pasillo-xy' })).error,
    'fuera_de_camara'
  );
});

test('contact:request: por proximidad, id determinista e idempotente', () => {
  const view = makeView({ actorPatch: { nodeId: 'cima', position: { x: 0, y: 10, z: -5 } } });
  const res = reduceArgIntent(view, makeIntent('uno', 'contact:request', { targetId: 'grifo-t' }));
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].contact.id, 'c-grifo-t--uno');
  const lejos = reduceArgIntent(makeView(), makeIntent('uno', 'contact:request', { targetId: 'grifo-t' }));
  assert.equal(lejos.error, 'fuera_de_alcance');
});

test('cloak:equip: parchea cloak del actor', () => {
  const view = makeView();
  const res = reduceArgIntent(view, makeIntent('uno', 'cloak:equip', { presetId: 'aleph-tronco-puro', label: 'tronco' }));
  assert.equal(res.ok, true);
  assert.deepEqual(res.ops[0].patch.cloak, { presetId: 'aleph-tronco-puro', label: 'tronco' });
  assert.equal(reduceArgIntent(view, makeIntent('uno', 'cloak:equip', {})).error, 'preset_requerido');
});

test('move por agua: nadar_no_permitido sin swimAllowed en cloak', () => {
  assert.equal(
    reduceArgIntent(
      makeView({ actorPatch: { cloak: { presetId: 'aleph-tronco-puro', label: 'x' } } }),
      makeIntent('uno', 'move', { nodeId: 'mar-boya' })
    ).error,
    'nadar_no_permitido'
  );
  const allowed = reduceArgIntent(
    makeView({ actorPatch: { cloak: { presetId: 'aleph-firehose-browse', label: 'fh' } } }),
    makeIntent('uno', 'move', { nodeId: 'mar-boya' })
  );
  assert.equal(allowed.ok, true);
  assert.equal(allowed.ops[0].patch.pose, 'swim');
});

test('intents malformadas nunca lanzan: no-op con error', () => {
  const view = makeView();
  assert.equal(reduceArgIntent(view, null).error, 'actor_requerido');
  assert.equal(reduceArgIntent(view, { actorId: 'uno', intent: 'hackear' }).error, 'intent_desconocida');
  assert.equal(reduceArgIntent(view, makeIntent('nadie', 'move', { nodeId: 'plaza' })).error, 'actor_desconocido');
});

test('effectiveLinkSpeed: preset acelera el enlace', () => {
  assert.equal(effectiveLinkSpeed(2, { cloak: { presetId: 'aleph-firehose-browse' } }), 2.5);
  assert.equal(effectiveLinkSpeed(2, { cloak: null }), 2);
  assert.equal(cloakModFor('aleph-firehose-browse').walkSpeed, 1.25);
});

function makeSeaView({ actorZone = 'mar', actorNodeId = 'orilla-mar', collapsed = false } = {}) {
  const scene = {
    spawnNodeId: 'plaza',
    labelset: ['agora', 'memoria'],
    contactRadius: 3.5,
    mar: { bounds: { center: { x: 0, y: 0, z: 19 }, width: 46, depth: 26 } },
    rios: {}
  };
  const nav = {
    nodos: {
      plaza: { id: 'plaza', zone: 'terraza', position: { x: 0, y: 0, z: 0 } },
      'orilla-mar': { id: 'orilla-mar', zone: 'mar', position: { x: 0, y: 1, z: 7 } }
    },
    enlaces: {}
  };
  const droplets = [
    { id: 'sd1', label: null, state: 'sunken', seq: 1, ref: { uri: 'firehose://synthetic/0/1', kind: 'micropost' } },
    { id: 'fd1', label: 'agora', state: 'floating', seq: 2, ref: { uri: 'firehose://synthetic/0/2', kind: 'micropost' } }
  ];
  return {
    scene,
    nav,
    actors: {
      uno: {
        id: 'uno',
        zone: actorZone,
        nodeId: actorNodeId,
        position: nav.nodos[actorNodeId]?.position ?? { x: 0, y: 0, z: 0 },
        score: { labeled: 0, excavated: 0, cached: 0, curated: 0, milestoned: 0 }
      }
    },
    taps: {},
    corridors: {},
    contacts: {},
    sea: { collapsed, murk: 1, crystals: 0 },
    lines: {},
    seaDroplets: () => droplets,
    seaDropletById: (id) => droplets.find((d) => d.id === id) ?? null,
    dropletUnder: () => null,
    positionOf: (id) => nav.nodos[id]?.position ?? null
  };
}

test('salvage: gota hundida + proximidad mar → sea:salvage + score', () => {
  const view = makeSeaView();
  const res = reduceArgIntent(view, makeIntent('uno', 'salvage', { dropletId: 'sd1', label: 'memoria' }));
  assert.equal(res.ok, true);
  assert.equal(res.ops.length, 2);
  assert.equal(res.ops[0].op, 'sea:salvage');
  assert.equal(res.ops[1].op, 'actor:score');
});

test('salvage: rechaza gota flotante, colapsado y fuera de alcance', () => {
  assert.equal(
    reduceArgIntent(makeSeaView(), makeIntent('uno', 'salvage', { dropletId: 'fd1', label: 'memoria' })).error,
    'gota_invalida'
  );
  assert.equal(
    reduceArgIntent(makeSeaView({ collapsed: true }), makeIntent('uno', 'salvage', { dropletId: 'sd1', label: 'memoria' }))
      .error,
    'mar_colapsado'
  );
  assert.equal(
    reduceArgIntent(makeSeaView({ actorZone: 'terraza', actorNodeId: 'plaza' }), makeIntent('uno', 'salvage', {
      dropletId: 'sd1',
      label: 'memoria'
    })).error,
    'fuera_de_alcance'
  );
});

test('track:cast: válido emite trackCast sin ops de dominio', () => {
  const view = makeSeaView();
  const before = JSON.stringify(view);
  const res = reduceArgIntent(view, makeIntent('uno', 'track:cast', { dropletId: 'fd1' }));
  assert.equal(res.ok, true);
  assert.deepEqual(res.ops, []);
  assert.equal(res.trackCast.ref.uri, 'firehose://synthetic/0/2');
  assert.equal(before, JSON.stringify(view));
  assert.equal(reduceArgIntent(view, makeIntent('uno', 'track:cast', { dropletId: 'nope' })).error, 'gota_invalida');
});

test('cache (dj): registro ghost → line:cache + score; rechazos de negocio', () => {
  const view = makeView();
  const res = reduceArgIntent(
    view,
    makeIntent('uno', 'cache', { lineId: 'linea-aleph', registroId: 'P03', role: 'dj' })
  );
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].op, 'line:cache');
  assert.equal(res.ops[1].op, 'actor:score');
  assert.equal(res.ops[1].key, 'cached');

  assert.equal(
    reduceArgIntent(
      view,
      makeIntent('uno', 'cache', { lineId: 'linea-aleph', registroId: 'P04', role: 'dj' })
    ).error,
    'ya_cacheado'
  );
  assert.equal(
    reduceArgIntent(
      view,
      makeIntent('uno', 'cache', { lineId: 'nope', registroId: 'P03', role: 'dj' })
    ).error,
    'linea_invalida'
  );
  assert.equal(
    reduceArgIntent(
      view,
      makeIntent('uno', 'cache', { lineId: 'linea-aleph', registroId: 'PX', role: 'dj' })
    ).error,
    'registro_invalido'
  );
});

test('curate (dj): exige cached y avance de un paso', () => {
  const view = makeView();
  assert.equal(
    reduceArgIntent(
      view,
      makeIntent('uno', 'curate', { lineId: 'linea-aleph', registroId: 'P03', role: 'dj' })
    ).error,
    'no_cacheado'
  );
  const ok = reduceArgIntent(
    view,
    makeIntent('uno', 'curate', { lineId: 'linea-aleph', registroId: 'P04', to: 'curated', role: 'dj' })
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.ops[0].op, 'line:curate');
  assert.equal(ok.ops[0].to, 'curated');

  const curatedLines = {
    'linea-aleph': {
      id: 'linea-aleph',
      registros: {
        P04: { id: 'P04', oldid: 1898, cached: true, deltaStatus: 'curated', milestone: null }
      }
    }
  };
  assert.equal(
    reduceArgIntent(
      makeView({ lines: curatedLines }),
      makeIntent('uno', 'curate', { lineId: 'linea-aleph', registroId: 'P04', role: 'dj' })
    ).error,
    'ya_curado'
  );
  assert.equal(
    reduceArgIntent(
      makeView({
        lines: {
          'linea-aleph': {
            id: 'linea-aleph',
            registros: {
              P03: { id: 'P03', oldid: 1882, cached: true, deltaStatus: 'pending', milestone: null }
            }
          }
        }
      }),
      makeIntent('uno', 'curate', {
        lineId: 'linea-aleph',
        registroId: 'P03',
        to: 'curated',
        role: 'dj'
      })
    ).error,
    'status_salto'
  );
});

test('milestone (dj): solo sobre curated sin milestone previo', () => {
  const ready = {
    'linea-aleph': {
      id: 'linea-aleph',
      registros: {
        P04: { id: 'P04', oldid: 1898, cached: true, deltaStatus: 'curated', milestone: null }
      }
    }
  };
  const res = reduceArgIntent(
    makeView({ lines: ready }),
    makeIntent('uno', 'milestone', {
      lineId: 'linea-aleph',
      registroId: 'P04',
      reasons: ['byte_delta'],
      role: 'dj'
    })
  );
  assert.equal(res.ok, true);
  assert.equal(res.ops[0].op, 'line:milestone');
  assert.deepEqual(res.ops[0].reasons, ['byte_delta']);

  assert.equal(
    reduceArgIntent(
      makeView(),
      makeIntent('uno', 'milestone', { lineId: 'linea-aleph', registroId: 'P04', role: 'dj' })
    ).error,
    'no_curado'
  );
});

/** Registry sintético para WP-U92 (ids de fixture, no corpus DISK_03). */
function forcesView(active = ['boot-x']) {
  return {
    registry: {
      boot: 'boot-x',
      activation: {
        session_budget: { max_active_forces: 2, boot_always_on: true },
        exclusions: [{ pair: ['force-p', 'force-q'], reason: 'exclusive' }],
        cotas: { lower: 'cota-lo', upper: 'cota-hi' }
      },
      forcesById: {
        'boot-x': { id: 'boot-x', kind: 'boot', anchor_scene: 'sesion-01/01-boot' },
        'force-p': { id: 'force-p', kind: 'force', anchor_scene: 'sesion-01/01-p' },
        'force-q': { id: 'force-q', kind: 'force', anchor_scene: 'sesion-01/01-q' },
        'force-r': { id: 'force-r', kind: 'force', anchor_scene: 'sesion-01/01-r' }
      },
      cotasById: {
        'cota-lo': { id: 'cota-lo', bound: 'lower', pole: 'colapso' },
        'cota-hi': { id: 'cota-hi', bound: 'upper', pole: 'victoria' }
      }
    },
    active
  };
}

test('force:activate: válido → ops + trackCast ancla; 3ª force y par excluido rechazan', () => {
  const view = deepFreeze({ ...makeView(), forces: forcesView(['boot-x']) });
  const ok = reduceArgIntent(
    view,
    makeIntent('op', 'force:activate', { forceId: 'force-p', role: 'operator' })
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.ops[0].op, 'force:activate');
  assert.equal(ok.ops[1].op, 'ledger:push');
  assert.equal(ok.ops[1].entryKind, 'force:activate');
  assert.equal(ok.trackCast.ref.uri, 'force://force-p/scene/sesion-01/01-p');
  assert.equal(ok.trackCast.hint, 'force-browser');

  const full = deepFreeze({ ...makeView(), forces: forcesView(['boot-x', 'force-p']) });
  assert.equal(
    reduceArgIntent(
      full,
      makeIntent('op', 'force:activate', { forceId: 'force-r', role: 'dj' })
    ).error,
    'session_budget_exceeded'
  );

  const exclReg = {
    ...forcesView(['boot-x', 'force-p']).registry,
    activation: {
      ...forcesView().registry.activation,
      session_budget: { max_active_forces: 3, boot_always_on: true }
    }
  };
  const excl = deepFreeze({
    ...makeView(),
    forces: { registry: exclReg, active: ['boot-x', 'force-p'] }
  });
  assert.equal(
    reduceArgIntent(
      excl,
      makeIntent('op', 'force:activate', { forceId: 'force-q', role: 'operator' })
    ).error,
    'pair_excluded'
  );

  assert.equal(
    reduceArgIntent(makeView(), makeIntent('op', 'force:activate', { forceId: 'force-p', role: 'operator' }))
      .error,
    'forces_no_configuradas'
  );
});

test('force:deactivate: quita force; boot bloqueado', () => {
  const view = deepFreeze({ ...makeView(), forces: forcesView(['boot-x', 'force-p']) });
  const ok = reduceArgIntent(
    view,
    makeIntent('op', 'force:deactivate', { forceId: 'force-p', role: 'dj' })
  );
  assert.equal(ok.ok, true);
  assert.equal(ok.ops[0].op, 'force:deactivate');
  assert.equal(
    reduceArgIntent(
      view,
      makeIntent('op', 'force:deactivate', { forceId: 'boot-x', role: 'operator' })
    ).error,
    'boot_no_desactivable'
  );
});

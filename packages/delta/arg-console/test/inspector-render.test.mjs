/**
 * Inspector de flujo y cantera (WP-25) — render puro sobre un fixture de
 * arg:state con gotas: el inspector tiene que LISTAR las uris de los
 * mensajes (CA WP-25) y los deep-links tienen que ser honestos (WP-26):
 * ref sintético ⇒ 「sintético」 sin enlace; cámara ghost ⇒ «no excavado aún».
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  renderInspector,
  renderDropletLine,
  dropletDeepLink,
  isSyntheticUri,
  inspectorTitle
} from '../assets/js/delta/inspector-render.mjs';

// ---- fixture: snapshot compacto con gotas reales y sintéticas ----------------

const BROWSERS = { cache: 'http://localhost:3015', firehose: 'http://localhost:3016' };

const SCENE = {
  taps: {
    'grifo-a': { id: 'grifo-a', riverId: 'rio-a', summitNodeId: 'cima-a' }
  },
  rios: {
    'rio-a': { id: 'rio-a', tapId: 'grifo-a', flowSpeed: 2 }
  }
};

const SNAP = {
  tick: 42,
  taps: {
    'grifo-a': { aperture: 0.6, pressure: 0.91, state: 'ok' }
  },
  rivers: {
    'rio-a': {
      droplets: [
        ['d1', 0.25, 'flowing', null, 'firehose://post/raw/2025/07/post-11.json'],
        ['d2', 0.5, 'crystal', 'agora', 'firehose://post/candidate/2025/07/post-12.json'],
        ['d3', 0.75, 'flowing', null, 'firehose://synthetic/5/33#rio']
      ]
    }
  },
  sea: { crystals: 3, murk: 1.5, murkCapacity: 6, collapsed: false },
  maze: { rev: 2 }
};

const CHAMBERS = {
  'camara-0-0': { ref: { kind: 'nodo', uri: 'linea://nodo/1874' }, state: 'cached' },
  'camara-0-1': { ref: { kind: 'nodo', uri: 'linea://nodo/1878' }, state: 'ghost' }
};

const CTX = { snap: SNAP, scene: SCENE, chambers: CHAMBERS, browsers: BROWSERS, actor: 'uno' };

// ---- CA WP-25: snapshot con gotas ⇒ el inspector lista sus uris ---------------

test('inspector de río: lista las uris de TODAS las gotas en vuelo', () => {
  const html = renderInspector({ kind: 'river', id: 'rio-a' }, CTX);
  for (const tuple of SNAP.rivers['rio-a'].droplets) {
    const uri = tuple[4];
    assert.ok(html.includes(uri), `falta la uri ${uri} en el inspector`);
  }
  assert.ok(html.includes('gotas en vuelo (3)'));
  // velocidad = flowSpeed 2 × apertura 0.6
  assert.ok(html.includes('1.20 u/s'));
  // etiqueta y progreso visibles
  assert.ok(html.includes('«agora»'));
  assert.ok(html.includes('25%') && html.includes('50%') && html.includes('75%'));
});

test('inspector de grifo: presión/apertura/estado + las gotas de SU río', () => {
  const html = renderInspector({ kind: 'tap', id: 'grifo-a' }, CTX);
  assert.ok(html.includes('0.91'), 'presión');
  assert.ok(html.includes('0.60'), 'apertura');
  assert.ok(html.includes('insp-bar'), 'barra de presión');
  assert.ok(html.includes('gotas en rio-a (3)'));
  assert.ok(html.includes('post-11.json'), 'las gotas del río también se listan aquí');
});

test('inspector de grifo en burst: lo cuenta claramente', () => {
  const ctx = {
    ...CTX,
    snap: { ...SNAP, taps: { 'grifo-a': { aperture: 1, pressure: 1, state: 'burst' } } }
  };
  const html = renderInspector({ kind: 'tap', id: 'grifo-a' }, ctx);
  assert.ok(html.includes('RIADA'), 'el burst debe anunciarse');
});

test('inspector del mar: cristales, murk/capacidad y llegadas de cliente', () => {
  const html = renderInspector({ kind: 'sea', id: 'mar' }, {
    ...CTX,
    arrivals: [{ uri: 'firehose://post/raw/2025/07/post-9.json', label: 'delta' }]
  });
  assert.ok(html.includes('3 💎'));
  assert.ok(html.includes('1.5/6'));
  assert.ok(html.includes('post-9.json'));
  assert.ok(html.includes('«delta»'));
});

// ---- WP-26: deep-links honestos ------------------------------------------------

test('gota real ⇒ enlace deep-link al browser; sintética ⇒ 「sintético」 sin enlace', () => {
  const real = renderDropletLine(SNAP.rivers['rio-a'].droplets[0], CTX);
  assert.ok(real.includes('<a '), 'la gota real lleva enlace');
  assert.ok(real.includes('http://localhost:3016'), 'apunta al firehose-browser');
  assert.ok(real.includes('actor=uno'), 'el deep-link arrastra al actor');

  const synth = renderDropletLine(SNAP.rivers['rio-a'].droplets[2], CTX);
  assert.ok(!synth.includes('<a '), 'la gota sintética NO lleva enlace');
  assert.ok(synth.includes('「sintético」'));
});

test('dropletDeepLink: honesto por construcción', () => {
  assert.equal(dropletDeepLink('firehose://synthetic/5/33#rio', BROWSERS), null);
  assert.equal(dropletDeepLink('esto-no-es-un-ref', BROWSERS), null);
  assert.equal(dropletDeepLink(null, BROWSERS), null);
  const href = dropletDeepLink('linea://nodo/1874', BROWSERS, 'uno');
  assert.ok(href.startsWith('http://localhost:3015'), 'nodo → cache-browser');
  assert.ok(href.includes('path=nodos%2F1874%2Fmeta.json'));
});

test('isSyntheticUri detecta firehose://synthetic/...', () => {
  assert.equal(isSyntheticUri('firehose://synthetic/5/33#rio'), true);
  assert.equal(isSyntheticUri('firehose://post/raw/x.json'), false);
  assert.equal(isSyntheticUri(null), false);
});

test('cámara cached ⇒ deep-link; ghost ⇒ «no excavado aún» sin enlace', () => {
  const cached = renderInspector({ kind: 'chamber', id: 'camara-0-0' }, CTX);
  assert.ok(cached.includes('linea://nodo/1874'));
  assert.ok(cached.includes('<a '), 'la cámara cacheada ofrece deep-link');
  assert.ok(cached.includes('abrir en navegador'));

  const ghost = renderInspector({ kind: 'chamber', id: 'camara-0-1' }, CTX);
  assert.ok(ghost.includes('no excavado aún'));
  assert.ok(!ghost.includes('<a '), 'una cámara ghost JAMÁS ofrece enlace');
});

test('cámara sin datos todavía (maze solo rev) ⇒ mensaje de espera, no crash', () => {
  const html = renderInspector({ kind: 'chamber', id: 'camara-9-9' }, CTX);
  assert.ok(html.includes('esperando'));
});

// ---- varios ---------------------------------------------------------------------

test('títulos del inspector por kind', () => {
  assert.equal(inspectorTitle({ kind: 'tap', id: 'grifo-a' }), '⚙ grifo · grifo-a');
  assert.equal(inspectorTitle({ kind: 'river', id: 'rio-a' }), '〰 río · rio-a');
  assert.equal(inspectorTitle({ kind: 'sea', id: 'mar' }), '🌊 el mar');
  assert.equal(inspectorTitle({ kind: 'chamber', id: 'camara-0-0' }), '⛏ cámara · camara-0-0');
  assert.equal(inspectorTitle(null), '🔍 inspector');
});

test('el contenido se escapa: una etiqueta maliciosa no inyecta HTML', () => {
  const evil = ['dX', 0.1, 'flowing', '<img src=x onerror=1>', 'firehose://synthetic/1/1'];
  const html = renderDropletLine(evil, CTX);
  assert.ok(!html.includes('<img'), 'el HTML de la etiqueta debe escaparse');
});

test('snapshot sin gotas ⇒ cauce vacío, sin crash', () => {
  const ctx = { ...CTX, snap: { ...SNAP, rivers: { 'rio-a': { droplets: [] } } } };
  const html = renderInspector({ kind: 'river', id: 'rio-a' }, ctx);
  assert.ok(html.includes('cauce vacío'));
});

/**
 * BFS de player_goto sobre el nav-graph de delta-v0: pasillos cerrados,
 * agua condicionada al cloak-mod y rutas multi-salto.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { findPath, isLinkCrossable } from '../src/nav.mjs';
import { staticNav, staticTopology } from '../src/projection.mjs';

const nav = staticNav();

function ghostCorridors() {
  return Object.fromEntries(
    Object.keys(staticTopology().corridors).map((id) => [id, { state: 'ghost' }])
  );
}

test('plaza → cima-a: ruta de dos saltos por la terraza', () => {
  assert.deepEqual(findPath(nav, 'plaza', 'cima-a'), ['terraza-a', 'cima-a']);
});

test('mismo nodo ⇒ ruta vacía; nodo desconocido ⇒ null', () => {
  assert.deepEqual(findPath(nav, 'plaza', 'plaza'), []);
  assert.equal(findPath(nav, 'plaza', 'no-existe'), null);
  assert.equal(findPath(nav, 'no-existe', 'plaza'), null);
});

test('plaza → camara-0-2: la boca de la cantera siempre es cruzable', () => {
  const path = findPath(nav, 'plaza', 'camara-0-2', { corridors: ghostCorridors() });
  assert.deepEqual(path, ['orilla-mar', 'cantera-entrada', 'camara-0-2']);
});

test('pasillos ghost bloquean la cantera; open la abren', () => {
  const corridors = ghostCorridors();
  assert.equal(findPath(nav, 'camara-0-2', 'camara-1-2', { corridors }), null);
  corridors['pasillo-camara-0-2--camara-1-2'] = { state: 'open' };
  assert.deepEqual(findPath(nav, 'camara-0-2', 'camara-1-2', { corridors }), ['camara-1-2']);
});

test('digging aún no es cruzable', () => {
  const corridors = ghostCorridors();
  corridors['pasillo-camara-0-2--camara-1-2'] = { state: 'digging' };
  assert.equal(findPath(nav, 'camara-0-2', 'camara-1-2', { corridors }), null);
});

test('agua: prohibida con aleph-tronco-puro, permitida con aleph-firehose-browse y sin cloak', () => {
  assert.equal(
    findPath(nav, 'orilla-mar', 'boya-1', { cloakPresetId: 'aleph-tronco-puro' }),
    null
  );
  assert.deepEqual(
    findPath(nav, 'orilla-mar', 'boya-1', { cloakPresetId: 'aleph-firehose-browse' }),
    ['boya-1']
  );
  // Sin cloak, cloakModFor(null).swimAllowed === true (misma regla del reducer).
  assert.deepEqual(findPath(nav, 'orilla-mar', 'boya-1'), ['boya-1']);
});

test('isLinkCrossable replica las reglas del reducer', () => {
  const agua = nav.enlaces['orilla-mar--boya-1'];
  assert.equal(isLinkCrossable(agua, { swimAllowed: false }), false);
  assert.equal(isLinkCrossable(agua, { swimAllowed: true }), true);
  const pasillo = nav.enlaces['pasillo-camara-0-2--camara-1-2'];
  assert.equal(isLinkCrossable(pasillo, { corridors: { 'pasillo-camara-0-2--camara-1-2': { state: 'ghost' } } }), false);
  assert.equal(isLinkCrossable(pasillo, { corridors: { 'pasillo-camara-0-2--camara-1-2': { state: 'open' } } }), true);
  assert.equal(isLinkCrossable(nav.enlaces['plaza--terraza-a'], {}), true);
});

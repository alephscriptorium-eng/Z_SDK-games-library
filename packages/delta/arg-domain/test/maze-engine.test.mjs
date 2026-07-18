import test from 'node:test';
import assert from 'node:assert/strict';

import { deltaV0, buildCanteraTopology } from '../src/scenes/delta-v0.mjs';
import { createMazeEngine } from '../src/maze-engine.mjs';
import { createSyntheticMazeSource } from '../src/feeds/synthetic.mjs';

function makeMaze() {
  const topology = buildCanteraTopology(deltaV0.cantera);
  const seed = createSyntheticMazeSource({ seed: 3 }).loadMaze(topology);
  return createMazeEngine(topology, seed, { digSeconds: 2 });
}

test('start pack: la fila de entrada abierta, el resto en fantasma', () => {
  const maze = makeMaze();
  assert.equal(maze.corridors['pasillo-camara-0-2--camara-1-2'].state, 'open');
  assert.equal(maze.corridors['pasillo-camara-0-1--camara-0-2'].state, 'ghost');
  assert.equal(maze.chambers['camara-0-2'].state, 'cached');
  assert.equal(maze.chambers['camara-0-1'].state, 'ghost');
  assert.ok(maze.chambers['camara-0-2'].ref.uri.startsWith('linea://nodo/'));
});

test('excavate: ghost → digging → open, cachea cámaras y sube rev', () => {
  const maze = makeMaze();
  const rev0 = maze.rev;
  const res = maze.excavate('pasillo-camara-0-1--camara-0-2', 'uno');
  assert.equal(res.ok, true);
  assert.equal(maze.corridors['pasillo-camara-0-1--camara-0-2'].state, 'digging');
  assert.ok(maze.rev > rev0);

  maze.tick(1);
  assert.equal(maze.corridors['pasillo-camara-0-1--camara-0-2'].state, 'digging');
  maze.tick(1.1);
  assert.equal(maze.corridors['pasillo-camara-0-1--camara-0-2'].state, 'open');
  assert.equal(maze.chambers['camara-0-1'].state, 'cached');

  const done = maze.drainEvents().filter((e) => e.kind === 'excavate');
  assert.equal(done.length, 1);
  assert.equal(done[0].actorId, 'uno');
});

test('excavate inválido: repetido, abierto o inexistente', () => {
  const maze = makeMaze();
  maze.excavate('pasillo-camara-0-1--camara-0-2');
  assert.equal(maze.excavate('pasillo-camara-0-1--camara-0-2').error, 'ya_excavando');
  assert.equal(maze.excavate('pasillo-camara-0-2--camara-1-2').error, 'ya_abierto');
  assert.equal(maze.excavate('pasillo-nada').error, 'pasillo_invalido');
});

test('snapshot: solo rev por defecto, full bajo demanda (G-ARG.5)', () => {
  const maze = makeMaze();
  assert.deepEqual(Object.keys(maze.snapshot()), ['rev']);
  const full = maze.snapshot(true);
  assert.equal(Object.keys(full.chambers).length, 12);
  assert.equal(Object.keys(full.corridors).length, 17);
});

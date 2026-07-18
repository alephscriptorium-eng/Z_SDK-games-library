import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { seaLayout } from '../src/sea-layout.mjs';
import { deltaV0 } from '../src/scenes/delta-v0.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, 'fixtures', 'sea-populated.json'), 'utf8'));

test('seaLayout: mismo input ⇒ mismo layout (determinista)', () => {
  const a = seaLayout(fixture.droplets, fixture.marDef);
  const b = seaLayout(fixture.droplets, fixture.marDef);
  assert.deepEqual(a, b);
});

test('seaLayout: clusters dinámicos por labels presentes (no gamemap)', () => {
  const { clusters } = seaLayout(fixture.droplets, fixture.marDef);
  const labels = clusters.map((c) => c.label).sort();
  assert.deepEqual(labels, ['agora', 'memoria', 'ruido']);
  assert.equal(clusters.find((c) => c.label === 'agora').members.length, 4);
  assert.equal(clusters.find((c) => c.label === 'memoria').members.length, 2);
  assert.equal(clusters.find((c) => c.label === 'ruido').members.length, 4);
});

test('seaLayout: orden estable de clusters por seq de primera gota', () => {
  const { clusters } = seaLayout(fixture.droplets, fixture.marDef);
  assert.deepEqual(
    clusters.map((c) => c.label),
    ['agora', 'memoria', 'ruido']
  );
});

test('seaLayout: centroides en el borde lejano (z máximo)', () => {
  const { clusters } = seaLayout(fixture.droplets, deltaV0.mar);
  const zMax = 19 + 26 / 2;
  for (const c of clusters) {
    assert.ok(c.center.z >= zMax - 1.5, `cluster ${c.label} lejos del borde`);
    assert.ok(c.center.y > 0, `cluster ${c.label} flota sobre superficie`);
  }
});

test('seaLayout: hundidas dispersas con y < 0', () => {
  const { positions } = seaLayout(fixture.droplets, fixture.marDef);
  const sunken = fixture.droplets.filter((d) => d.state === 'sunken');
  for (const d of sunken) {
    assert.ok(positions[d.id].y < 0, `${d.id} debe estar bajo superficie`);
  }
});

test('seaLayout: acepta tuplas compactas del snapshot', () => {
  const tuples = fixture.droplets.map((d) => [
    d.id,
    d.state === 'floating' ? d.label : null,
    `firehose://synthetic/0/${d.seq}`,
    d.seq
  ]);
  const { clusters, positions } = seaLayout(tuples, fixture.marDef);
  assert.equal(clusters.length, 3);
  assert.ok(Object.keys(positions).length >= fixture.droplets.length);
});

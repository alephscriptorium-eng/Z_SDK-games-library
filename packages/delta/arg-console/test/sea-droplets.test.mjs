import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import { seaLayout } from '@zeus/arg-domain';
import { createSeaDroplets } from '../assets/js/delta/sea-droplets.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixture = JSON.parse(readFileSync(join(__dirname, '../../arg-domain/test/fixtures/sea-populated.json'), 'utf8'));

test('sea-droplets: resolvePick mapea instanceId → dropletId', () => {
  const snap = {
    sea: {
      droplets: fixture.droplets.map((d) => [d.id, d.label, `firehose://synthetic/0/${d.seq}`, d.seq])
    }
  };
  const layer = createSeaDroplets({ add() {} }, { mar: fixture.marDef });
  layer.applySnapshot(snap);
  layer.update(0.016, 1);
  const pick = layer.resolvePick({ instanceId: 0 });
  assert.equal(pick?.kind, 'seaDroplet');
  assert.ok(pick?.id);
  layer.dispose();
});

test('sea-droplets: posiciones alineadas con seaLayout', () => {
  const snap = {
    sea: {
      droplets: [['ss1', null, 'firehose://synthetic/0/1', 1]]
    }
  };
  const layer = createSeaDroplets({ add() {} }, fixture.marDef);
  layer.applySnapshot(snap);
  layer.update(0, 0);
  const { positions } = seaLayout(snap.sea.droplets, fixture.marDef);
  assert.ok(positions.ss1);
  layer.dispose();
});

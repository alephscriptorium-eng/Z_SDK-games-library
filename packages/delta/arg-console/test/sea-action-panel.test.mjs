import test from 'node:test';
import assert from 'node:assert/strict';

import { renderSeaActionPanel, bindSeaActionPanel } from '../assets/js/delta/sea-action-panel.mjs';

test('sea-action-panel: salvage solo si hundida y proximidad', () => {
  const sunken = renderSeaActionPanel({
    droplet: { id: 'd1', label: null, uri: 'firehose://synthetic/0/1', state: 'sunken' },
    labelset: ['agora', 'memoria'],
    canSalvage: true,
    browsers: { firehose: 'http://localhost:3016' },
    actor: 'uno'
  });
  assert.match(sunken, /rescatar · agora/);
  assert.match(sunken, /sea-track-btn/);

  const far = renderSeaActionPanel({
    droplet: { id: 'd1', label: null, uri: 'firehose://synthetic/0/1', state: 'sunken' },
    labelset: ['agora'],
    canSalvage: false,
    browsers: {}
  });
  assert.match(far, /acércate/);
  assert.doesNotMatch(far, /sea-salvage-btn/);
});

test('sea-action-panel: bind emite handlers', () => {
  const clicks = [];
  const root = {
    querySelector(sel) {
      if (sel === '.sea-track-btn') return { addEventListener: (_, fn) => clicks.push(['track', fn]) };
      return null;
    },
    querySelectorAll(sel) {
      if (sel === '.sea-salvage-btn') {
        return [{ dataset: { label: 'memoria' }, addEventListener: (_, fn) => clicks.push(['salvage', fn]) }];
      }
      return [];
    }
  };
  bindSeaActionPanel(root, { onSalvage: () => {}, onTrack: () => {} });
  assert.equal(clicks.length, 2);
});

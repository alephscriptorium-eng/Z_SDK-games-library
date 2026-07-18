/**
 * Tests del dominio pozo: join, draw_drop, feed drip, rechazos.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPozoDomainState } from '../src/domain.mjs';
import { makeIntent, POZO_SCENE } from '../src/contract.mjs';

describe('pozo domain', () => {
  it('join spawnea en orilla e idempotente', () => {
    const d = createPozoDomainState({ now: () => 1000 });
    assert.equal(d.applyIntent(makeIntent('uno', 'join', {})).ok, true);
    assert.equal(d.snapshot('t').actors.uno.nodeId, 'orilla');
    assert.equal(d.applyIntent(makeIntent('uno', 'join', {})).ok, true);
    assert.equal(Object.keys(d.snapshot('t').actors).length, 1);
  });

  it('draw_drop asienta ledger label y baja el pozo', () => {
    let t = 2000;
    const d = createPozoDomainState({ now: () => t });
    d.applyIntent(makeIntent('uno', 'join', {}));
    const levelBefore = d.snapshot('t').well.level;
    const r = d.applyIntent(makeIntent('uno', 'draw_drop', { label: 'eco' }));
    assert.equal(r.ok, true);
    const snap = d.snapshot('t');
    assert.equal(snap.well.level, levelBefore - 1);
    assert.equal(snap.well.lastDrop.label, 'eco');
    assert.equal(snap.well.lastDrop.actorId, 'uno');
    const out = d.drainOutbox();
    assert.equal(out.ledger.length, 1);
    assert.equal(out.ledger[0].kind, 'label');
    assert.equal(out.ledger[0].label, 'eco');
    assert.equal(out.ledger[0].seq, 1);
    assert.equal(out.tracks.length, 1);
    t = 3000;
  });

  it('rechaza draw_drop sin join / sin label / pozo seco', () => {
    const d = createPozoDomainState({ now: () => 1 });
    assert.equal(d.applyIntent(makeIntent('uno', 'draw_drop', { label: 'x' })).error, 'actor_desconocido');
    d.applyIntent(makeIntent('uno', 'join', {}));
    assert.equal(d.applyIntent(makeIntent('uno', 'draw_drop', { label: '  ' })).error, 'label_requerido');

    const start = POZO_SCENE.well.startLevel;
    for (let i = 0; i < start; i++) {
      assert.equal(d.applyIntent(makeIntent('uno', 'draw_drop', { label: `d${i}` })).ok, true);
    }
    assert.equal(d.applyIntent(makeIntent('uno', 'draw_drop', { label: 'extra' })).error, 'pozo_seco');
  });

  it('tick del feed rellena el pozo hasta capacity', () => {
    const d = createPozoDomainState({ now: () => 1 });
    d.applyIntent(makeIntent('uno', 'join', {}));
    for (let i = 0; i < POZO_SCENE.well.startLevel; i++) {
      d.applyIntent(makeIntent('uno', 'draw_drop', { label: `x${i}` }));
    }
    assert.equal(d.snapshot('t').well.level, 0);
    // dripPerSec 0.15 → ~7s para 1 gota
    d.tick(7, 1);
    assert.ok(d.snapshot('t').well.level >= 1);
    d.tick(100, 1);
    assert.equal(d.snapshot('t').well.level, POZO_SCENE.well.capacity);
  });

  it('validateIntent rechaza rol no autorizado', () => {
    const d = createPozoDomainState({ now: () => 1 });
    const bad = makeIntent('uno', 'draw_drop', { label: 'x' }, { from: 'uno', role: 'dj' });
    // draw_drop solo player — role dj → rol_no_autorizado
    const r = d.applyIntent(bad);
    assert.equal(r.ok, false);
    assert.equal(r.error, 'rol_no_autorizado');
  });

  it('empty drena el pozo, asienta ledger y score.emptied', () => {
    const d = createPozoDomainState({ now: () => 5000 });
    d.applyIntent(makeIntent('uno', 'join', {}));
    const levelBefore = d.snapshot('t').well.level;
    assert.ok(levelBefore >= 1);
    const r = d.applyIntent(makeIntent('uno', 'empty', {}));
    assert.equal(r.ok, true);
    const snap = d.snapshot('t');
    assert.equal(snap.well.level, 0);
    assert.equal(snap.actors.uno.score.emptied, 1);
    const out = d.drainOutbox();
    assert.equal(out.ledger.length, 1);
    assert.equal(out.ledger[0].kind, 'empty');
    assert.equal(out.ledger[0].detail.drained, levelBefore);
    assert.equal(out.ledger[0].detail.opsIntent, 'empty_playable');
    assert.equal(d.applyIntent(makeIntent('uno', 'empty', {})).error, 'pozo_ya_vacio');
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
      { id: 'cota-lo', bound: 'lower', pole: 'colapso' },
      { id: 'cota-hi', bound: 'upper', pole: 'victoria' }
    ]
  };

  it('WP-U92 force:activate — ledger + track; 3ª force y par excluido', () => {
    const d = createPozoDomainState({ now: () => 5000, forcesRegistry: U92_FORCES });
    assert.deepEqual(d.snapshot('t').forces.active, ['boot-x']);

    const ok = d.applyIntent(
      makeIntent('op', 'force:activate', { forceId: 'force-p' }, { role: 'operator' })
    );
    assert.equal(ok.ok, true);
    const out = d.drainOutbox();
    assert.equal(out.ledger[0].kind, 'force:activate');
    assert.equal(out.tracks[0].ref.uri, 'force://force-p/scene/sesion-01/01-p');

    const third = d.explainIntent(
      makeIntent('op', 'force:activate', { forceId: 'force-r' }, { role: 'dj' })
    );
    assert.equal(third.error, 'session_budget_exceeded');

    const wide = createPozoDomainState({
      now: () => 1,
      forcesRegistry: {
        ...U92_FORCES,
        activation: {
          ...U92_FORCES.activation,
          session_budget: { max_active_forces: 3, boot_always_on: true }
        }
      }
    });
    assert.equal(
      wide.applyIntent(
        makeIntent('op', 'force:activate', { forceId: 'force-p' }, { role: 'operator' })
      ).ok,
      true
    );
    assert.equal(
      wide.explainIntent(
        makeIntent('op', 'force:activate', { forceId: 'force-q' }, { role: 'operator' })
      ).error,
      'pair_excluded'
    );
  });

  it('feed-kit bag: tick pulls stream+gossip into lines, items y tracks', () => {
    const d = createPozoDomainState({
      now: () => 9000,
      feeds: {
        mode: 'synthetic',
        families: {
          stream: {
            nextItems: () => [
              {
                family: 'stream',
                kind: 'micropost',
                uri: 'firehose://post/raw/batch/a.json',
                text: 'atproto',
                curation_status: 'raw'
              }
            ]
          },
          gossip: {
            nextItems: () => [
              {
                family: 'gossip',
                kind: 'message',
                uri: 'ssb://message/tribes/%abc=.sha256',
                text: 'tribe',
                curation_status: 'raw'
              }
            ]
          }
        }
      }
    });
    d.tick(1, 9000);
    const snap = d.snapshot('t');
    assert.equal(snap.feed.mode, 'synthetic');
    assert.ok(snap.feed.lines.includes('atproto'));
    assert.ok(snap.feed.lines.includes('tribe'));
    assert.equal(snap.feed.items.length, 2);
    const out = d.drainOutbox();
    assert.equal(out.tracks.length, 2);
    assert.ok(out.tracks.some((t) => t.ref.uri.startsWith('firehose://')));
    assert.ok(out.tracks.some((t) => t.ref.uri.startsWith('ssb://')));
  });
});

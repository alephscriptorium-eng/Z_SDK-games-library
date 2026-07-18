/**
 * Tests dominio solve-coagula.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createSolveDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';

const ACTS = [
  { id: 'act-0', title: 'Constructor', widgets: ['panel-elenco'] },
  { id: 'act-1', title: 'Mapa', widgets: ['panel-heatmap'] }
];

const LINEA = {
  title: 'Problema de la demarcación (historial WP es)',
  corpus: 'linea-aleph',
  registro_count: 677,
  fixture: true
};

describe('solve-coagula domain', () => {
  it('join spawnea en vestibulo e idempotente', () => {
    const d = createSolveDomainState({ now: () => 1000, acts: ACTS, linea: LINEA });
    assert.equal(d.applyIntent(makeIntent('uno', 'join', {})).ok, true);
    assert.equal(d.snapshot('t').actors.uno.nodeId, 'vestibulo');
    assert.equal(d.applyIntent(makeIntent('uno', 'join', {})).ok, true);
    assert.equal(Object.keys(d.snapshot('t').actors).length, 1);
  });

  it('open_act asienta ledger y mueve al nodo del acto', () => {
    const d = createSolveDomainState({ now: () => 2000, acts: ACTS, linea: LINEA });
    d.applyIntent(makeIntent('uno', 'join', {}));
    const r = d.applyIntent(makeIntent('uno', 'open_act', { actId: 'act-0' }));
    assert.equal(r.ok, true);
    assert.equal(r.evidencia.act.id, 'act-0');
    const snap = d.snapshot('t');
    assert.equal(snap.currentActId, 'act-0');
    assert.equal(snap.actors.uno.nodeId, 'act:act-0');
    const out = d.drainOutbox();
    assert.equal(out.ledger[0].kind, 'open_act');
  });

  it('rechaza open_act sin join / act desconocido', () => {
    const d = createSolveDomainState({ now: () => 1, acts: ACTS, linea: LINEA });
    assert.equal(
      d.applyIntent(makeIntent('uno', 'open_act', { actId: 'act-0' })).error,
      'actor_desconocido'
    );
    d.applyIntent(makeIntent('uno', 'join', {}));
    assert.equal(
      d.applyIntent(makeIntent('uno', 'open_act', { actId: 'act-99' })).error,
      'act_desconocido'
    );
  });

  it('consult_linea lee meta y asienta ledger', () => {
    const d = createSolveDomainState({ now: () => 3000, acts: ACTS, linea: LINEA });
    d.applyIntent(makeIntent('uno', 'join', {}));
    const r = d.applyIntent(makeIntent('uno', 'consult_linea', {}));
    assert.equal(r.ok, true);
    assert.equal(r.evidencia.linea.registro_count, 677);
    const out = d.drainOutbox();
    assert.equal(out.ledger.some((e) => e.kind === 'consult_linea'), true);
  });

  it('consult_linea falla sin linea', () => {
    const d = createSolveDomainState({ now: () => 1, acts: ACTS, linea: null });
    d.applyIntent(makeIntent('uno', 'join', {}));
    assert.equal(
      d.applyIntent(makeIntent('uno', 'consult_linea', {})).error,
      'linea_ausente'
    );
  });
});

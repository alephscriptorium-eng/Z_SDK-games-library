/**
 * Tests ActaDeBarrio v1 · wake `roto` sin persistencia · reparar vía viaje juguete.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import {
  ACTA_VERSION,
  RESUMEN_MAX,
  emitirActa,
  huellaLedger,
  isActaDeBarrioShaped,
  adoptarActaDesdePlaza,
  LEDGER_ACTA
} from '../src/acta.mjs';

const STARTPACK_SEED = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);

function loadGamemap() {
  return JSON.parse(readFileSync(STARTPACK_SEED, 'utf8'));
}

function moveToBlockly(d, actorId = 'rabbit') {
  d.applyIntent(makeIntent(actorId, 'join', {}));
  d.applyIntent(makeIntent(actorId, 'walk', { nodeId: 'zigurat' }));
  d.applyIntent(makeIntent(actorId, 'walk', { anchorId: 'ancla-blockly-editor' }));
}

describe('acta contrato + wake roto + reparar', () => {
  it('contrato ActaDeBarrio v1: campos literales + resumen ≤400', () => {
    const acta = emitirActa({
      barrioId: 'blockly-editor',
      estado: 'latente',
      resumen: 'ok',
      pendientes: ['ping'],
      ultimaClase: 'residente',
      tickEmision: 3,
      huellaLedger: huellaLedger({ seq: 1 })
    });
    assert.equal(acta.version, ACTA_VERSION);
    assert.equal(isActaDeBarrioShaped(acta), true);
    assert.ok(acta.resumen.length <= RESUMEN_MAX);
    assert.throws(() =>
      emitirActa({
        barrioId: 'x',
        estado: 'vivo',
        resumen: 'z'.repeat(RESUMEN_MAX + 1),
        pendientes: [],
        ultimaClase: 'visitante',
        tickEmision: 1,
        huellaLedger: 'h'
      })
    );
  });

  it('seeds traen acta fundacional; wake con acta → vivo', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    assert.ok(d.getActa('blockly-editor'));
    moveToBlockly(d);
    const r = d.applyIntent(
      makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
    );
    assert.equal(r.ok, true, r.error);
    assert.equal(r.estado, 'vivo');
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
  });

  it('sin acta persistida → wake despierta roto (drift)', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    assert.equal(d.olvidarActa('blockly-editor').ok, true);
    moveToBlockly(d);
    const r = d.applyIntent(
      makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
    );
    assert.equal(r.ok, true, r.error);
    assert.equal(r.estado, 'roto');
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'roto');
    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === 'wake' && e.detail?.sinActa === true));
  });

  it('emisión → plaza ledger → adopción por visitante', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    moveToBlockly(d);
    d.applyIntent(
      makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
    );
    const sleep = d.applyIntent(
      makeIntent('rabbit', 'sleep', {
        barrioId: 'blockly-editor',
        resumen: 'Relevo scriptorium blockly',
        pendientes: ['barrio.ping']
      })
    );
    assert.equal(sleep.ok, true, sleep.error);
    assert.equal(isActaDeBarrioShaped(sleep.acta), true);
    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === LEDGER_ACTA));

    // Ventana fresca: solo plaza.
    const d2 = createCiudadDomainState({ now: () => 2, gamemap: loadGamemap() });
    d2.olvidarActa('blockly-editor');
    const adopt = adoptarActaDesdePlaza(out.ledger, 'blockly-editor');
    assert.equal(adopt.ok, true);
    assert.ok(adopt.acta);
    d2.ingestPlazaActas(out.ledger);
    moveToBlockly(d2, 'visitor');
    const wake = d2.applyIntent(
      makeIntent('visitor', 'wake', {
        tool: 'barrio.ping',
        barrioId: 'blockly-editor',
        plazaEntries: out.ledger
      })
    );
    assert.equal(wake.ok, true, wake.error);
    assert.equal(wake.estado, 'vivo');
  });

  it('reparación vía viaje de juguete → sale de roto', async () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    d.olvidarActa('blockly-editor');
    moveToBlockly(d);
    d.applyIntent(
      makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
    );
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'roto');

    // Adapter: viaje Z10 de juguete (fixture local; wiring canónico en linea-kit).
    const viajeJuguete = {
      ok: true,
      reparacion: true,
      barrioId: 'blockly-editor',
      path: ['R0', 'R1', 'R2'],
      actorId: 'rabbit'
    };
    const fix = d.completarReparacion('blockly-editor', viajeJuguete);
    assert.equal(fix.ok, true, fix.error);
    assert.equal(fix.estado, 'latente');
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'latente');
    assert.ok(d.getActa('blockly-editor'));

    // Tras reparar, wake con acta → vivo.
    const wake = d.applyIntent(
      makeIntent('rabbit', 'wake', { tool: 'barrio.ping', barrioId: 'blockly-editor' })
    );
    assert.equal(wake.ok, true, wake.error);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
  });

  it('ceguera método: acta.mjs sin tokens de método', () => {
    const body = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'acta.mjs'),
      'utf8'
    );
    const pats = [
      'SCRIPT' + '_SDK',
      'HOL' + 'ONES',
      'swarm' + '-orquestacion',
      'BACK' + 'LOG'
    ];
    for (const p of pats) {
      assert.equal(body.includes(p), false, `fuga ${p}`);
    }
    // Marca admisible (DC-GC-ceguera-marca) — no se exige ausencia.
    assert.ok(true);
  });
});

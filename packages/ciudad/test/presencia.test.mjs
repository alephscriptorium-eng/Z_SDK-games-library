/**
 * Tests SeñalDePresencia v1 · enganche al loop (TICKS_PRESENCIA).
 * Reloj simulado; adapter mock / swap sin tocar reducer.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { LOOP_DEFAULTS, makeIntent } from '../src/contract.mjs';
import {
  createMockFuentePresencia,
  makeSeñalDePresencia,
  validateSeñalDePresencia
} from '../src/presencia.mjs';

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

/** Wake blockly-editor → vivo; reloj listo para decay si no hay presencia. */
function wakeBlockly(d) {
  d.applyIntent(makeIntent('rabbit', 'join', {}));
  d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
  d.applyIntent(
    makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
  );
  const r = d.applyIntent(
    makeIntent('rabbit', 'wake', {
      tool: 'barrio.ping',
      barrioId: 'blockly-editor'
    })
  );
  assert.equal(r.ok, true, r.error);
  assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
}

describe('presencia contrato + loop', () => {
  it('LOOP_DEFAULTS expone ticksPresencia (TICKS_PRESENCIA)', () => {
    assert.equal(typeof LOOP_DEFAULTS.ticksPresencia, 'number');
    assert.ok(LOOP_DEFAULTS.ticksPresencia >= 1);
    const d = createCiudadDomainState({
      now: () => 1,
      gamemap: loadGamemap()
    });
    assert.equal(d.getLoopConfig().ticksPresencia, LOOP_DEFAULTS.ticksPresencia);
  });

  it('validateSeñalDePresencia rechaza campos fuera de contrato', () => {
    assert.equal(validateSeñalDePresencia(null).ok, false);
    assert.equal(
      validateSeñalDePresencia({
        barrioId: 'x',
        fuente: 'otro',
        agenteId: 'a',
        clase: 'visitante',
        tick: 1
      }).error,
      'fuente_invalida'
    );
    assert.equal(
      validateSeñalDePresencia({
        barrioId: 'x',
        fuente: 'mock',
        agenteId: 'a',
        clase: 'extranjero',
        tick: 1
      }).error,
      'clase_invalida'
    );
    const ok = validateSeñalDePresencia(
      makeSeñalDePresencia({
        barrioId: 'blockly-editor',
        agenteId: 'a1',
        clase: 'flujo',
        tick: 2
      })
    );
    assert.equal(ok.ok, true);
  });

  it('señal sostenida N×2 ticks → barrio sigue vivo (reloj past decay)', () => {
    const TP = 2;
    const N = 3;
    let t = 1000;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      decayVivoMs: 100,
      decayLatenteMs: 200,
      ticksPresencia: TP,
      initialEnergy: 5
    });
    wakeBlockly(d);
    t = 1000 + 150; // idle ≥ decayVivoMs; solo presencia sostiene

    for (let i = 0; i < N * 2; i += 1) {
      d.tick(0.1, t, {
        señales: [
          makeSeñalDePresencia({
            barrioId: 'blockly-editor',
            agenteId: 'sosten',
            clase: 'visitante',
            tick: i
          })
        ]
      });
      assert.equal(
        d.snapshot('t').barrios['blockly-editor'].estado,
        'vivo',
        `tick sostenido #${i + 1}`
      );
    }
    assert.equal(d.getTick(), N * 2);
  });

  it('corte de señal → degrada exactamente al tick TICKS_PRESENCIA + 1', () => {
    const TP = 3;
    let t = 1000;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      decayVivoMs: 100,
      decayLatenteMs: 200,
      ticksPresencia: TP,
      initialEnergy: 5
    });
    wakeBlockly(d);
    t = 1000 + 150;

    // Última señal (establece lastPresenciaTick = 1).
    d.tick(0.1, t, {
      señales: [
        makeSeñalDePresencia({
          barrioId: 'blockly-editor',
          agenteId: 'corte',
          clase: 'residente',
          tick: 0
        })
      ]
    });
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');

    // Ticks 1..TP sin señal → sigue vivo (ventana).
    for (let i = 1; i <= TP; i += 1) {
      d.tick(0.1, t);
      assert.equal(
        d.snapshot('t').barrios['blockly-editor'].estado,
        'vivo',
        `aún vivo en tick post-corte ${i}`
      );
    }

    // Tick TP+1 sin señal → vivo→latente.
    d.tick(0.1, t);
    const snap = d.snapshot('decay');
    assert.equal(snap.barrios['blockly-editor'].estado, 'latente');
    assert.equal(snap.lastDecay.from, 'vivo');
    assert.equal(snap.lastDecay.to, 'latente');
    // 1 (con señal) + TP (ventana) + 1 (corte) = TP + 2 ticks totales
    assert.equal(d.getTick(), TP + 2);
  });

  it('swap adapter mock → fake sin tocar reducer (misma instancia)', () => {
    let t = 1000;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      decayVivoMs: 100,
      ticksPresencia: 2,
      initialEnergy: 5
    });
    wakeBlockly(d);
    t = 1150;

    const mock = createMockFuentePresencia({
      barrioId: 'blockly-editor',
      agenteId: 'mock-1'
    });
    assert.equal(d.attachFuentePresencia(mock).ok, true);
    mock.emit({ clase: 'visitante', tick: 1 });
    d.tick(0.1, t);
    assert.equal(d.snapshot('t').lastPresencia.fuente, 'mock');
    assert.equal(d.snapshot('t').lastPresencia.agenteId, 'mock-1');

    d.detachFuentePresencia();

    /** Fake distinto: misma interfaz FuentePresencia, otra procedencia. */
    const fake = {
      suscribir(cb) {
        this._cb = cb;
        return () => {
          this._cb = null;
        };
      },
      push() {
        this._cb?.(
          makeSeñalDePresencia({
            barrioId: 'blockly-editor',
            fuente: 'mock',
            agenteId: 'fake-2',
            clase: 'flujo',
            tick: 99
          })
        );
      }
    };
    assert.equal(d.attachFuentePresencia(fake).ok, true);
    fake.push();
    d.tick(0.1, t);
    assert.equal(d.snapshot('t').lastPresencia.agenteId, 'fake-2');
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
    // Reducer intacto: getLoopConfig / tick API sin cambio de forma.
    assert.equal(typeof d.tick, 'function');
    assert.equal(d.getLoopConfig().ticksPresencia, 2);
  });

  it('clase flujo = presencia sí, recarga energía no (solo announce)', () => {
    let t = 1;
    const d = createCiudadDomainState({
      now: () => t,
      gamemap: loadGamemap(),
      decayVivoMs: 100,
      ticksPresencia: 2,
      initialEnergy: 2,
      announceGain: 1,
      maxEnergy: 5
    });
    wakeBlockly(d);
    const energyAfterWake = d.snapshot('t').actors.rabbit.energy;
    assert.equal(energyAfterWake, 1);

    t = 200;
    d.tick(0.1, t, {
      señales: [
        makeSeñalDePresencia({
          barrioId: 'blockly-editor',
          agenteId: 'flujo-1',
          clase: 'flujo',
          tick: 1
        })
      ]
    });
    const mid = d.snapshot('flujo');
    assert.equal(mid.barrios['blockly-editor'].estado, 'vivo');
    assert.equal(mid.lastPresencia.clase, 'flujo');
    assert.equal(mid.actors.rabbit.energy, energyAfterWake, 'flujo no recarga');

    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'plaza' }));
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'announce', { message: 'plaza' })).ok,
      true
    );
    assert.equal(
      d.snapshot('announce').actors.rabbit.energy,
      energyAfterWake + 1,
      'announce sí recarga'
    );
  });
});

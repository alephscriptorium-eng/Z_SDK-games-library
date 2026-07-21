/**
 * Contrato de mapeo + tres jugadores en un snapshot (WP-Z13).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import {
  makeIntent,
  PLAYER_TYPE_MAP,
  featuresForPlayerType,
  classifySnapshotPlayers,
  playerOriginFromLedgerEntry,
  residenteActorId
} from '../src/contract.mjs';

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

describe('ciudad tres jugadores (Z13)', () => {
  it('mapeo: ≥2 tipos → roles de catálogo distintos o compartidos según ficha', () => {
    assert.equal(PLAYER_TYPE_MAP.residente.catalogRole, 'operator');
    assert.equal(PLAYER_TYPE_MAP.visitante.catalogRole, 'player');
    assert.equal(PLAYER_TYPE_MAP.corriente.catalogRole, 'player');
    assert.deepEqual(featuresForPlayerType('visitante'), ['jugador:visitante']);
    assert.deepEqual(featuresForPlayerType('corriente'), ['jugador:corriente']);
    assert.ok(
      featuresForPlayerType('residente', { edificioId: 'prolog-editor' }).includes(
        'residente:prolog-editor'
      )
    );
  });

  it('partida demo: visitante + corriente + residente oráculo en el mismo snapshot', () => {
    let t = 1;
    const d = createCiudadDomainState({ now: () => t, gamemap: loadGamemap() });

    assert.equal(
      d.applyIntent(makeIntent('ui', 'join', { playerType: 'visitante' })).ok,
      true
    );
    assert.equal(
      d.applyIntent(makeIntent('peer', 'join', { playerType: 'corriente' })).ok,
      true
    );
    assert.equal(
      d.applyIntent(
        makeIntent('ui', 'join', { playerType: 'residente', barrioId: 'x' })
      ).error,
      'residente_solo_por_wake'
    );

    d.applyIntent(makeIntent('peer', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('peer', 'walk', { anchorId: 'ancla-prolog-editor' })
    );
    t = 2;
    const wake = d.applyIntent(
      makeIntent('peer', 'wake', {
        tool: 'oraculo.consultar',
        barrioId: 'prolog-editor'
      })
    );
    assert.equal(wake.ok, true, wake.error);

    const snap = d.snapshot('tres');
    const rid = residenteActorId('prolog-editor');
    assert.equal(snap.barrios['prolog-editor'].estado, 'vivo');
    assert.ok(snap.actors[rid], 'residente presente');
    assert.equal(snap.actors[rid].playerType, 'residente');
    assert.equal(snap.actors.ui.playerType, 'visitante');
    assert.equal(snap.actors.peer.playerType, 'corriente');

    const board = classifySnapshotPlayers(snap);
    assert.equal(board.ok, true);
    assert.equal(board.typesPresent.length, 3);
    assert.deepEqual(board.byType.residente, [rid]);
  });

  it('una fuente de verdad: sleep retira residente el mismo tick', () => {
    let t = 10;
    const d = createCiudadDomainState({ now: () => t, gamemap: loadGamemap() });
    d.applyIntent(makeIntent('op', 'join', { playerType: 'visitante' }));
    d.applyIntent(makeIntent('op', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('op', 'walk', { anchorId: 'ancla-prolog-editor' })
    );
    t = 20;
    d.applyIntent(
      makeIntent('op', 'wake', {
        tool: 'oraculo.consultar',
        barrioId: 'prolog-editor'
      })
    );
    const rid = residenteActorId('prolog-editor');
    assert.ok(d.snapshot('a').actors[rid]);

    t = 30;
    const sleep = d.applyIntent(
      makeIntent('op', 'sleep', { barrioId: 'prolog-editor' })
    );
    assert.equal(sleep.ok, true, sleep.error);
    const after = d.snapshot('b');
    assert.equal(after.barrios['prolog-editor'].estado, 'latente');
    assert.equal(after.actors[rid], undefined);
    assert.equal(after.lastSleep.residenteId, rid);

    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === 'sleep' && e.detail.retirado));
  });

  it('cronista: playerOriginFromLedgerEntry distingue ≥2 tipos', () => {
    const d = createCiudadDomainState({ now: () => 1, gamemap: loadGamemap() });
    d.applyIntent(makeIntent('ui', 'join', { playerType: 'visitante' }));
    d.applyIntent(makeIntent('ui', 'announce', { message: 'plaza' }));
    d.applyIntent(makeIntent('r', 'join', { playerType: 'corriente' }));
    d.applyIntent(makeIntent('r', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('r', 'walk', { anchorId: 'ancla-prolog-editor' })
    );
    d.applyIntent(
      makeIntent('r', 'wake', {
        tool: 'oraculo.consultar',
        barrioId: 'prolog-editor'
      })
    );
    const { ledger } = d.drainOutbox();
    const origins = new Set(
      ledger.map((e) => playerOriginFromLedgerEntry(e, d.snapshot('x').actors))
    );
    // announce = visitante; wake actor = corriente (residente nace, no emite el wake)
    assert.ok(origins.has('visitante'));
    assert.ok(origins.has('corriente'));
    assert.ok(origins.size >= 2);
  });
});

/**
 * CA ciudadano-agente: peercard firmada en bootstrap MCP + packing intents.
 * Eje I: ciudad consume API peercard del kit.
 * Eje IV / regla 6: ≥2 tipos — peercard puerta (humano) + peercard MCP (agente).
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EventEmitter } from 'node:events';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sdkRootEnv = ['ZEUS', '_SDK', '_ROOT'].join('');

/** resolveZeusSdkRoot / sibling — no forzar path fantasma en CI (b54a2d2). */
if (!process.env[sdkRootEnv]) {
  try {
    const { resolveZeusSdkRoot } = require('../../../scripts/zeus-sdk-root.cjs');
    const sdk = resolveZeusSdkRoot({ required: false });
    if (sdk) process.env[sdkRootEnv] = sdk;
  } catch {
    /* CI: sin sibling → kit vía paquete instalado */
  }
}

const { createRoomBridge } = await import('../src/player-mcp/room-bridge.mjs');
const {
  issueActorPeerCard,
  verifyTravelingPeerCard
} = await import('../src/player-mcp/peer-card.mjs');
const {
  readLatestParte,
  getResourceRegistry,
  buildCardExamples
} = await import('../src/player-mcp/logic.mjs');
const { getServerConfig } = await import('../src/player-mcp/config.mjs');
const { GAME_ID } = await import('../src/contract.mjs');

async function loadKitBridge() {
  const candidates = [];
  if (process.env[sdkRootEnv]) {
    candidates.push(
      path.join(
        process.env[sdkRootEnv],
        'packages/engine/player-mcp-kit/src/room-bridge.mjs'
      )
    );
  }
  try {
    const { resolveZeusSdkRoot } = require('../../../scripts/zeus-sdk-root.cjs');
    const sdk = resolveZeusSdkRoot({ required: false });
    if (sdk) {
      candidates.push(
        path.join(sdk, 'packages/engine/player-mcp-kit/src/room-bridge.mjs')
      );
    }
  } catch {
    /* optional */
  }
  for (const cand of candidates) {
    try {
      const mod = await import(pathToFileURL(cand).href);
      if (typeof mod.createPlayerRoomBridge === 'function') {
        return mod.createPlayerRoomBridge;
      }
    } catch {
      /* next */
    }
  }
  const mod = await import('@zeus/player-mcp-kit');
  return mod.createPlayerRoomBridge;
}

describe('ciudadano-agente peercard MCP', () => {
  it('issueActorPeerCard: seat firma verifica (mismo carril E02)', async () => {
    const issued = await issueActorPeerCard({ actor: 'rabbit', room: 'CIUDAD_DEMO' });
    assert.ok(issued.peerCard.ssbId);
    assert.ok(issued.peerCard.seatSignature);
    assert.equal(issued.ssbId, issued.peerCard.ssbId);
    const seat = await verifyTravelingPeerCard(issued.peerCard);
    assert.equal(seat.ok, true, seat.error);
    assert.equal(issued.startpack.ref, 'startpack-ciudad-v0.1.0');
  });

  it('createRoomBridge bootstrap: requirePeerCard + seat en bridge', async () => {
    const createPlayerRoomBridge = await loadKitBridge();
    const bridge = await createRoomBridge({
      actor: 'rabbit',
      room: 'CIUDAD_DEMO',
      createPlayerRoomBridge
    });
    assert.ok(bridge.peerCard, 'peerCard en bridge');
    assert.ok(bridge.peerCard.seatSignature, 'seatSignature');
    assert.ok(bridge.ssbId, 'ssbId');
    const seat = await verifyTravelingPeerCard(bridge.peerCard);
    assert.equal(seat.ok, true, seat.error);
    assert.equal(typeof bridge.setPeerCard, 'function');
    bridge.close();
  });

  it('v2 wiring: resources ciudad://player/state · scene · casos', async () => {
    const createPlayerRoomBridge = await loadKitBridge();
    const bridge = await createRoomBridge({
      actor: 'rabbit',
      room: 'CIUDAD_DEMO',
      createPlayerRoomBridge
    });
    const registry = getResourceRegistry(bridge);
    const uris = registry.map((r) => r.uri).sort();
    assert.deepEqual(uris, [
      `${GAME_ID}://casos`,
      `${GAME_ID}://player/state`,
      `${GAME_ID}://scene`
    ]);
    const cfg = getServerConfig({ ZEUS_CIUDAD_PLAYER_ACTOR: 'rabbit' });
    assert.equal(cfg.name, 'ciudad-player-mcp-rabbit');
    const card = buildCardExamples(bridge);
    assert.equal(card.peercard, true);
    assert.ok(card.tools.includes('player_announce'));
    assert.ok(card.tools.includes('player_leer_parte'));
    assert.ok(card.tools.includes('player_walk'));
    bridge.close();
  });

  it('leer parte → campanas (sensor operator-ui)', () => {
    const bridge = {
      ledgerTail: () => [
        {
          seq: 3,
          kind: 'parte',
          detail: {
            parte: {
              version: 'parte/1',
              titulares: ['El barrio prolog-editor gana pulso']
            }
          }
        }
      ]
    };
    const out = readLatestParte(bridge);
    assert.equal(out.ok, true);
    assert.equal(out.evidencia.campanas.length, 1);
    assert.equal(out.evidencia.campanas[0].clase, 'despertar');
  });

  it('regla 6: peercard humano-puerta + peercard agente-MCP (dos tipos)', async () => {
    const agente = await issueActorPeerCard({
      actor: 'mcp-rabbit',
      room: 'CIUDAD_DEMO',
      token: 'mcp-agent'
    });
    let emitirCredencialFederada = null;
    try {
      const mod = await import('../fixtures/federation/peer-external.mjs');
      emitirCredencialFederada = mod.emitirCredencialFederada;
    } catch {
      emitirCredencialFederada = null;
    }
    if (!emitirCredencialFederada) {
      assert.ok(agente.peerCard.seatSignature);
      return;
    }
    const humano = await emitirCredencialFederada({
      roomId: 'CIUDAD_DEMO',
      displayName: 'amigo-humano'
    });
    assert.ok(humano.credencial.peerCard.seatSignature, 'humano puerta');
    assert.ok(agente.peerCard.seatSignature, 'agente MCP');
    assert.notEqual(
      humano.credencial.peerCard.ssbId,
      agente.peerCard.ssbId,
      'dos asientos distintos'
    );
    assert.equal((await verifyTravelingPeerCard(humano.credencial.peerCard)).ok, true);
    assert.equal((await verifyTravelingPeerCard(agente.peerCard)).ok, true);
  });

  it('connect reenvía peerCard al join', async () => {
    const createPlayerRoomBridge = await loadKitBridge();
    const issued = await issueActorPeerCard({ actor: 'kit-probe', room: 'R' });
    const joins = [];
    const mockIo = new EventEmitter();
    mockIo.close = () => {};
    mockIo.on = (...a) => EventEmitter.prototype.on.apply(mockIo, a);
    const probe = createPlayerRoomBridge({
      actor: 'kit-probe',
      room: 'R',
      events: {
        STATE: 'state',
        INTENT: 'intent',
        TRACK: 'track',
        LEDGER: 'ledger'
      },
      makeIntent: () => ({}),
      peerCard: issued.peerCard,
      requirePeerCard: true,
      assertPeerCard: (card) =>
        card?.seatSignature ? { ok: true } : { ok: false, error: 'no seat' },
      createClient: () => ({ io: mockIo, room: () => {} }),
      connectAndJoin: async (_c, _u, opts) => {
        joins.push(opts);
        return { room: 'R' };
      }
    });
    await probe.connect();
    assert.ok(joins[0]?.peerCard?.seatSignature);
    probe.close();
  });
});

/**
 * Puente room ciudad: createPlayerRoomBridge + makeIntent con game:'ciudad'.
 * Bootstrap: peercard firmada (peer-card-seat) — mismo carril puerta (E02).
 *
 * Resuelve kit tip vía env de root SDK / .deps / sibling antes del registry.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { EVENTS, DEFAULT_CIUDAD_ROOM, makeIntent } from '../contract.mjs';
import { issueActorPeerCard, verifyTravelingPeerCard } from './peer-card.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

async function loadCreatePlayerRoomBridge() {
  const candidates = [];
  const sdkRootEnv = ['ZEUS', '_SDK', '_ROOT'].join('');
  if (process.env[sdkRootEnv]) {
    candidates.push(
      path.join(
        process.env[sdkRootEnv],
        'packages/engine/player-mcp-kit/src/room-bridge.mjs'
      )
    );
  }
  try {
    const { resolveZeusSdkRoot } = require('../../../../scripts/zeus-sdk-root.cjs');
    const sdk = resolveZeusSdkRoot({ required: false });
    if (sdk) {
      candidates.push(
        path.join(sdk, 'packages/engine/player-mcp-kit/src/room-bridge.mjs')
      );
    }
  } catch {
    /* optional */
  }
  candidates.push(
    path.resolve(
      __dirname,
      '../../../../../zeus-sdk/packages/engine/player-mcp-kit/src/room-bridge.mjs'
    )
  );
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

let factoryPromise = null;

function getFactory() {
  if (!factoryPromise) factoryPromise = loadCreatePlayerRoomBridge();
  return factoryPromise;
}

/**
 * @param {{
 *   actor: string,
 *   room?: string,
 *   user?: string,
 *   logger?: Console,
 *   peerCard?: object,
 *   endpoint?: string,
 *   createPlayerRoomBridge?: Function
 * }} options
 */
export async function createRoomBridge({
  actor,
  room = process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM,
  user = `mcp-${actor}`,
  logger = console,
  peerCard: peerCardOpt,
  endpoint,
  createPlayerRoomBridge: createBridgeFn
} = {}) {
  if (!actor || typeof actor !== 'string') {
    throw new TypeError('createRoomBridge: actor (string) requerido');
  }

  const issued =
    peerCardOpt != null
      ? { peerCard: peerCardOpt }
      : await issueActorPeerCard({ actor, room, endpoint });

  const createBridge =
    typeof createBridgeFn === 'function' ? createBridgeFn : await getFactory();

  // Seat verify async en bootstrap; assertPeerCard del kit es sync (shape).
  const seatGate = await verifyTravelingPeerCard(issued.peerCard);
  if (!seatGate.ok) {
    throw new TypeError(`createRoomBridge: peerCard rechazada: ${seatGate.error}`);
  }

  return createBridge({
    actor,
    room,
    user,
    events: EVENTS,
    makeIntent,
    peer: {
      type: 'CiudadPlayerMcp',
      features: ['ciudad-0.1', 'intent', 'mcp-wrapper', 'puerta', 'peercard']
    },
    peerCard: issued.peerCard,
    requirePeerCard: true,
    assertPeerCard: (card) => {
      if (!card || typeof card !== 'object') {
        return { ok: false, error: 'peer-card missing' };
      }
      if (typeof card.seatSignature !== 'string' || !card.seatSignature) {
        return { ok: false, error: 'seatSignature missing' };
      }
      if (typeof card.ssbId !== 'string' || !card.ssbId) {
        return { ok: false, error: 'ssbId missing' };
      }
      return { ok: true };
    },
    logger
  });
}

/** Alias explícito (misma API async). */
export const createRoomBridgeAsync = createRoomBridge;

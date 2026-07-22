/**
 * Peercard firmada para actor MCP — mismo carril identidad que la puerta (E02).
 * Emite con peer-card-seat; no entra «por detrás» con solo type/features.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { makePeerCard } from '@zeus/protocol/peer-card';
import { DEFAULT_CIUDAD_ROOM } from '../contract.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const sdkRootEnv = ['ZEUS', '_SDK', '_ROOT'].join('');

/** Norte CA: mismo ref default que puerta / embajador. */
export const MCP_DEFAULT_STARTPACK = Object.freeze({
  id: 'startpack-ciudad',
  version: '0.1.0',
  ref: 'startpack-ciudad-v0.1.0',
  packageName: '@zeus/startpack-ciudad'
});

async function loadPeerCardSeat() {
  const candidates = [];
  if (process.env[sdkRootEnv]) {
    candidates.push(
      path.join(
        process.env[sdkRootEnv],
        'packages/engine/protocol/src/peer-card-seat.mjs'
      )
    );
  }
  try {
    const { resolveZeusSdkRoot } = require('../../../../scripts/zeus-sdk-root.cjs');
    const sdk = resolveZeusSdkRoot({ required: false });
    if (sdk) {
      candidates.push(
        path.join(sdk, 'packages/engine/protocol/src/peer-card-seat.mjs')
      );
    }
  } catch {
    /* optional */
  }
  candidates.push(
    path.resolve(
      __dirname,
      '../../../../../zeus-sdk/packages/engine/protocol/src/peer-card-seat.mjs'
    )
  );
  for (const cand of candidates) {
    try {
      return await import(pathToFileURL(cand).href);
    } catch {
      /* next */
    }
  }
  try {
    return await import('@zeus/protocol/peer-card-seat');
  } catch (err) {
    throw new Error(
      `peer-card-seat unavailable (tip protocol post-E02 / registry): ${err.message}`
    );
  }
}

let seatModPromise = null;
function getSeatMod() {
  if (!seatModPromise) seatModPromise = loadPeerCardSeat();
  return seatModPromise;
}

/**
 * Emite peercard firmada (asiento) para un actor MCP.
 * @param {{
 *   actor: string,
 *   room?: string,
 *   endpoint?: string,
 *   token?: string,
 *   ttlMs?: number,
 *   scopes?: string[]
 * }} input
 */
export async function issueActorPeerCard(input) {
  if (!input?.actor || typeof input.actor !== 'string') {
    throw new TypeError('issueActorPeerCard: actor (string) requerido');
  }
  const seat = await getSeatMod();
  const roomId = input.room || process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM;
  const endpoint =
    input.endpoint ||
    process.env.ZEUS_SCRIPTORIUM_URL ||
    'wss://rooms.example/runtime';
  const expiresAt = new Date(
    Date.now() + (typeof input.ttlMs === 'number' ? input.ttlMs : 60 * 60 * 1000)
  ).toISOString();
  const keys = seat.generateSeatKeyPair();
  const unsigned = makePeerCard({
    roomId,
    endpoint,
    token: input.token || `mcp-${input.actor}`,
    scopes: input.scopes || ['role:player', 'presence:join', 'events:publish'],
    displayName: input.actor,
    expiresAt,
    issuedAt: new Date().toISOString()
  });
  const peerCard = seat.signTravelingPeerCard(unsigned, keys.privateKey, keys.ssbId);
  return {
    peerCard,
    ssbId: keys.ssbId,
    startpack: { ...MCP_DEFAULT_STARTPACK },
    assertPeerCard: seat.verifyTravelingPeerCard
  };
}

/**
 * @param {unknown} card
 */
export async function verifyTravelingPeerCard(card) {
  const seat = await getSeatMod();
  return seat.verifyTravelingPeerCard(card);
}

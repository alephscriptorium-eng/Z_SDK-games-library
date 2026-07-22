/**
 * Demo peer federación (Z04) — arranca mock CP + peer + horse contra authority viva.
 *
 * Uso típico (tras authority + socket):
 *   node packages/ciudad/fixtures/federation/demo-peer.mjs
 *
 * Env: ZEUS_CIUDAD_ROOM, ZEUS_RSH_CP_URL (si CP ya corre), ZEUS_RSH_CP_PORT
 */

import { createMockControlPlane } from './mock-control-plane.mjs';
import {
  createFederationPeer,
  PUERTA_DEFAULT_STARTPACK
} from './peer-external.mjs';
import { startBarrioHorse } from './barrio-horse.mjs';
import { DEFAULT_CIUDAD_ROOM } from '../../src/contract.mjs';

const ROOM = process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM;
const ACTOR = process.env.ZEUS_FEDERATION_ACTOR || 'ext-rabbit';
const HORSE_ID = process.env.ZEUS_FEDERATION_HORSE || 'barrio-horse';
const CP_PORT = Number(process.env.ZEUS_RSH_CP_PORT || 14040);

async function main() {
  let plane = null;
  let cpClient;
  if (process.env.ZEUS_RSH_CP_URL) {
    const base = process.env.ZEUS_RSH_CP_URL.replace(/\/$/, '');
    cpClient = createMockControlPlane().client(base);
    console.log(`[demo] control-plane remoto ${base}`);
  } else {
    plane = createMockControlPlane({ port: CP_PORT });
    const { url } = await plane.listen();
    cpClient = plane.client(url);
    console.log(`[demo] mock control-plane ${url}`);
  }

  const horse = await startBarrioHorse({ horseId: HORSE_ID, room: ROOM });
  const peer = createFederationPeer({
    actor: ACTOR,
    room: ROOM,
    controlPlane: cpClient
  });

  await peer.registerBots();
  // Puerta: peercard firmada → startpack-ciudad-v0.1.0 (antes de join/RNFP)
  const puerta = await peer.enterWithPuerta();
  if (puerta.startpack.ref !== PUERTA_DEFAULT_STARTPACK.ref) {
    console.error('FAIL puerta startpack', puerta.startpack);
    process.exit(1);
  }
  await peer.connect();
  await peer.announcePresence('federación Z04 · puerta externos');
  await peer.federateRnfp('rnfp.distrito');
  const district = await peer.enterDistrict();
  if (!district.ok) {
    console.error('FAIL district', district.error);
    process.exit(1);
  }
  const wake = await peer.horseWake({
    horsePeerId: HORSE_ID,
    tool: 'barrio.ping',
    barrioId: 'blockly-editor'
  });
  if (!wake.ok) {
    console.error('FAIL wake', wake.error);
    process.exit(1);
  }

  console.log('FEDERATION_OK', {
    actor: ACTOR,
    rnfp: 'active',
    barrio: wake.barrio?.estado,
    horseMode: wake.wake?.horseMode,
    bots: peer.bots,
    puerta: {
      startpack: puerta.startpack.ref,
      seatOk: puerta.seat.ok,
      via: puerta.via
    }
  });

  peer.close();
  horse.close();
  if (plane) await plane.close();
  process.exit(0);
}

main().catch((err) => {
  console.error('FEDERATION_FAIL', err);
  process.exit(1);
});

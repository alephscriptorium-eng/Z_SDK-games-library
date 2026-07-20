/**
 * ciudad — autoridad: una room, una autoridad (límite actual del engine).
 */

import { startAuthority, PROTOCOL_EVENTS } from '@zeus/authority-kit';
import { createCiudadDomainState } from './domain.mjs';
import { AUTHORITY_USER, GAME_ID } from './contract.mjs';
import { resolveCiudadEndpoints } from './endpoints.mjs';
import { loadZeusEnv } from '@zeus/presets-sdk';
import { tryLoadCiudadStartPack, applyStartPackEnv } from './startpack.mjs';
import { sceneFromGamemap } from './scene.mjs';

loadZeusEnv();

const startPackLoaded = await tryLoadCiudadStartPack();
if (!startPackLoaded?.gamemap) {
  throw new Error(
    '[ciudad-authority] startpack-ciudad required (Z02). Set ZEUS_STARTPACK_CIUDAD or install @zeus/startpack-ciudad.'
  );
}
applyStartPackEnv(startPackLoaded);
console.log(
  `[ciudad-authority] start pack ${startPackLoaded.packageName}@${startPackLoaded.version} · scene=${startPackLoaded.gamemap.sceneId}`
);

const endpoints = resolveCiudadEndpoints();
const USER = process.env.ZEUS_SCRIPTORIUM_USER || AUTHORITY_USER;
const ROOM = endpoints.room;
const TICK_MS = Number(process.env.CIUDAD_TICK_MS || 200);
const HEARTBEAT_MS = Number(process.env.CIUDAD_STATE_HEARTBEAT_MS || 5000);

console.log(
  `\n🏙 ciudad authority · game=${GAME_ID} · user=${USER} · room=${ROOM} · tick=${TICK_MS}ms\n`
);

const state = createCiudadDomainState({
  scene: sceneFromGamemap(startPackLoaded.gamemap)
});

const domain = {
  applyIntent: (payload) => state.applyIntent(payload),
  tick: (deltaSec, now) => state.tick(deltaSec, now),
  drainOutbox: () => state.drainOutbox(),
  contentRev: () => state.contentRev(),
  snapshot: (reason, opts) => state.snapshot(reason, opts)
};

await startAuthority({
  user: USER,
  room: ROOM,
  game: GAME_ID,
  tickMs: TICK_MS,
  heartbeatMs: HEARTBEAT_MS,
  domain,
  events: PROTOCOL_EVENTS,
  join: {
    type: 'CiudadAuthority',
    features: ['ciudad-0.1', 'state', 'track', 'ledger', 'wake-stub']
  },
  snapshotBudget: true,
  onLedger: (entry) => {
    console.log(
      `[${USER}] 📜 ${entry.kind ?? entry.entryKind}`,
      JSON.stringify(entry.detail ?? {})
    );
  }
});

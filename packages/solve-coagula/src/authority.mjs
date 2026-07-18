/**
 * solve-coagula — autoridad: authority-kit + dominio narrativo.
 */

import { startAuthority, PROTOCOL_EVENTS } from '@zeus/authority-kit';
import { createSolveDomainState } from './domain.mjs';
import { AUTHORITY_USER, GAME_ID } from './contract.mjs';
import { resolveSolveEndpoints } from './endpoints.mjs';
import { loadZeusEnv } from '@zeus/presets-sdk';
import { tryLoadSolveStartPack, applyStartPackEnv } from './startpack.mjs';
import { loadSolveMaterials } from './materials.mjs';

loadZeusEnv();

const startPackLoaded = await tryLoadSolveStartPack();
if (startPackLoaded) {
  applyStartPackEnv(startPackLoaded);
  console.log(
    `[solve-authority] start pack ${startPackLoaded.packageName}@${startPackLoaded.version} · volumes=${startPackLoaded.volumesRoot}`
  );
}

const materials = loadSolveMaterials({
  volumesRoot: startPackLoaded?.volumesRoot || process.env.ZEUS_VOLUMES_ROOT || null,
  storyBoardPath: startPackLoaded?.storyBoardPath || null
});

const endpoints = resolveSolveEndpoints();
const USER = process.env.ZEUS_SCRIPTORIUM_USER || AUTHORITY_USER;
const ROOM = endpoints.room;
const TICK_MS = Number(process.env.SOLVE_TICK_MS || 500);
const HEARTBEAT_MS = Number(process.env.SOLVE_STATE_HEARTBEAT_MS || 5000);

console.log(
  `\n🜃 solve-coagula authority · game=${GAME_ID} · user=${USER} · room=${ROOM} · acts=${materials.acts.length} · linea=${materials.linea?.registro_count ?? 'n/a'}\n`
);

const state = createSolveDomainState({
  acts: materials.acts,
  linea: materials.linea
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
    type: 'SolveAuthority',
    features: ['solve-coagula-0.1', 'state', 'track', 'ledger', 'linea']
  },
  snapshotBudget: true,
  onLedger: (entry) => {
    console.log(
      `[${USER}] 📜 ${entry.kind ?? entry.entryKind}`,
      JSON.stringify(entry.detail ?? entry)
    );
  }
});

/**
 * pozo — autoridad: instancia @zeus/authority-kit con dominio pozo + feed-kit.
 */

import { startAuthority, PROTOCOL_EVENTS } from '@zeus/authority-kit';
import { createPozoDomainState } from './domain.mjs';
import { AUTHORITY_USER, GAME_ID } from './contract.mjs';
import { resolvePozoEndpoints } from './endpoints.mjs';
import { loadZeusEnv, resolveZeusMcpPorts } from '@zeus/presets-sdk';
import { resolveRuntimeFeeds } from '@zeus/feed-kit';
import { emptyVolume } from '@zeus/volumes-ops';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

loadZeusEnv();

const endpoints = resolvePozoEndpoints();
const USER = process.env.ZEUS_SCRIPTORIUM_USER || AUTHORITY_USER;
const ROOM = endpoints.room;
const TICK_MS = Number(process.env.POZO_TICK_MS || 200);
const HEARTBEAT_MS = Number(process.env.POZO_STATE_HEARTBEAT_MS || 5000);
const FEED_MODE = process.env.ZEUS_POZO_FEEDS || 'auto';
const FEED_SEED = Number(process.env.ZEUS_POZO_FEED_SEED || 1);
const OPS_LEDGER =
  process.env.ZEUS_OPS_LEDGER_PATH || join(tmpdir(), 'zeus-ops-ledger-pozo.jsonl');

const mcpPorts = resolveZeusMcpPorts();
const feeds = await resolveRuntimeFeeds({
  mode: FEED_MODE,
  seed: FEED_SEED,
  logger: console,
  mcpPorts,
  families: ['stream', 'gossip', 'static'],
  // pozo can run with stream alone; gossip soft-optional via probe of stream+static
  requireForAuto: ['stream']
});

console.log(
  `\n🫧 pozo authority · game=${GAME_ID} · user=${USER} · room=${ROOM} · tick=${TICK_MS}ms · feeds=${feeds.mode}\n`
);

const state = createPozoDomainState({ feeds });

const domain = {
  applyIntent: (payload) => {
    const result = state.applyIntent(payload);
    if (result.ok && payload.intent === 'empty') {
      const ops = emptyVolume({
        intent: 'empty_playable',
        role: payload.role || 'player',
        actorId: payload.actorId || 'player',
        volumeId: 'DISK_01',
        ledger: { ledgerPath: OPS_LEDGER }
      });
      if (!ops.ok) {
        console.warn(`[${USER}] empty_playable ops twin:`, ops.error);
      }
    }
    return result;
  },
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
    type: 'PozoAuthority',
    features: ['pozo-0.1', 'state', 'track', 'ledger', 'feeds']
  },
  snapshotBudget: true,
  onLedger: (entry) => {
    console.log(
      `[${USER}] 📜 ${entry.kind ?? entry.entryKind}`,
      JSON.stringify(entry.detail ?? { label: entry.label, dropId: entry.dropId })
    );
  }
});

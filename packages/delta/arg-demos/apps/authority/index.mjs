/**
 * delta — autoridad del juego: instancia @zeus/authority-kit con el dominio
 * arg-domain + feeds. Lo genérico (tick, publish, shutdown) vive en el kit.
 */

import { startAuthority } from '@zeus/authority-kit';
import {
  createArgDomainState,
  EVENTS,
  GAME_ID,
  DEFAULT_ARG_ROOM,
  AUTHORITY_USER,
  ARG_TICK_MS,
  ARG_HEARTBEAT_MS,
  deltaV0,
  buildCanteraTopology
} from '@zeus/arg-domain';
import { resolveRuntimeFeeds } from '@zeus/arg-feeds';
import { resolveZeusMcpPorts } from '@zeus/presets-sdk';
import { seatEmptyPlayableOps } from './empty-ops.mjs';

const USER = process.env.ZEUS_SCRIPTORIUM_USER || AUTHORITY_USER;
const ROOM = process.env.ZEUS_ARG_ROOM || DEFAULT_ARG_ROOM;
const TICK_MS = Number(process.env.ARG_TICK_MS || ARG_TICK_MS);
const HEARTBEAT_MS = Number(process.env.ARG_STATE_HEARTBEAT_MS || ARG_HEARTBEAT_MS);
const FEED_MODE = process.env.ZEUS_ARG_FEEDS || 'auto';
const SEED = Number(process.env.ZEUS_ARG_SEED || 1);

const gamemap = {
  id: process.env.ZEUS_ARG_GAMEMAP || 'gamemap-demo',
  objetivo: {
    labeled: Number(process.env.ZEUS_ARG_GOAL_LABELED || 10),
    excavated: Number(process.env.ZEUS_ARG_GOAL_EXCAVATED || 2)
  },
  startPack: (process.env.ZEUS_ARG_START_PACK || 'aleph-tronco-puro,aleph-firehose-browse')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
};

const topology = buildCanteraTopology(deltaV0.cantera);
const feeds = await resolveRuntimeFeeds({
  mode: FEED_MODE,
  seed: SEED,
  logger: console,
  mcpPorts: resolveZeusMcpPorts(),
  gamemap,
  topology
});

const state = createArgDomainState({ feeds, gamemap });

/**
 * Wire: dual canónico + `arg:*` (migración U11).
 * Las vistas/e2e siguen en `arg:*`; el kit ya habla kinds canónicos.
 */
const WIRE_EVENTS = {
  STATE: ['state', EVENTS.STATE],
  INTENT: ['intent', EVENTS.INTENT],
  TRACK: ['track', EVENTS.TRACK],
  LEDGER: ['ledger', EVENTS.LEDGER]
};

const domain = {
  applyIntent: (payload) => {
    const result = state.applyIntent(payload);
    if (result.ok && payload.intent === 'empty') {
      const ops = seatEmptyPlayableOps(payload, { game: 'delta', volumeId: 'DISK_01' });
      if (!ops.ok) {
        console.warn(`[${USER}] empty_playable ops twin:`, ops.error);
      }
    }
    return result;
  },
  tick: (deltaSec, now) => state.tick(deltaSec, now),
  drainOutbox: () => state.drainOutbox(),
  contentRev: () => state.mazeRev(),
  snapshot: (reason, { full = false } = {}) => state.snapshot(reason, { fullMaze: full })
};

console.log(
  `\n🌊 delta authority · game=${GAME_ID} · user=${USER} · room=${ROOM} · scene=${state.scene.id} · feeds=${feeds.mode ?? FEED_MODE} · tick=${TICK_MS}ms\n`
);

await startAuthority({
  user: USER,
  room: ROOM,
  game: GAME_ID,
  tickMs: TICK_MS,
  heartbeatMs: HEARTBEAT_MS,
  domain,
  events: WIRE_EVENTS,
  join: {
    type: 'ArgAuthority',
    features: ['delta-0.1', 'arg-state', 'arg-track', 'arg-ledger']
  },
  snapshotBudget: true,
  onLedger: (entry) => {
    console.log(`[${USER}] 📜 ${entry.kind}`, JSON.stringify(entry.detail ?? entry.ref ?? ''));
  },
  onShutdown: async () => {
    if (typeof feeds.close === 'function') await feeds.close();
  }
});

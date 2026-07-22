/**
 * Smoke in-process (sin socket / sin aleph): mock CP + authority fake-rooms +
 * peer que solo habla protocolo (makeIntent) — eje IV local.
 *
 *   node packages/ciudad/fixtures/federation-smoke.mjs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startAuthority, PROTOCOL_EVENTS } from '@zeus/authority-kit';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent, GAME_ID, EVENTS } from '../src/contract.mjs';
import { sceneFromGamemap } from '../src/scene.mjs';
import { createMockControlPlane } from './federation/mock-control-plane.mjs';
import {
  emitirCredencialFederada,
  entrarPorPuertaFederada,
  PUERTA_DEFAULT_STARTPACK
} from './federation/peer-external.mjs';

/** Si se setea, vuelca ledger+tracks al path (D1 Z07 proyección post-Z04). */
const LEDGER_OUT = process.env.CIUDAD_LEDGER_OUT
  ? resolve(process.env.CIUDAD_LEDGER_OUT)
  : null;
/** Reloj fijo al volcar fixture (determinismo). */
const FIXED_CLOCK = LEDGER_OUT ? 1_700_000_000_000 : null;

const seed = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);

function createFakeIo() {
  /** @type {Map<string, Function[]>} */
  const handlers = new Map();
  return {
    on(event, fn) {
      const list = handlers.get(event) ?? [];
      list.push(fn);
      handlers.set(event, list);
    },
    off(event, fn) {
      const list = handlers.get(event) ?? [];
      handlers.set(
        event,
        list.filter((f) => f !== fn)
      );
    },
    emit(event, data) {
      for (const fn of handlers.get(event) ?? []) fn(data);
    },
    close() {
      this.closed = true;
    },
    closed: false,
    _handlers: handlers
  };
}

/** Bus in-memory que acopla authority + peer + horse sin scriptorium. */
function createRoomBus() {
  /** @type {Map<string, ReturnType<typeof createFakeIo>>} */
  const ios = new Map();

  function getIo(user) {
    if (!ios.has(user)) ios.set(user, createFakeIo());
    return ios.get(user);
  }

  function broadcast(fromUser, event, payload, _room) {
    for (const [user, io] of ios) {
      if (user === fromUser) continue;
      io.emit(event, payload);
      io.emit('ROOM_MESSAGE', { event, room: _room, data: payload });
    }
  }

  function createClient(user, _overrides = {}) {
    const io = getIo(user);
    return {
      io,
      room(event, payload, room) {
        // authority-kit publishes via client.room; peer emits intents the same way
        if (event === EVENTS.INTENT || event === 'intent') {
          // deliver intent to all (authority listens on INTENT)
          broadcast(user, event, payload, room);
          // also direct to authority io if present
          for (const [u, target] of ios) {
            if (u === user) continue;
            target.emit(event, payload);
          }
        } else if (event === 'HORSE') {
          broadcast(user, 'HORSE', payload, room);
        } else {
          // state/track/ledger from authority → peers
          broadcast(user, event, payload, room);
        }
      }
    };
  }

  return { createClient, getIo };
}

async function main() {
  const ROOM = 'CIUDAD_FED_SMOKE';
  const ACTOR = 'ext-rabbit';
  const AUTH = 'ciudad-authority';
  const HORSE = 'barrio-horse';

  const gamemap = JSON.parse(readFileSync(seed, 'utf8'));
  const state = createCiudadDomainState({
    now: () => (FIXED_CLOCK != null ? FIXED_CLOCK : Date.now()),
    scene: sceneFromGamemap(gamemap)
  });
  /** Espejo del outbox: authority drena; necesitamos acumulado para fixture. */
  const ledgerMirror = { ledger: [], tracks: [] };
  const domain = {
    applyIntent: (p) => state.applyIntent(p),
    tick: () => {},
    drainOutbox: () => {
      const out = state.drainOutbox();
      ledgerMirror.ledger.push(...out.ledger);
      ledgerMirror.tracks.push(...out.tracks);
      return out;
    },
    contentRev: () => state.contentRev(),
    snapshot: (reason, opts) => state.snapshot(reason, opts)
  };

  const bus = createRoomBus();
  const plane = createMockControlPlane({ port: 0 });
  const { url } = await plane.listen();
  const cp = plane.client(url);

  const auth = await startAuthority({
    user: AUTH,
    room: ROOM,
    game: GAME_ID,
    tickMs: 60_000,
    heartbeatMs: 60_000,
    domain,
    events: PROTOCOL_EVENTS,
    installSignalHandlers: false,
    exitOnSignal: null,
    log: () => {},
    warn: () => {},
    createClient: (u, o) => bus.createClient(u || AUTH, o),
    connectAndJoin: async () => ({ room: ROOM, socketId: 'auth' })
  });

  // horse: tools/call → wake intent
  const horseClient = bus.createClient(HORSE);
  horseClient.io.on('HORSE', async (raw) => {
    const msg = raw?.data ?? raw;
    if (msg?.method !== 'tools/call' || msg?.params?.name !== 'barrio.ping') return;
    const args = msg.params?.arguments || {};
    const actorId = args.actorId || ACTOR;
    const barrioId = args.barrioId || 'blockly-editor';
    horseClient.room(
      EVENTS.INTENT,
      makeIntent(actorId, 'wake', { tool: 'barrio.ping', barrioId, horseMode: 'horse' }, HORSE),
      ROOM
    );
    horseClient.room(
      'HORSE',
      {
        jsonrpc: '2.0',
        id: msg.id,
        result: { content: [{ type: 'text', text: JSON.stringify({ ok: true }) }] },
        from: HORSE,
        to: msg.from
      },
      ROOM
    );
  });

  // peer: segundo cliente — solo protocolo
  const peerClient = bus.createClient(`peer-${ACTOR}`);
  /** @type {object|null} */
  let lastState = null;
  peerClient.io.on(EVENTS.STATE, (s) => {
    if (s?.actors) lastState = s;
  });
  peerClient.io.on('ROOM_MESSAGE', (m) => {
    if (m?.event === EVENTS.STATE && m.data?.actors) lastState = m.data;
  });

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }
  async function waitFor(fn, timeoutMs, label) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = fn();
      if (v) return v;
      await sleep(20);
    }
    throw new Error(`timeout ${label}`);
  }

  // --- puerta externos (2º cliente): peercard firmada → startpack default ---
  const issued = await emitirCredencialFederada({
    roomId: ROOM,
    displayName: ACTOR
  });
  const puerta = await entrarPorPuertaFederada(issued.credencial);
  if (!puerta.ok) throw new Error(`puerta fail: ${puerta.errors.join('; ')}`);
  if (puerta.startpack.ref !== PUERTA_DEFAULT_STARTPACK.ref) {
    throw new Error(`puerta startpack ${puerta.startpack.ref}`);
  }
  if (!puerta.seat.ok) throw new Error('puerta seat not ok');

  // --- coreografía ---
  const rabbitBot = await cp.startBot('rabbit', ROOM, ACTOR);
  const spiderBot = await cp.startBot('spider', ROOM, `spider-${ACTOR}`);
  await cp.startBot('horse', ROOM, HORSE);
  if (!rabbitBot.data.ok || !spiderBot.data.ok) throw new Error('bots fail');

  // gate: sin RNFP, distrito bloqueado (rito)
  let rnfp = await cp.getActor(spiderBot.data.bot.peerId);
  if (rnfp.data.rnfp !== 'idle') throw new Error('expected idle');

  peerClient.room(EVENTS.INTENT, makeIntent(ACTOR, 'join', { kind: 'player' }, `peer-${ACTOR}`), ROOM);
  await waitFor(() => lastState?.actors?.[ACTOR], 2000, 'join');

  peerClient.room(
    EVENTS.INTENT,
    makeIntent(ACTOR, 'announce', { message: 'federación smoke' }, `peer-${ACTOR}`),
    ROOM
  );
  await waitFor(() => lastState?.lastAnnounce?.actorId === ACTOR, 2000, 'announce');

  // intento cruce sin RNFP → el peer gate (no emitimos walk)
  const blocked = rnfp.data.rnfp !== 'active';
  if (!blocked) throw new Error('should block before activate');

  await cp.activateRnfp(spiderBot.data.bot.peerId, 'rnfp.distrito');
  rnfp = await cp.getActor(spiderBot.data.bot.peerId);
  if (rnfp.data.rnfp !== 'active') throw new Error('rnfp not active');

  peerClient.room(EVENTS.INTENT, makeIntent(ACTOR, 'walk', { nodeId: 'zigurat' }, `peer-${ACTOR}`), ROOM);
  await waitFor(() => lastState?.actors?.[ACTOR]?.nodeId === 'zigurat', 2000, 'zigurat');
  peerClient.room(
    EVENTS.INTENT,
    makeIntent(ACTOR, 'walk', { anchorId: 'ancla-blockly-editor' }, `peer-${ACTOR}`),
    ROOM
  );
  await waitFor(
    () => lastState?.actors?.[ACTOR]?.anchorId === 'ancla-blockly-editor',
    2000,
    'ancla'
  );

  peerClient.room(
    'HORSE',
    {
      jsonrpc: '2.0',
      method: 'tools/call',
      params: {
        name: 'barrio.ping',
        arguments: { barrioId: 'blockly-editor', actorId: ACTOR }
      },
      id: 1,
      from: `peer-${ACTOR}`,
      to: HORSE
    },
    ROOM
  );

  await waitFor(
    () => lastState?.barrios?.['blockly-editor']?.estado === 'vivo',
    2000,
    'barrio vivo'
  );

  if (lastState.lastWake?.horseMode !== 'horse') {
    throw new Error(`expected horseMode horse got ${lastState.lastWake?.horseMode}`);
  }

  // cero acceso directo al state interno: solo snapshot publicado
  const peers = await cp.listPeers();
  console.log('FEDERATION_SMOKE_OK', {
    barrio: lastState.barrios['blockly-editor'].estado,
    horseMode: lastState.lastWake.horseMode,
    rnfp: rnfp.data.rnfp,
    peerCount: peers.data.peers.length,
    controlPlane: url,
    puerta: {
      startpack: puerta.startpack.ref,
      seatOk: puerta.seat.ok,
      via: issued.via,
      kit: puerta.kit
    }
  });

  if (LEDGER_OUT) {
    // Fixture limpio: misma coreografía peer→horse, un apply por intent.
    // El bus in-process del smoke entrega INTENT dos veces a authority
    // (broadcast + loop), lo que duplicaría announce/walk en ledgerMirror.
    const clean = createCiudadDomainState({
      now: () => FIXED_CLOCK,
      scene: sceneFromGamemap(gamemap)
    });
    const steps = [
      ['join', { kind: 'player' }],
      ['announce', { message: 'federación smoke' }],
      ['walk', { nodeId: 'zigurat' }],
      ['walk', { anchorId: 'ancla-blockly-editor' }],
      ['wake', { tool: 'barrio.ping', barrioId: 'blockly-editor', horseMode: 'horse' }]
    ];
    for (const [intent, args] of steps) {
      const r = clean.applyIntent(makeIntent(ACTOR, intent, args, `peer-${ACTOR}`));
      if (!r.ok) throw new Error(`ledger capture fail ${intent}: ${r.error}`);
    }
    const out = clean.drainOutbox();
    const snap = clean.snapshot('federation-smoke-ledger');
    if (snap.lastWake?.horseMode !== 'horse') {
      throw new Error('ledger capture expected horseMode horse');
    }
    const fixture = {
      source:
        'packages/ciudad/fixtures/federation-smoke.mjs (Z04 peer e2e · horseMode horse)',
      generated_by:
        'CIUDAD_LEDGER_OUT post federation-smoke OK (coreografía limpia)',
      note:
        'Gate: federation-smoke in-process OK. Fixture = applyIntent 1× por paso (evita doble INTENT del bus smoke).',
      clock: FIXED_CLOCK,
      ledger: out.ledger,
      tracks: out.tracks,
      lastWake: snap.lastWake,
      barrio: snap.barrios?.['blockly-editor'] ?? null,
      smoke_mirror_counts: {
        ledger: ledgerMirror.ledger.length,
        tracks: ledgerMirror.tracks.length
      }
    };
    writeFileSync(LEDGER_OUT, `${JSON.stringify(fixture, null, 2)}\n`, 'utf8');
    console.log('CIUDAD_LEDGER_OUT', LEDGER_OUT, {
      ledger: fixture.ledger.length,
      tracks: fixture.tracks.length,
      horseMode: fixture.lastWake?.horseMode
    });
  }

  await auth.stop(null);
  await plane.close();
}

main().catch((err) => {
  console.error('FEDERATION_SMOKE_FAIL', err);
  process.exit(1);
});

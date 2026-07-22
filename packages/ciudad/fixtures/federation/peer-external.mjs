/**
 * Peer externo federado (eje IV): segundo cliente de rooms/protocol.
 * NO toca el dominio de la authority — solo makeIntent + rooms + control-plane.
 *
 * Coreografía Z04:
 *   rabbit announce plaza → spider RNFP active → walk distrito → horse tools/call → wake
 *
 * Puerta externos (2º cliente): peercard firmada (E02 seat) + startpack-ciudad-v0.1.0
 * como base default. Consume @zeus/embajador-kit vía resolveZeusSdkRoot /
 * sibling / registry; si no, protocol + mismo ref default.
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createClient, connectAndJoin } from '@zeus/rooms';
import {
  makePeerCard,
  isPeerCardFresh,
  roleFromPeerCard
} from '@zeus/protocol';
import { EVENTS, makeIntent, DEFAULT_CIUDAD_ROOM } from '../../src/contract.mjs';

/** Norte CA: mismo ref que @zeus/embajador-kit DEFAULT_STARTPACK. */
export const PUERTA_DEFAULT_STARTPACK = Object.freeze({
  id: 'startpack-ciudad',
  version: '0.1.0',
  ref: 'startpack-ciudad-v0.1.0',
  packageName: '@zeus/startpack-ciudad'
});

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);

function zeusSdkCandidates() {
  const roots = [];
  try {
    const { resolveZeusSdkRoot } = require('../../../../scripts/zeus-sdk-root.cjs');
    const sdk = resolveZeusSdkRoot({ required: false });
    if (sdk) roots.push(sdk);
  } catch {
    /* resolver no disponible */
  }
  roots.push(path.resolve(__dirname, '../../../../../zeus-sdk'));
  return [...new Set(roots)];
}

async function loadPeerCardSeat() {
  for (const root of zeusSdkCandidates()) {
    const candidate = path.join(root, 'packages/engine/protocol/src/peer-card-seat.mjs');
    try {
      return await import(pathToFileURL(candidate).href);
    } catch {
      /* next */
    }
  }
  try {
    return await import('@zeus/protocol/peer-card-seat');
  } catch (err) {
    throw new Error(
      `peer-card-seat unavailable (resolveZeusSdkRoot / tip post-E02): ${err.message}`
    );
  }
}

async function tryLoadEmbajadorKit() {
  const candidates = [];
  for (const root of zeusSdkCandidates()) {
    candidates.push(path.join(root, 'packages/engine/embajador-kit/src/index.mjs'));
  }
  for (const candidate of candidates) {
    try {
      const mod = await import(pathToFileURL(candidate).href);
      if (mod?.emitirCredencial && mod?.consumirCredencial && mod?.DEFAULT_STARTPACK) {
        return mod;
      }
    } catch {
      /* next */
    }
  }
  try {
    return await import(pathToFileURL(require.resolve('@zeus/embajador-kit')).href);
  } catch {
    return null;
  }
}

/**
 * Emite peercard firmada (E02) + startpack default para entrada federada.
 * @param {object} [input]
 */
export async function emitirCredencialFederada(input = {}) {
  const kit = await tryLoadEmbajadorKit();
  const { generateSeatKeyPair, signTravelingPeerCard } = await loadPeerCardSeat();
  const keys = generateSeatKeyPair();
  const expiresAt =
    input.expiresAt ?? new Date(Date.now() + 60 * 60 * 1000).toISOString();

  if (kit) {
    const unsigned = kit.emitirCredencial({
      roomId: input.roomId ?? DEFAULT_CIUDAD_ROOM,
      endpoint: input.endpoint ?? 'wss://rooms.example/runtime',
      token: input.token ?? 'fed-puerta',
      role: input.role ?? 'player',
      displayName: input.displayName ?? 'ext-rabbit',
      expiresAt,
      signature: null
    });
    const signedCard = signTravelingPeerCard(
      unsigned.peerCard,
      keys.privateKey,
      keys.ssbId
    );
    return {
      credencial: {
        ...unsigned,
        peerCard: signedCard,
        signature: {
          alg: 'ed25519-seat',
          value: signedCard.seatSignature,
          ssbId: keys.ssbId,
          pending: false
        }
      },
      keys: { ssbId: keys.ssbId },
      via: 'embajador-kit'
    };
  }

  const peerCard = makePeerCard({
    roomId: input.roomId ?? DEFAULT_CIUDAD_ROOM,
    endpoint: input.endpoint ?? 'wss://rooms.example/runtime',
    token: input.token ?? 'fed-puerta',
    scopes: ['role:player', 'presence:join', 'webrtc:signal'],
    expiresAt,
    displayName: input.displayName ?? 'ext-rabbit'
  });
  const signedCard = signTravelingPeerCard(peerCard, keys.privateKey, keys.ssbId);
  return {
    credencial: {
      version: 'embajador/1',
      peerCard: signedCard,
      startpack: { ...PUERTA_DEFAULT_STARTPACK },
      signature: {
        alg: 'ed25519-seat',
        value: signedCard.seatSignature,
        ssbId: keys.ssbId,
        pending: false
      }
    },
    keys: { ssbId: keys.ssbId },
    via: 'protocol-fallback'
  };
}

/**
 * Consume peercard por la puerta (2º cliente eje IV).
 * @param {unknown} raw
 * @param {object} [opts]
 */
export async function entrarPorPuertaFederada(raw, opts = {}) {
  const kit = await tryLoadEmbajadorKit();
  const { verifyTravelingPeerCard } = await loadPeerCardSeat();
  /** @type {string[]} */
  const errors = [];
  let peerCard = null;
  let startpack = null;
  let defaultStartpack = false;
  let role = null;

  if (kit) {
    const c = kit.consumirCredencial(raw, {
      now: opts.now,
      requireFresh: opts.requireFresh !== false
    });
    errors.push(...c.errors);
    peerCard = c.peerCard;
    startpack = c.startpack;
    defaultStartpack = c.defaultStartpack;
    role = c.role;
  } else {
    const envelope =
      raw && typeof raw === 'object' ? /** @type {Record<string, unknown>} */ (raw) : null;
    peerCard =
      envelope?.peerCard && typeof envelope.peerCard === 'object'
        ? envelope.peerCard
        : envelope;
    if (!peerCard || typeof peerCard !== 'object') {
      errors.push('credencial: missing peerCard');
    } else if (
      opts.requireFresh !== false &&
      !isPeerCardFresh(peerCard, opts.now ?? Date.now())
    ) {
      errors.push('peerCard: expirado');
    } else {
      role = roleFromPeerCard(peerCard);
    }
    const sp = envelope?.startpack;
    if (sp == null) {
      startpack = { ...PUERTA_DEFAULT_STARTPACK };
      defaultStartpack = true;
    } else if (typeof sp === 'object' && /** @type {any} */ (sp).ref) {
      startpack = /** @type {any} */ (sp);
      defaultStartpack = startpack.ref === PUERTA_DEFAULT_STARTPACK.ref;
    } else {
      errors.push('startpack: shape inválido');
    }
  }

  const seat = peerCard
    ? verifyTravelingPeerCard(peerCard)
    : { ok: false, error: 'peer-card missing' };
  if (!seat.ok) errors.push(`seat: ${seat.error ?? 'verify failed'}`);
  if (
    startpack &&
    startpack.ref !== PUERTA_DEFAULT_STARTPACK.ref &&
    opts.requireDefault !== false
  ) {
    errors.push(
      `startpack: expected ${PUERTA_DEFAULT_STARTPACK.ref}, got ${startpack.ref}`
    );
  }

  return {
    ok: errors.length === 0,
    errors,
    peerCard,
    startpack,
    defaultStartpack:
      defaultStartpack || startpack?.ref === PUERTA_DEFAULT_STARTPACK.ref,
    role,
    seat: seat.ok ? { ok: true } : { ok: false, error: seat.error },
    ssbId: peerCard?.ssbId ?? null,
    kit: kit ? 'embajador-kit' : 'protocol-fallback'
  };
}

/**
 * @param {{
 *   actor?: string,
 *   room?: string,
 *   user?: string,
 *   controlPlane: { startBot: Function, activateRnfp: Function, getActor: Function, listPeers?: Function },
 *   logger?: Console
 * }} opts
 */
export function createFederationPeer(opts) {
  const actor = opts.actor || 'ext-rabbit';
  const room = opts.room || process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM;
  const user = opts.user || `peer-${actor}`;
  const cp = opts.controlPlane;
  const logger = opts.logger || console;

  if (!cp || typeof cp.startBot !== 'function') {
    throw new TypeError('createFederationPeer: controlPlane requerido');
  }

  const client = createClient(user, { room });
  /** @type {object|null} */
  let lastState = null;
  let connected = false;
  /** @type {{ rabbit?: string, spider?: string, horse?: string }} */
  const bots = {};
  /** @type {Map<number|string, object>} */
  const horseResponses = new Map();
  let rpcId = 1;

  function onState(snapshot) {
    if (!snapshot || typeof snapshot !== 'object' || !snapshot.actors) return;
    if (lastState && typeof snapshot.ts === 'number' && snapshot.ts < lastState.ts) return;
    lastState = snapshot;
  }

  client.io.on(EVENTS.STATE, onState);
  client.io.on('ROOM_MESSAGE', (message) => {
    const entries = Array.isArray(message) ? message : [message];
    for (const entry of entries) {
      if (entry?.event === EVENTS.STATE) onState(entry.data);
      if (entry?.event === 'HORSE') {
        const envelope = entry.data?.data ?? entry.data ?? entry;
        const msg = envelope?.data ?? envelope;
        if (msg?.id != null && (msg.result || msg.error)) {
          horseResponses.set(msg.id, msg);
        }
      }
    }
  });
  client.io.on('HORSE', (raw) => {
    const envelope = raw?.data ?? raw;
    const msg = envelope?.data ?? envelope;
    if (msg?.id != null && (msg.result || msg.error)) {
      horseResponses.set(msg.id, msg);
    }
  });

  function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
  }

  async function waitFor(fn, timeoutMs, label) {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
      const v = fn();
      if (v) return v;
      await sleep(100);
    }
    throw new Error(`timeout: ${label}`);
  }

  function emitIntent(intentName, args = {}) {
    if (!connected) throw new Error('peer_no_conectado');
    client.room(EVENTS.INTENT, makeIntent(actor, intentName, args, user), room);
  }

  return {
    actor,
    room,
    user,
    client,
    bots,
    lastState: () => lastState,
    get connected() {
      return connected;
    },

    /**
     * Registra bots r/s/h en el control-plane (mock o real).
     */
    async registerBots() {
      const rabbit = await cp.startBot('rabbit', room, actor);
      if (rabbit.status >= 400 || !rabbit.data?.ok) {
        throw new Error(`bot rabbit: ${JSON.stringify(rabbit.data)}`);
      }
      bots.rabbit = rabbit.data.bot.peerId;

      const spider = await cp.startBot('spider', room, `spider-${actor}`);
      if (spider.status >= 400 || !spider.data?.ok) {
        throw new Error(`bot spider: ${JSON.stringify(spider.data)}`);
      }
      bots.spider = spider.data.bot.peerId;

      const horse = await cp.startBot('horse', room, `horse-${actor}`);
      if (horse.status >= 400 || !horse.data?.ok) {
        throw new Error(`bot horse: ${JSON.stringify(horse.data)}`);
      }
      bots.horse = horse.data.bot.peerId;

      logger.log(
        `[peer] bots · rabbit=${bots.rabbit} spider=${bots.spider} horse=${bots.horse}`
      );
      return { ...bots };
    },

    async connect() {
      await connectAndJoin(client, user, {
        type: 'CiudadExternalPeer',
        features: ['ciudad-0.1', 'intent', 'rsh-federation', 'horse', 'puerta'],
        room
      });
      connected = true;
      logger.log(`[peer] conectado room=${room} user=${user}`);
    },

    /**
     * Puerta externos: entra con peercard firmada → startpack-ciudad-v0.1.0.
     * @param {object} [credencial] — omit → emite una firmada (E02 + kit)
     */
    async enterWithPuerta(credencial) {
      const issued =
        credencial == null
          ? await emitirCredencialFederada({
              roomId: room,
              displayName: actor
            })
          : { credencial, via: 'provided' };
      const entry = await entrarPorPuertaFederada(issued.credencial);
      if (!entry.ok) {
        throw new Error(`puerta: ${entry.errors.join('; ')}`);
      }
      logger.log(
        `[peer] puerta ok · startpack=${entry.startpack.ref} · seat · via=${issued.via ?? entry.kit}`
      );
      return { ...entry, credencial: issued.credencial, via: issued.via ?? entry.kit };
    },

    /** Rabbit: presencia — join + announce en plaza. */
    async announcePresence(message = 'peer externo presente', timeoutMs = 8000) {
      emitIntent('join', { kind: 'player' });
      await waitFor(() => lastState?.actors?.[actor], timeoutMs, 'join');
      const before = lastState?.lastAnnounce?.ts ?? 0;
      emitIntent('announce', { message });
      await waitFor(() => {
        const a = lastState?.lastAnnounce;
        return a && a.actorId === actor && a.ts > before;
      }, timeoutMs, 'announce');
      return lastState.lastAnnounce;
    },

    /**
     * Spider: rito RNFP active (entrada al distrito).
     * Sin active → enterDistrict falla.
     */
    async federateRnfp(capability = 'rnfp.distrito') {
      if (!bots.spider) throw new Error('spider_no_registrado');
      const res = await cp.activateRnfp(bots.spider, capability);
      if (res.status >= 400 || !res.data?.ok) {
        throw new Error(`rnfp activate: ${JSON.stringify(res.data)}`);
      }
      const check = await cp.getActor(bots.spider);
      if (check.data?.rnfp !== 'active') {
        throw new Error(`rnfp no active: ${JSON.stringify(check.data)}`);
      }
      logger.log(`[peer] RNFP active · ${bots.spider} · ${capability}`);
      return check.data;
    },

    async assertRnfpActive() {
      if (!bots.spider) return false;
      const check = await cp.getActor(bots.spider);
      return check.data?.rnfp === 'active';
    },

    /**
     * Cruce a distrito: exige RNFP active. Emite walk(s) por protocolo.
     */
    async enterDistrict(
      {
        viaNodeId = 'zigurat',
        anchorId = 'ancla-blockly-editor',
        timeoutMs = 10000
      } = {}
    ) {
      const active = await this.assertRnfpActive();
      if (!active) {
        return { ok: false, error: 'rnfp_inactive_distrito_bloqueado' };
      }
      emitIntent('walk', { nodeId: viaNodeId });
      await waitFor(
        () => lastState?.actors?.[actor]?.nodeId === viaNodeId,
        timeoutMs,
        `walk ${viaNodeId}`
      );
      emitIntent('walk', { anchorId });
      await waitFor(
        () => lastState?.actors?.[actor]?.anchorId === anchorId,
        timeoutMs,
        `walk ${anchorId}`
      );
      return { ok: true, actor: lastState.actors[actor] };
    },

    /**
     * Horse: tools/call → barrio horse responde con wake (horseMode horse).
     * @param {string} horsePeerId destino HORSE (barrio horse en room)
     */
    async horseWake(
      {
        horsePeerId,
        tool = 'barrio.ping',
        barrioId = 'blockly-editor',
        timeoutMs = 10000
      } = {}
    ) {
      if (!horsePeerId) throw new Error('horsePeerId_requerido');
      const before = lastState?.lastWake?.ts ?? 0;
      const id = rpcId++;
      client.room(
        'HORSE',
        {
          jsonrpc: '2.0',
          method: 'tools/call',
          params: {
            name: tool,
            arguments: { barrioId, actorId: actor }
          },
          id,
          from: user,
          to: horsePeerId
        },
        room
      );
      await waitFor(() => horseResponses.has(id), timeoutMs, `HORSE tools/call ${tool}`);
      const rpc = horseResponses.get(id);
      if (rpc.error) {
        return { ok: false, error: rpc.error.message || 'horse_error', rpc };
      }
      await waitFor(() => {
        const w = lastState?.lastWake;
        return (
          w &&
          w.actorId === actor &&
          w.ts > before &&
          lastState?.barrios?.[barrioId]?.estado === 'vivo'
        );
      }, timeoutMs, 'wake visible en state');
      return {
        ok: true,
        rpc,
        wake: lastState.lastWake,
        barrio: lastState.barrios[barrioId]
      };
    },

    close() {
      client.io.close();
      connected = false;
    }
  };
}

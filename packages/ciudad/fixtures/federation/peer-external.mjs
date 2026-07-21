/**
 * Peer externo federado (eje IV): segundo cliente de rooms/protocol.
 * NO toca el dominio de la authority — solo makeIntent + rooms + control-plane.
 *
 * Coreografía Z04:
 *   rabbit announce plaza → spider RNFP active → walk distrito → horse tools/call → wake
 */

import { createClient, connectAndJoin } from '@zeus/rooms';
import { EVENTS, makeIntent, DEFAULT_CIUDAD_ROOM } from '../../src/contract.mjs';

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
        features: ['ciudad-0.1', 'intent', 'rsh-federation', 'horse'],
        room
      });
      connected = true;
      logger.log(`[peer] conectado room=${room} user=${user}`);
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

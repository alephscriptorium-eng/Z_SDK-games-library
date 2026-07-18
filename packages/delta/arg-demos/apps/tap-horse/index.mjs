/**
 * Responders HORSE de los grifos — tools/call tap.set_aperture → arg:intent tap:set.
 */

import { createClient, connectAndJoin } from '@zeus/rooms';
import {
  resolvePresetOffer,
  broadcastPresetOffer,
  createPresetHorseProxy
} from '@zeus/presets-sdk/horse';
import { makeIntent, EVENTS, DEFAULT_ARG_ROOM } from '@zeus/arg-domain';
import { grifoCloakDef, GRIFO_IDS } from '@zeus/arg-domain/scenes/tap-cloaks';

const ROOM = process.env.ZEUS_ARG_ROOM || DEFAULT_ARG_ROOM;
const GRIFOS = (process.env.TAP_HORSE_GRIFO || GRIFO_IDS.join(',')).split(',').map((s) => s.trim()).filter(Boolean);

function resolveActorId(from) {
  const raw = String(from ?? '');
  if (raw.startsWith('jugador-')) return raw.slice('jugador-'.length);
  if (raw.startsWith('e2e-')) return raw.slice('e2e-'.length);
  return raw;
}

/**
 * @param {string} grifoId
 */
async function startGrifo(grifoId) {
  const { preset, catalog, tapId } = grifoCloakDef(grifoId);
  const client = createClient(grifoId, { room: ROOM });
  const offer = resolvePresetOffer(preset, catalog);

  let requesterId = null;

  const upstream = {
    async callTool(serverName, name, args = {}) {
      if (serverName !== 'arg-tap' || name !== 'tap.set_aperture') {
        throw new Error(`tool no soportada: ${serverName}.${name}`);
      }
      const aperture = Number(args.aperture);
      if (!Number.isFinite(aperture)) throw new Error('aperture requerida');
      const actorId = resolveActorId(requesterId);
      if (!actorId) throw new Error('sin solicitante HORSE');
      client.room(
        EVENTS.INTENT,
        makeIntent(actorId, 'tap:set', { tapId, aperture }),
        ROOM
      );
      return {
        content: [{ type: 'text', text: JSON.stringify({ ok: true, tapId, aperture }) }]
      };
    }
  };

  const proxy = createPresetHorseProxy({ offer, upstream });
  proxy.attach = (c, room, selfId) => {
    const handler = async (raw) => {
      const envelope = raw?.data ?? raw;
      if (envelope?.to && envelope.to !== selfId && envelope.to !== '*') return;
      const msg = envelope?.data ?? envelope;
      if (!msg?.jsonrpc || !msg.method) return;
      if (msg.from === selfId) return;
      if (msg.method === 'initialize') {
        broadcastPresetOffer(c, room, selfId, offer);
      }
      requesterId = msg.from ?? envelope.from ?? null;
      const response = await proxy.handleMessage(msg);
      requesterId = null;
      if (!response) return;
      const { id, result, error } = response;
      c.room('HORSE', {
        jsonrpc: '2.0',
        id,
        result,
        error,
        from: selfId,
        to: msg.from ?? envelope.from
      }, room);
    };
    c.io.on('HORSE', handler);
    proxy._unsub = () => c.io.off('HORSE', handler);
    return proxy._unsub;
  };
  proxy.attach(client, ROOM, grifoId);

  await connectAndJoin(client, grifoId, {
    type: 'ArgTap',
    features: ['horse', 'horse-preset', 'arg-tap'],
    room: ROOM
  });

  broadcastPresetOffer(client, ROOM, grifoId, offer);

  console.log(
    `⚙ tap-horse · user=${grifoId} · room=${ROOM} · tool=tap.set_aperture → ${tapId}`
  );

  return { client, proxy, grifoId };
}

const running = [];
for (const grifoId of GRIFOS) {
  running.push(await startGrifo(grifoId));
}

async function shutdown() {
  for (const { proxy, client } of running) {
    proxy.detach();
    client.io.close();
  }
  console.log('\n[tap-horse] saliendo');
  process.exit(0);
}

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);

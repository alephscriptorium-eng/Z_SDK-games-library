/**
 * Horse de barrio: responde HORSE tools/call → intent wake (horseMode:horse).
 * Precedente: packages/delta/arg-demos/apps/tap-horse (tools/call → intent).
 * Horse nunca lleva bytes (SPEC-horse-blobs-v0): solo refs en arguments.
 */

import { createClient, connectAndJoin } from '@zeus/rooms';
import { EVENTS, makeIntent, DEFAULT_CIUDAD_ROOM } from '../../src/contract.mjs';

/**
 * @param {{
 *   horseId?: string,
 *   room?: string,
 *   toolName?: string,
 *   logger?: Console
 * }} [opts]
 */
export async function startBarrioHorse(opts = {}) {
  const horseId = opts.horseId || 'barrio-horse';
  const room = opts.room || process.env.ZEUS_CIUDAD_ROOM || DEFAULT_CIUDAD_ROOM;
  const toolName = opts.toolName || 'barrio.ping';
  const logger = opts.logger || console;

  const client = createClient(horseId, { room });
  /** @type {string|null} */
  let requesterFrom = null;

  function resolveActorId(from, args) {
    if (typeof args?.actorId === 'string' && args.actorId.trim()) {
      return args.actorId.trim();
    }
    const raw = String(from ?? '');
    if (raw.startsWith('peer-')) return raw.slice('peer-'.length);
    if (raw.startsWith('mcp-')) return raw.slice('mcp-'.length);
    if (raw.startsWith('jugador-')) return raw.slice('jugador-'.length);
    return raw || null;
  }

  async function handleMessage(msg) {
    if (!msg?.jsonrpc || !msg.method) return null;
    if (msg.method === 'initialize' || msg.method === 'tools/list') {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        result: {
          tools: [
            {
              name: toolName,
              description: 'Despierta barrio latente vía intent wake (sin bytes)'
            }
          ]
        }
      };
    }
    if (msg.method !== 'tools/call') {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32601, message: `method_no_soportado:${msg.method}` }
      };
    }
    const name = msg.params?.name;
    const args = msg.params?.arguments || {};
    if (name !== toolName) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32602, message: `tool_no_soportada:${name}` }
      };
    }
    const actorId = resolveActorId(requesterFrom ?? msg.from, args);
    if (!actorId) {
      return {
        jsonrpc: '2.0',
        id: msg.id,
        error: { code: -32602, message: 'actorId_requerido' }
      };
    }
    const barrioId =
      typeof args.barrioId === 'string' && args.barrioId.trim()
        ? args.barrioId.trim()
        : 'blockly-editor';

    client.room(
      EVENTS.INTENT,
      makeIntent(
        actorId,
        'wake',
        { tool: toolName, barrioId, horseMode: 'horse' },
        horseId
      ),
      room
    );

    return {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              ok: true,
              tool: toolName,
              barrioId,
              actorId,
              horseMode: 'horse'
            })
          }
        ]
      }
    };
  }

  const onHorse = async (raw) => {
    const envelope = raw?.data ?? raw;
    if (envelope?.to && envelope.to !== horseId && envelope.to !== '*') return;
    const msg = envelope?.data ?? envelope;
    if (!msg?.jsonrpc || !msg.method) return;
    if (msg.from === horseId) return;
    requesterFrom = msg.from ?? envelope.from ?? null;
    const response = await handleMessage(msg);
    requesterFrom = null;
    if (!response) return;
    client.room(
      'HORSE',
      {
        ...response,
        from: horseId,
        to: msg.from ?? envelope.from
      },
      room
    );
  };

  client.io.on('HORSE', onHorse);
  client.io.on('ROOM_MESSAGE', (message) => {
    const entries = Array.isArray(message) ? message : [message];
    for (const entry of entries) {
      if (entry?.event === 'HORSE') onHorse(entry.data);
    }
  });

  await connectAndJoin(client, horseId, {
    type: 'CiudadBarrioHorse',
    features: ['horse', 'ciudad-wake', 'no-blobs'],
    room
  });

  // oferta mínima
  client.room(
    'HORSE',
    {
      method: 'offer',
      from: horseId,
      to: '*',
      params: {
        tools: [{ name: toolName }]
      }
    },
    room
  );

  logger.log(`🐴 barrio-horse · id=${horseId} · room=${room} · tool=${toolName}`);

  return {
    horseId,
    client,
    close() {
      client.io.off('HORSE', onHorse);
      client.io.close();
    }
  };
}

/**
 * Z04 rabbit→horse tools/call chain for linea-editor `crear_linea` (gated).
 * In-process bus (federation-smoke pattern). Horse returns refs-only +
 * approve evidence. Volume+kit validate lives in @zeus/linea-editor slice-e2e.
 *
 *   node packages/ciudad/fixtures/linea-editor-slice-smoke.mjs
 */

import { createMockControlPlane } from './federation/mock-control-plane.mjs';
import { pathToFileURL } from 'node:url';

const TOOL = 'crear_linea';
const APPROVE_TOKEN = process.env.ZEUS_MCP_APPROVAL_TOKEN || 'APROBAR';

function createFakeIo() {
  /** @type {Map<string, Function[]>} */
  const handlers = new Map();
  return {
    on(event, fn) {
      const list = handlers.get(event) ?? [];
      list.push(fn);
      handlers.set(event, list);
    },
    emit(event, data) {
      for (const fn of handlers.get(event) ?? []) fn(data);
    }
  };
}

function createRoomBus() {
  /** @type {Map<string, ReturnType<typeof createFakeIo>>} */
  const ios = new Map();

  function getIo(user) {
    if (!ios.has(user)) ios.set(user, createFakeIo());
    return ios.get(user);
  }

  function broadcast(fromUser, event, payload) {
    for (const [user, io] of ios) {
      if (user === fromUser) continue;
      io.emit(event, payload);
    }
  }

  function createClient(user) {
    const io = getIo(user);
    return {
      io,
      room(event, payload) {
        broadcast(user, event, payload);
      }
    };
  }

  return { createClient };
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitFor(fn, timeoutMs, label) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const v = fn();
    if (v) return v;
    await sleep(15);
  }
  throw new Error(`timeout ${label}`);
}

/**
 * @returns {Promise<object>}
 */
export async function runLineaEditorSliceSmoke() {
  const ROOM = 'CIUDAD_Z11_SMOKE';
  const ACTOR = 'rabbit-z11';
  const HORSE = 'barrio-horse';

  const bus = createRoomBus();
  const plane = createMockControlPlane({ port: 0 });
  const { url } = await plane.listen();
  const cp = plane.client(url);

  /** @type {object|null} */
  let lastHorseCall = null;
  /** @type {object|null} */
  let lastHorseResult = null;

  const horseClient = bus.createClient(HORSE);
  horseClient.io.on('HORSE', (raw) => {
    const msg = raw?.data ?? raw;
    if (msg?.method !== 'tools/call' || msg?.params?.name !== TOOL) return;
    lastHorseCall = msg;
    const args = msg.params?.arguments || {};
    const approved =
      args.approve === true && args.approvalToken === APPROVE_TOKEN;
    lastHorseResult = {
      ok: approved,
      approvalToken_evidenced: approved ? args.approvalToken : null,
      refs: {
        linea: `linea://${args.id || 'pending'}`,
        preset: 'preset://linea-editor'
      },
      gate_visible: true,
      horseMode: 'horse'
    };
    horseClient.room('HORSE', {
      jsonrpc: '2.0',
      id: msg.id,
      result: {
        content: [{ type: 'text', text: JSON.stringify(lastHorseResult) }]
      },
      from: HORSE
    });
  });

  const peerClient = bus.createClient(`peer-${ACTOR}`);

  const rabbitBot = await cp.startBot('rabbit', ROOM, ACTOR);
  const spiderBot = await cp.startBot('spider', ROOM, `spider-${ACTOR}`);
  await cp.startBot('horse', ROOM, HORSE);
  if (!rabbitBot.data?.ok || !spiderBot.data?.ok) {
    throw new Error('bots fail');
  }

  // presence → RNFP active (Z04 cadena)
  const rnfp = await cp.setRnfp(spiderBot.data.bot.peerId, 'active');
  if (rnfp.data?.rnfp !== 'active') {
    throw new Error(`expected rnfp active got ${JSON.stringify(rnfp.data)}`);
  }

  peerClient.room('HORSE', {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: TOOL,
      arguments: {
        id: 'slice-juguete',
        approve: true,
        approvalToken: APPROVE_TOKEN,
        actorId: ACTOR
      }
    },
    from: `peer-${ACTOR}`
  });

  await waitFor(
    () => lastHorseCall != null && lastHorseResult?.ok === true,
    3000,
    'horse tools/call crear_linea'
  );

  const wire = JSON.stringify(lastHorseResult);
  if (/wikitext|corpus/i.test(wire) || wire.includes('Novel' + 'istEditor')) {
    throw new Error('horse payload leaked corpus bytes');
  }

  await plane.close();

  return {
    ok: true,
    tool: TOOL,
    approve_evidenced: lastHorseResult.approvalToken_evidenced,
    refs: lastHorseResult.refs,
    rnfp: 'active',
    horseMode: 'horse',
    controlPlane: url,
    note: 'volume+kit validate: @zeus/linea-editor slice-e2e'
  };
}

const isMain =
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  try {
    const result = await runLineaEditorSliceSmoke();
    console.log('LINEA_EDITOR_SLICE_SMOKE_OK', result);
  } catch (err) {
    console.error('LINEA_EDITOR_SLICE_SMOKE_FAIL', err);
    process.exit(1);
  }
}

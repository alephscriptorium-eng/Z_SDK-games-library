/**
 * Mock control-plane r/s/h (OpenAPI mcp-core control-plane).
 * Contrato: POST /bots {role,room,peer?} · GET /peers · GET /actor-registry[/{peerId}]
 * Sin servicio aleph: corre en local para el e2e de federación (Z04).
 */

import http from 'node:http';

const ROLES = new Set(['rabbit', 'spider', 'horse', 'ping', 'pong']);
const RNFP = Object.freeze(['idle', 'awaiting_accept', 'active']);

/**
 * @param {{ port?: number, host?: string }} [opts]
 */
export function createMockControlPlane(opts = {}) {
  const host = opts.host || '127.0.0.1';
  const port = Number(opts.port || 0);

  /** @type {Map<string, { peerId: string, role: string, room: string, rnfp: string, iacm: string, capabilities: string[] }>} */
  const peers = new Map();
  let seq = 0;

  function listPeers() {
    return [...peers.values()].map((p) => ({
      peerId: p.peerId,
      role: p.role,
      room: p.room
    }));
  }

  function registrySnapshot() {
    return {
      peers: [...peers.values()].map((p) => ({
        peerId: p.peerId,
        rnfp: p.rnfp,
        iacm: p.iacm,
        role: p.role,
        room: p.room,
        capabilities: [...p.capabilities]
      }))
    };
  }

  /**
   * @param {string} peerId
   * @param {'idle'|'awaiting_accept'|'active'} state
   */
  function setRnfp(peerId, state) {
    const p = peers.get(peerId);
    if (!p) return null;
    if (!RNFP.includes(state)) throw new Error(`rnfp_invalido:${state}`);
    p.rnfp = state;
    return { peerId, rnfp: p.rnfp, iacm: p.iacm };
  }

  /**
   * Rito spider: invite → awaiting_accept → accept → active (+ capacidad).
   * @param {string} peerId
   * @param {string} [capability]
   */
  function activateRnfp(peerId, capability = 'rnfp.distrito') {
    const p = peers.get(peerId);
    if (!p) return { ok: false, error: 'peer_desconocido' };
    p.rnfp = 'active';
    if (!p.capabilities.includes(capability)) p.capabilities.push(capability);
    return { ok: true, peerId, rnfp: p.rnfp, capabilities: [...p.capabilities] };
  }

  function json(res, code, body) {
    const raw = JSON.stringify(body);
    res.writeHead(code, {
      'content-type': 'application/json; charset=utf-8',
      'content-length': Buffer.byteLength(raw)
    });
    res.end(raw);
  }

  async function readJson(req) {
    const chunks = [];
    for await (const c of req) chunks.push(c);
    if (!chunks.length) return {};
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  }

  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url || '/', `http://${host}`);
    const path = url.pathname.replace(/\/$/, '') || '/';

    try {
      if (req.method === 'GET' && path === '/health') {
        return json(res, 200, { ok: true, service: 'mock-rsh-control-plane' });
      }

      if (req.method === 'POST' && path === '/bots') {
        const body = await readJson(req);
        const role = body.role;
        const room = body.room;
        if (!ROLES.has(role) || typeof room !== 'string' || !room) {
          return json(res, 400, { ok: false, error: 'role_room_requeridos' });
        }
        seq += 1;
        const peerId =
          typeof body.peer === 'string' && body.peer.trim()
            ? body.peer.trim()
            : `${role}-${seq}`;
        const entry = {
          peerId,
          role,
          room,
          rnfp: 'idle',
          iacm: 'idle',
          capabilities: []
        };
        peers.set(peerId, entry);
        return json(res, 200, { ok: true, bot: entry });
      }

      if (req.method === 'GET' && path === '/peers') {
        return json(res, 200, { peers: listPeers() });
      }

      if (req.method === 'GET' && path === '/actor-registry') {
        return json(res, 200, registrySnapshot());
      }

      const one = /^\/actor-registry\/([^/]+)$/.exec(path);
      if (req.method === 'GET' && one) {
        const peerId = decodeURIComponent(one[1]);
        const p = peers.get(peerId);
        if (!p) return json(res, 404, { ok: false, error: 'peer_desconocido' });
        return json(res, 200, {
          peerId: p.peerId,
          rnfp: p.rnfp,
          iacm: p.iacm,
          role: p.role,
          room: p.room,
          capabilities: [...p.capabilities]
        });
      }

      /** Extensión local del mock: rito RNFP (no en OpenAPI mínimo; útil al e2e). */
      if (req.method === 'POST' && path === '/rnfp/activate') {
        const body = await readJson(req);
        const peerId = body.peerId;
        if (typeof peerId !== 'string' || !peerId) {
          return json(res, 400, { ok: false, error: 'peerId_requerido' });
        }
        const result = activateRnfp(peerId, body.capability);
        return json(res, result.ok ? 200 : 404, result);
      }

      if (req.method === 'POST' && path === '/rnfp/set') {
        const body = await readJson(req);
        const updated = setRnfp(body.peerId, body.rnfp);
        if (!updated) return json(res, 404, { ok: false, error: 'peer_desconocido' });
        return json(res, 200, { ok: true, ...updated });
      }

      json(res, 404, { ok: false, error: 'not_found' });
    } catch (err) {
      json(res, 500, { ok: false, error: String(err?.message || err) });
    }
  });

  /** @type {import('node:net').AddressInfo|null} */
  let addr = null;

  async function listen() {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(port, host, () => {
        server.off('error', reject);
        addr = /** @type {import('node:net').AddressInfo} */ (server.address());
        resolve();
      });
    });
    return { host, port: addr.port, url: `http://${host}:${addr.port}` };
  }

  function close() {
    return new Promise((resolve) => server.close(() => resolve()));
  }

  /**
   * Cliente HTTP fino (mismo proceso o remoto).
   * @param {string} [baseUrl]
   */
  function client(baseUrl) {
    const base = baseUrl || (addr ? `http://${host}:${addr.port}` : null);
    if (!base) throw new Error('mock-control-plane: listen() primero');

    async function req(method, pathName, body) {
      const res = await fetch(`${base}${pathName}`, {
        method,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        body: body ? JSON.stringify(body) : undefined
      });
      const data = await res.json();
      return { status: res.status, data };
    }

    return {
      base,
      startBot: (role, room, peer) =>
        req('POST', '/bots', { role, room, ...(peer ? { peer } : {}) }),
      listPeers: () => req('GET', '/peers'),
      actorRegistry: () => req('GET', '/actor-registry'),
      getActor: (peerId) => req('GET', `/actor-registry/${encodeURIComponent(peerId)}`),
      activateRnfp: (peerId, capability) =>
        req('POST', '/rnfp/activate', { peerId, capability }),
      setRnfp: (peerId, rnfp) => req('POST', '/rnfp/set', { peerId, rnfp })
    };
  }

  return {
    server,
    peers,
    listen,
    close,
    client,
    activateRnfp,
    setRnfp,
    registrySnapshot,
    listPeers
  };
}

export { RNFP, ROLES };

/**
 * Maze/cantera source (delta-specific) backed by linea MCP when real.
 */

import { createFeedMcpClients, callToolJson } from '@zeus/feed-kit';
import { createSyntheticMazeSource } from '@zeus/arg-domain';
import { resolveMcpApprovalToken } from '@zeus/presets-sdk';

function chamberYear(chamber, baseYear = 1874) {
  if (chamber?.ref?.index != null) return Number(chamber.ref.index);
  return baseYear + chamber.col * 12 + chamber.row * 4;
}

/**
 * @param {{
 *   mcpPorts: object,
 *   seed?: number,
 *   logger?: Console,
 *   gamemap?: object,
 *   approvalToken?: string,
 *   host?: string,
 *   clients?: object
 * }} opts
 */
export function createRealMazeSource({
  mcpPorts,
  seed = 1,
  logger = console,
  gamemap = {},
  approvalToken = resolveMcpApprovalToken(),
  host = 'localhost',
  clients: injectedClients = null
}) {
  let clients = injectedClients;
  let ownsClients = false;
  const syntheticFallback = createSyntheticMazeSource({ seed });

  async function ensureClients() {
    if (clients) return clients;
    clients = await createFeedMcpClients(mcpPorts, { host });
    ownsClients = true;
    return clients;
  }

  return {
    kind: 'real',
    /**
     * @param {{ chambers: Record<string,object>, corridors: Record<string,object> }} topology
     */
    async loadMaze(topology) {
      const pack = gamemap?.seeds?.mazePack;
      if (pack?.chamberStates && pack?.corridorStates) {
        return {
          seed,
          chamberRefs: pack.chamberRefs ?? {},
          chamberStates: pack.chamberStates,
          corridorStates: pack.corridorStates
        };
      }

      await ensureClients();
      const chamberRefs = {};
      const chamberStates = {};
      for (const chamber of Object.values(topology.chambers)) {
        const year = chamberYear(chamber);
        chamberRefs[chamber.id] = { kind: 'nodo', uri: `linea://nodo/${year}`, index: year };
        chamberStates[chamber.id] = 'ghost';
        if (clients.espana) {
          try {
            const nodo = await callToolJson(clients.espana, 'get_nodo', { year });
            if (nodo?.nodo?.id) {
              chamberRefs[chamber.id] = { kind: 'nodo', uri: `linea://nodo/${year}`, index: year };
            }
          } catch (err) {
            logger.warn?.(`[arg-feeds] get_nodo ${year}:`, err.message);
          }
        }
      }

      const corridorStates = {};
      for (const corridor of Object.values(topology.corridors)) {
        corridorStates[corridor.id] = 'ghost';
      }
      const rows = Math.max(...Object.values(topology.chambers).map((c) => c.row));
      for (const corridor of Object.values(topology.corridors)) {
        const a = topology.chambers[corridor.a];
        const b = topology.chambers[corridor.b];
        if (a.row === rows && b.row === rows) corridorStates[corridor.id] = 'open';
      }
      for (const chamber of Object.values(topology.chambers)) {
        if (chamber.row === rows) chamberStates[chamber.id] = 'cached';
      }
      return { seed, chamberRefs, chamberStates, corridorStates };
    },

    /**
     * @param {{ id, a, b, chamberA?: object, chamberB?: object }} corridor
     * @param {string} approval
     */
    async excavateCorridor(corridor, approval) {
      if (approval !== approvalToken) {
        throw new Error('aprobacion_requerida');
      }
      await ensureClients();
      if (!clients.wp) throw new Error('mcp_wp_no_disponible');

      const chamber = corridor.chamberB ?? corridor.chamberA;
      const year = chamberYear(chamber);
      const registros = await callToolJson(clients.wp, 'get_registros_for_year', { year });
      const oldid =
        registros?.anchor?.oldid ?? registros?.registros?.[0]?.oldid ?? null;
      if (!oldid) throw new Error('sin_oldid');

      const cache = await callToolJson(clients.wp, 'cache_wikitext', { oldid: Number(oldid) });
      return { ok: true, committed: false, cached: true, oldid: Number(oldid), status: cache.status };
    },

    _synthetic: syntheticFallback,

    async close() {
      if (ownsClients && clients?.close) await clients.close();
    }
  };
}

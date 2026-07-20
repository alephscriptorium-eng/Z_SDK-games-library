/**
 * Proyecta el gamemap del startpack a la forma que consume el dominio ciudad.
 * Sin hardcode de topología: solo transformaciones.
 */

import { SPAWN_NODE_ID } from './contract.mjs';

/**
 * @param {object} gamemap — seeds de @zeus/startpack-ciudad
 * @returns {{
 *   sceneId: string,
 *   displayName: string,
 *   spawnNodeId: string,
 *   nodos: Record<string, object>,
 *   enlaces: Record<string, object>,
 *   anclas: Record<string, object>,
 *   barrios: Record<string, { id: string, estado: string, anchorId: string, parent: string }>
 * }}
 */
export function sceneFromGamemap(gamemap) {
  if (!gamemap?.nodos || !gamemap?.enlaces || !gamemap?.anclas) {
    throw new Error('sceneFromGamemap: gamemap requires nodos/enlaces/anclas');
  }
  /** @type {Record<string, { id: string, estado: string, anchorId: string, parent: string, displayName?: string }>} */
  const barrios = {};
  for (const [anchorId, a] of Object.entries(gamemap.anclas)) {
    const barrioId = a.barrioId || a.slug || anchorId;
    barrios[barrioId] = {
      id: barrioId,
      estado: a.estado || 'latente',
      anchorId,
      parent: a.parent,
      displayName: a.displayName
    };
  }
  const spawnNodeId =
    gamemap.nodos[SPAWN_NODE_ID] != null
      ? SPAWN_NODE_ID
      : Object.keys(gamemap.nodos)[0];

  // Copias superficiales: el dominio muta estado de anclas en wake sin tocar seeds.
  const anclas = Object.fromEntries(
    Object.entries(gamemap.anclas).map(([id, a]) => [id, { ...a }])
  );
  return {
    sceneId: String(gamemap.sceneId || gamemap.id),
    displayName: String(gamemap.displayName || gamemap.id),
    spawnNodeId,
    nodos: gamemap.nodos,
    enlaces: gamemap.enlaces,
    anclas,
    barrios
  };
}

/**
 * ¿Hay camino de nodos entre `from` y `to` por enlaces (bidireccionales)?
 * Sin pathfinding animado: solo reachability (MVP).
 * @param {Record<string, { from: string, to: string, bidirectional?: boolean }>} enlaces
 * @param {string} from
 * @param {string} to
 */
export function nodesReachable(enlaces, from, to) {
  if (from === to) return true;
  if (!from || !to) return false;
  /** @type {Map<string, Set<string>>} */
  const adj = new Map();
  const add = (a, b) => {
    if (!adj.has(a)) adj.set(a, new Set());
    adj.get(a).add(b);
  };
  for (const link of Object.values(enlaces || {})) {
    if (!link?.from || !link?.to) continue;
    add(link.from, link.to);
    if (link.bidirectional !== false) add(link.to, link.from);
  }
  const seen = new Set([from]);
  const queue = [from];
  while (queue.length) {
    const cur = queue.shift();
    if (cur === to) return true;
    for (const next of adj.get(cur) || []) {
      if (seen.has(next)) continue;
      seen.add(next);
      queue.push(next);
    }
  }
  return false;
}

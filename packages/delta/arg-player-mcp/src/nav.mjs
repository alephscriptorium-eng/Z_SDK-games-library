/**
 * Navegación pura para player_goto: BFS sobre el nav-graph de delta-v0.
 *
 * Cruzabilidad = las MISMAS reglas del reducer (G-ARG.4, sin duplicar
 * heurísticas): pasillos de cantera solo si su corredor está `open`;
 * enlaces de agua solo si el cloak-mod del actor permite nadar.
 * Sin motores: solo lee la topología estática y estados proyectados.
 */

import { cloakModFor } from '@zeus/arg-domain';

/**
 * ¿Se puede cruzar este enlace con este cloak y estos pasillos?
 * @param {object} link — enlace del nav-graph (medium, corridorId?)
 * @param {{ corridors?: Record<string, {state:string}>, swimAllowed?: boolean }} ctx
 */
export function isLinkCrossable(link, { corridors = {}, swimAllowed = true } = {}) {
  if (link.corridorId && corridors[link.corridorId]?.state !== 'open') return false;
  if (link.medium === 'agua' && !swimAllowed) return false;
  return true;
}

/**
 * BFS de camino mínimo (en saltos) entre dos nodos del nav-graph.
 *
 * @param {{ nodos: Record<string,object>, enlaces: Record<string,object> }} nav
 * @param {string} fromNodeId
 * @param {string} toNodeId
 * @param {{ corridors?: Record<string,{state:string}>, cloakPresetId?: string|null }} [options]
 * @returns {string[]|null} lista de nodeIds a visitar (sin el origen), o null si no hay ruta
 */
export function findPath(nav, fromNodeId, toNodeId, options = {}) {
  const { corridors = {}, cloakPresetId = null } = options;
  if (!nav.nodos[fromNodeId] || !nav.nodos[toNodeId]) return null;
  if (fromNodeId === toNodeId) return [];

  const swimAllowed = cloakModFor(cloakPresetId).swimAllowed;
  const ctx = { corridors, swimAllowed };

  // Adyacencia bidireccional (el reducer resuelve enlaces en ambos sentidos).
  const adjacency = new Map();
  const addEdge = (a, b) => {
    if (!adjacency.has(a)) adjacency.set(a, []);
    adjacency.get(a).push(b);
  };
  for (const link of Object.values(nav.enlaces)) {
    if (!isLinkCrossable(link, ctx)) continue;
    addEdge(link.from, link.to);
    addEdge(link.to, link.from);
  }

  const previous = new Map([[fromNodeId, null]]);
  const queue = [fromNodeId];
  while (queue.length > 0) {
    const nodeId = queue.shift();
    if (nodeId === toNodeId) break;
    for (const next of adjacency.get(nodeId) ?? []) {
      if (previous.has(next)) continue;
      previous.set(next, nodeId);
      queue.push(next);
    }
  }
  if (!previous.has(toNodeId)) return null;

  const path = [];
  for (let node = toNodeId; node !== fromNodeId; node = previous.get(node)) {
    path.unshift(node);
  }
  return path;
}

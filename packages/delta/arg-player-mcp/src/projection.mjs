/**
 * Proyección pura del último arg:state a:
 *  - una vista compatible con reduceArgIntent (dry-run explicativo: cuando la
 *    autoridad rechaza en silencio, re-reducimos localmente el intent contra
 *    el estado proyectado y devolvemos la regla probable — G-ARG.4 garantiza
 *    que la reducción es pura, aquí JAMÁS se aplican ops),
 *  - y extractos de evidencia compactos para las respuestas de los tools.
 *
 * Sin motores (G-ARG.1): solo escena estática + snapshots de la room.
 */

import {
  deltaV0,
  buildCanteraTopology,
  buildNavGraph,
  reduceArgIntent,
  LABEL_WINDOW,
  seaLayout
} from '@zeus/arg-domain';

const TOPOLOGY = buildCanteraTopology(deltaV0.cantera);
const NAV = buildNavGraph(deltaV0, TOPOLOGY);

/** Nav-graph completo de delta-v0 (nodos+cámaras, enlaces+pasillos). */
export function staticNav() {
  return NAV;
}

/** Topología estática de la cantera (cámaras/pasillos sin estado). */
export function staticTopology() {
  return TOPOLOGY;
}

/**
 * Pasillos con estado: el último maze completo recibido, o la topología
 * estática como `ghost` si aún no llegó ninguno (heartbeat lo trae cada 1 s).
 * @param {{ corridors?: Record<string,object> }|null} maze
 */
export function corridorsFrom(maze) {
  if (maze?.corridors) return maze.corridors;
  return Object.fromEntries(
    Object.entries(TOPOLOGY.corridors).map(([id, c]) => [id, { ...c, state: 'ghost' }])
  );
}

/**
 * Vista de solo lectura con la forma que espera reduceArgIntent.
 * @param {object|null} state — último arg:state
 * @param {object|null} maze — último snapshot completo de maze (rev+chambers+corridors)
 */
export function buildReducerView(state, maze) {
  const actors = state?.actors ?? {};
  const taps = state?.taps ?? {};
  const seaDroplets = () => {
    const tuples = state?.sea?.droplets ?? [];
    return tuples.map(([id, label, uri, seq]) => ({
      id,
      label: label ?? null,
      state: label ? 'floating' : 'sunken',
      seq: seq ?? 0,
      ref: uri ? { uri } : null
    }));
  };
  return {
    scene: deltaV0,
    nav: NAV,
    actors,
    taps,
    sea: state?.sea ?? null,
    corridors: corridorsFrom(maze),
    contacts: state?.contacts ?? {},
    dropletUnder(riverId, progress) {
      const droplets = state?.rivers?.[riverId]?.droplets ?? [];
      let best = null;
      let bestDist = LABEL_WINDOW;
      for (const [id, prog, dropletState, label, uri] of droplets) {
        const dist = Math.abs(prog - progress);
        if (dist <= bestDist) {
          best = { id, progress: prog, state: dropletState, label: label ?? null, ref: uri ? { uri } : null };
          bestDist = dist;
        }
      }
      return best;
    },
    seaDroplets,
    seaDropletById(id) {
      return seaDroplets().find((d) => d.id === id) ?? null;
    },
    positionOf(subjectId) {
      const actor = actors[subjectId];
      if (actor?.position) return actor.position;
      const tap = deltaV0.taps[subjectId];
      if (tap) return NAV.nodos[tap.summitNodeId]?.position ?? null;
      return null;
    }
  };
}

/**
 * Dry-run explicativo: ¿qué diría el reducer de este intent contra el estado
 * proyectado? Devuelve { ok, error } — las ops se descartan siempre.
 * @param {object|null} state
 * @param {object|null} maze
 * @param {object} intent — arg:intent bien formado (makeIntent)
 */
export function explainIntent(state, maze, intent) {
  const result = reduceArgIntent(buildReducerView(state, maze), intent);
  return { ok: result.ok, error: result.error ?? null };
}

/** Actor compacto del snapshot (o null). */
export function compactActor(state, actorId) {
  return state?.actors?.[actorId] ?? null;
}

/** Contactos del snapshot en los que participa el actor. */
export function contactsOf(state, actorId) {
  const contacts = state?.contacts ?? {};
  return Object.fromEntries(
    Object.entries(contacts).filter(([, c]) => c.a === actorId || c.b === actorId)
  );
}

/**
 * Resumen compacto para player_state / arg://player/state:
 * MI actor + grifos, mar y objetivo resumidos.
 */
export function summarizeState(state, actorId) {
  if (!state) return { conectado: false, actor: null };
  const actor = compactActor(state, actorId);
  const rivers = Object.fromEntries(
    Object.entries(state.rivers ?? {}).map(([id, r]) => [id, { gotasEnVuelo: r.droplets?.length ?? 0 }])
  );
  return {
    conectado: true,
    ts: state.ts,
    tick: state.tick,
    sceneId: state.sceneId,
    gamemapId: state.gamemapId,
    actor,
    contactos: contactsOf(state, actorId),
    grifos: state.taps ?? {},
    rios: rivers,
    mar: state.sea ?? null,
    objetivo: state.objetivo ?? null,
    mazeRev: state.maze?.rev ?? null
  };
}

/** Proyección del mar con clusters (player_observe what:'sea'). */
export function projectSea(state) {
  const sea = state?.sea ?? {};
  const tuples = sea.droplets ?? [];
  const droplets = tuples.map(([id, label, uri, seq]) => ({
    dropletId: id,
    label: label ?? null,
    uri: uri ?? null,
    seq,
    state: label ? 'floating' : 'sunken'
  }));
  const layout = seaLayout(tuples, deltaV0.mar);
  return {
    crystals: sea.crystals ?? 0,
    murk: sea.murk ?? 0,
    murkCapacity: sea.murkCapacity ?? deltaV0.mar.murkCapacity,
    collapsed: sea.collapsed ?? false,
    clusters: layout.clusters,
    droplets,
    positions: layout.positions
  };
}

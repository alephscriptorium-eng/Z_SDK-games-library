/**
 * Feeds sintéticos deterministas (contrato §4): misma seed ⇒ mismas gotas y
 * mismo laberinto. Stream sintético vive en @zeus/feed-kit; maze es delta.
 */

import { createSyntheticStreamFeed, createRng } from '@zeus/feed-kit/synthetic';

export { createRng, createSyntheticStreamFeed as createSyntheticFirehoseFeed };

/**
 * Cantera sintética: refs tipo linea (años) y un "start pack" fijo — la fila
 * de entrada abierta y el resto en fantasma, listo para excavar.
 */
export function createSyntheticMazeSource({ seed = 1, baseYear = 1874 } = {}) {
  return {
    kind: 'synthetic',
    /**
     * @param {{chambers:Record<string,object>, corridors:Record<string,object>}} topology
     */
    loadMaze(topology) {
      const chamberRefs = {};
      const chamberStates = {};
      for (const chamber of Object.values(topology.chambers)) {
        const year = baseYear + chamber.col * 12 + chamber.row * 4;
        chamberRefs[chamber.id] = { kind: 'nodo', uri: `linea://nodo/${year}`, index: year };
        chamberStates[chamber.id] = 'ghost';
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
    excavateCorridor(_corridor, _approval) {
      return Promise.resolve({ ok: true, committed: false, mode: 'synthetic' });
    }
  };
}

/**
 * Resolución de feeds (contrato §4). `real` → autoridad + @zeus/arg-feeds /
 * @zeus/feed-kit. `auto` degrada a sintético con aviso.
 */
export function resolveFeeds({ mode = 'auto', seed = 1, logger = console } = {}) {
  if (mode === 'real') {
    throw new Error(
      'feeds real: usar resolveRuntimeFeeds de arg-feeds en la autoridad. Usa mode "auto" o "synthetic" en arg-domain.'
    );
  }
  if (mode === 'auto') {
    logger.warn?.('[arg-domain] feeds auto → sintético (feeds reales llegan con arg-feeds / feed-kit)');
  }
  return {
    mode: 'synthetic',
    firehose: createSyntheticStreamFeed({ seed }),
    mazeSource: createSyntheticMazeSource({ seed })
  };
}

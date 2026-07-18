/**
 * Maze-engine: la Cantera. Cámaras (conceptos estables) y pasillos
 * (hipervínculos) con ciclo ghost → digging → open. Excavar es la única
 * mutación; en modo real la resuelve el feed (viaje de cache, WP-14),
 * en sintético un temporizador de excavación.
 */

export function createMazeEngine(topology, seedData, { digSeconds = 2.5 } = {}) {
  const chambers = {};
  for (const [id, chamber] of Object.entries(topology.chambers)) {
    chambers[id] = {
      ...chamber,
      ref: seedData.chamberRefs[id],
      state: seedData.chamberStates[id] ?? 'ghost'
    };
  }

  const corridors = {};
  for (const [id, corridor] of Object.entries(topology.corridors)) {
    corridors[id] = {
      ...corridor,
      state: seedData.corridorStates[id] ?? 'ghost',
      digRemainingSec: 0
    };
  }

  let rev = 1;
  const events = [];

  function pushEvent(kind, payload) {
    events.push({ kind, ts: Date.now(), ...payload });
  }

  function completeDigInternal(corridorIdArg) {
    const corridor = corridors[corridorIdArg];
    if (!corridor) return { ok: false, error: 'pasillo_invalido' };
    if (corridor.state === 'open') return { ok: true };
    if (corridor.state !== 'digging') return { ok: false, error: 'no_excavando' };
    corridor.state = 'open';
    corridor.digRemainingSec = 0;
    corridor.externalDig = false;
    for (const chamberIdArg of [corridor.a, corridor.b]) {
      if (chambers[chamberIdArg].state === 'ghost') chambers[chamberIdArg].state = 'cached';
    }
    rev += 1;
    pushEvent('excavate', {
      corridorId: corridor.id,
      actorId: corridor.digBy ?? null,
      ref: chambers[corridor.b].ref
    });
    return { ok: true };
  }

  return {
    chambers,
    corridors,
    get rev() {
      return rev;
    },

    isCorridorOpen: (id) => corridors[id]?.state === 'open',
    chamber: (id) => chambers[id] ?? null,

    excavate(corridorIdArg, actorId = null, { external = false } = {}) {
      const corridor = corridors[corridorIdArg];
      if (!corridor) return { ok: false, error: 'pasillo_invalido' };
      if (corridor.state === 'open') return { ok: false, error: 'ya_abierto' };
      if (corridor.state === 'digging') return { ok: false, error: 'ya_excavando' };
      corridor.state = 'digging';
      corridor.externalDig = external;
      corridor.digRemainingSec = external ? 0 : digSeconds;
      corridor.digBy = actorId;
      rev += 1;
      pushEvent('excavate:start', { corridorId: corridor.id, actorId });
      return { ok: true };
    },

    completeDig(corridorIdArg) {
      return completeDigInternal(corridorIdArg);
    },

    failDig(corridorIdArg, reason = 'excavate_failed') {
      const corridor = corridors[corridorIdArg];
      if (!corridor) return { ok: false, error: 'pasillo_invalido' };
      if (corridor.state !== 'digging') return { ok: false, error: 'no_excavando' };
      corridor.state = 'ghost';
      corridor.digRemainingSec = 0;
      corridor.externalDig = false;
      corridor.digBy = null;
      rev += 1;
      pushEvent('excavate:error', { corridorId: corridor.id, reason });
      return { ok: true };
    },

    tick(dt) {
      for (const corridor of Object.values(corridors)) {
        if (corridor.state !== 'digging' || corridor.externalDig) continue;
        corridor.digRemainingSec -= dt;
        if (corridor.digRemainingSec > 0) continue;
        completeDigInternal(corridor.id);
      }
    },

    /** Full si se pide (o para late joiners); si no, solo rev (G-ARG.5). */
    snapshot(full = false) {
      if (!full) return { rev };
      return {
        rev,
        chambers: Object.fromEntries(
          Object.entries(chambers).map(([id, c]) => [
            id,
            { ref: c.ref, state: c.state, position: c.position }
          ])
        ),
        corridors: Object.fromEntries(
          Object.entries(corridors).map(([id, c]) => [id, { a: c.a, b: c.b, state: c.state }])
        )
      };
    },

    drainEvents() {
      const out = [...events];
      events.length = 0;
      return out;
    }
  };
}

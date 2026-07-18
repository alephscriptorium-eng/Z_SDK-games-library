/**
 * line-board — tablero de líneas del manipulador (rol dj).
 * Dominio puro: cache → curate → milestone sobre registros de una línea.
 * Sin fs ni red; la autoridad aplica side-effects de volumen en el borde.
 *
 * Snapshot compacto (presupuesto G-ARG.5): arrays
 *   regs: [[lineId, registroId, cached, statusCode, milestone], ...]
 * statusCode: 0 pending | 1 draft | 2 curated
 */

export const DELTA_STATUSES = Object.freeze(['pending', 'draft', 'curated']);
const STATUS_CODE = Object.freeze(
  Object.fromEntries(DELTA_STATUSES.map((s, i) => [s, i]))
);

/**
 * Validación pura de transición curate (pending→draft→curated, un paso).
 * Fuente única de reglas/codes para gate (reducer) y mutador (line-board).
 *
 * @param {{ cached: boolean, deltaStatus: string }} reg
 * @param {string|null|undefined} toStatus
 * @returns {{ ok: true, to: string } | { ok: false, error: string }}
 */
export function validateCurate(reg, toStatus) {
  if (!reg.cached) return { ok: false, error: 'no_cacheado' };
  const currentIdx = DELTA_STATUSES.indexOf(reg.deltaStatus);
  const to =
    toStatus ?? DELTA_STATUSES[Math.min(currentIdx + 1, DELTA_STATUSES.length - 1)];
  if (to !== 'draft' && to !== 'curated') return { ok: false, error: 'status_invalido' };
  const targetIdx = DELTA_STATUSES.indexOf(to);
  if (targetIdx <= currentIdx) {
    return { ok: false, error: currentIdx === targetIdx ? 'ya_curado' : 'status_retroceso' };
  }
  if (targetIdx > currentIdx + 1) return { ok: false, error: 'status_salto' };
  return { ok: true, to };
}

/** Semilla mínima de demo (homóloga a registros de línea-aleph). */
export const DEFAULT_LINE_SEED = Object.freeze({
  'linea-aleph': Object.freeze({
    id: 'linea-aleph',
    registros: Object.freeze({
      P03: Object.freeze({
        id: 'P03',
        oldid: 1882,
        cached: false,
        deltaStatus: 'pending',
        milestone: null
      }),
      P04: Object.freeze({
        id: 'P04',
        oldid: 1898,
        cached: false,
        deltaStatus: 'pending',
        milestone: null
      })
    })
  })
});

function cloneSeed(seed) {
  const lines = {};
  for (const [lineId, line] of Object.entries(seed)) {
    const registros = {};
    for (const [regId, reg] of Object.entries(line.registros)) {
      registros[regId] = {
        id: reg.id,
        oldid: reg.oldid ?? null,
        cached: Boolean(reg.cached),
        deltaStatus: DELTA_STATUSES.includes(reg.deltaStatus) ? reg.deltaStatus : 'pending',
        milestone: reg.milestone
          ? { reasons: Object.freeze([...(reg.milestone.reasons ?? [])]) }
          : null
      };
    }
    lines[lineId] = { id: line.id ?? lineId, registros };
  }
  return lines;
}

/**
 * @param {typeof DEFAULT_LINE_SEED} [seed]
 */
export function createLineBoard(seed = DEFAULT_LINE_SEED) {
  const lines = cloneSeed(seed);
  let rev = 0;
  const events = [];

  function pushEvent(kind, detail) {
    events.push({ kind, ...detail });
  }

  function getRegistro(lineId, registroId) {
    const line = lines[lineId];
    if (!line) return { error: 'linea_invalida' };
    const reg = line.registros[registroId];
    if (!reg) return { error: 'registro_invalido' };
    return { line, reg };
  }

  return {
    get lines() {
      return lines;
    },
    get rev() {
      return rev;
    },

    registro(lineId, registroId) {
      return lines[lineId]?.registros[registroId] ?? null;
    },

    cache(lineId, registroId, actorId = null) {
      const found = getRegistro(lineId, registroId);
      if (found.error) return { ok: false, error: found.error };
      const { reg } = found;
      if (reg.cached) return { ok: false, error: 'ya_cacheado' };
      reg.cached = true;
      rev += 1;
      pushEvent('cache', {
        actorId,
        lineId,
        registroId,
        ref: { kind: 'oldid', uri: `linea://registro/${lineId}/${registroId}/${reg.oldid ?? 0}` }
      });
      return { ok: true };
    },

    curate(lineId, registroId, toStatus, actorId = null) {
      const found = getRegistro(lineId, registroId);
      if (found.error) return { ok: false, error: found.error };
      const { reg } = found;
      const check = validateCurate(reg, toStatus);
      if (!check.ok) return check;
      reg.deltaStatus = check.to;
      rev += 1;
      pushEvent('curate', {
        actorId,
        lineId,
        registroId,
        status: check.to,
        ref: { kind: 'registro', uri: `linea://registro/${lineId}/${registroId}/${reg.oldid ?? 0}` }
      });
      return { ok: true, status: check.to };
    },

    milestone(lineId, registroId, reasons = [], actorId = null) {
      const found = getRegistro(lineId, registroId);
      if (found.error) return { ok: false, error: found.error };
      const { reg } = found;
      if (!reg.cached) return { ok: false, error: 'no_cacheado' };
      if (reg.deltaStatus !== 'curated') return { ok: false, error: 'no_curado' };
      if (reg.milestone) return { ok: false, error: 'ya_milestone' };
      const list = Array.isArray(reasons)
        ? reasons.filter((r) => typeof r === 'string' && r)
        : [];
      reg.milestone = { reasons: Object.freeze([...list]) };
      rev += 1;
      pushEvent('milestone', {
        actorId,
        lineId,
        registroId,
        reasons: [...list],
        ref: { kind: 'registro', uri: `linea://registro/${lineId}/${registroId}/${reg.oldid ?? 0}` }
      });
      return { ok: true };
    },

    drainEvents() {
      const out = events.splice(0, events.length);
      return out;
    },

    /** Snapshot compacto para arg:state (arrays, no objetos anidados profundos). */
    snapshot() {
      const regs = [];
      for (const [lineId, line] of Object.entries(lines)) {
        for (const [registroId, reg] of Object.entries(line.registros)) {
          regs.push([
            lineId,
            registroId,
            reg.cached ? 1 : 0,
            STATUS_CODE[reg.deltaStatus] ?? 0,
            reg.milestone ? 1 : 0
          ]);
        }
      }
      return { rev, regs };
    }
  };
}

export function decodeLineStatus(code) {
  return DELTA_STATUSES[code] ?? 'pending';
}

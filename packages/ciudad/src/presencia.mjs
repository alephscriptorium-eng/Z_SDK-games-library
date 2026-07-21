/**
 * ciudad — señal de presencia (contrato v1 + adapter mock).
 * Fuentes reales (health / paradas / zona) = solo interfaz; no leídas aquí.
 *
 * SeñalDePresencia v1:
 *   { barrioId, fuente: 'mock'|'health'|'paradas'|'zona',
 *     agenteId, clase: 'residente'|'visitante'|'flujo', tick }
 * FuentePresencia: { suscribir(cb) → desuscribir() }
 */

export const PRESENCIA_FUENTES = Object.freeze(['mock', 'health', 'paradas', 'zona']);
export const PRESENCIA_CLASES = Object.freeze(['residente', 'visitante', 'flujo']);

/**
 * @typedef {{
 *   barrioId: string,
 *   fuente: 'mock'|'health'|'paradas'|'zona',
 *   agenteId: string,
 *   clase: 'residente'|'visitante'|'flujo',
 *   tick: number
 * }} SeñalDePresencia
 */

/**
 * @param {unknown} raw
 * @returns {{ ok: true, señal: SeñalDePresencia } | { ok: false, error: string }}
 */
export function validateSeñalDePresencia(raw) {
  if (!raw || typeof raw !== 'object') {
    return { ok: false, error: 'señal_requerida' };
  }
  const s = /** @type {Record<string, unknown>} */ (raw);
  if (typeof s.barrioId !== 'string' || !s.barrioId.trim()) {
    return { ok: false, error: 'barrioId_requerido' };
  }
  if (!PRESENCIA_FUENTES.includes(/** @type {string} */ (s.fuente))) {
    return { ok: false, error: 'fuente_invalida' };
  }
  if (typeof s.agenteId !== 'string' || !s.agenteId.trim()) {
    return { ok: false, error: 'agenteId_requerido' };
  }
  if (!PRESENCIA_CLASES.includes(/** @type {string} */ (s.clase))) {
    return { ok: false, error: 'clase_invalida' };
  }
  if (typeof s.tick !== 'number' || !Number.isFinite(s.tick)) {
    return { ok: false, error: 'tick_requerido' };
  }
  return {
    ok: true,
    señal: {
      barrioId: s.barrioId.trim(),
      fuente: /** @type {SeñalDePresencia['fuente']} */ (s.fuente),
      agenteId: s.agenteId.trim(),
      clase: /** @type {SeñalDePresencia['clase']} */ (s.clase),
      tick: s.tick
    }
  };
}

/**
 * Fábrica de SeñalDePresencia v1 (defaults mock).
 * @param {Partial<SeñalDePresencia> & { barrioId: string, agenteId: string }} partial
 * @returns {SeñalDePresencia}
 */
export function makeSeñalDePresencia(partial) {
  const señal = {
    barrioId: partial.barrioId,
    fuente: partial.fuente ?? 'mock',
    agenteId: partial.agenteId,
    clase: partial.clase ?? 'visitante',
    tick: typeof partial.tick === 'number' ? partial.tick : 0
  };
  const gate = validateSeñalDePresencia(señal);
  if (!gate.ok) throw new Error(`makeSeñalDePresencia: ${gate.error}`);
  return gate.señal;
}

/**
 * @typedef {{ suscribir: (cb: (señal: SeñalDePresencia) => void) => () => void }} FuentePresencia
 */

/**
 * Adapter mock: emite presencia desde el pack de datos (o emit manual).
 * No lee health/paradas/zona reales.
 *
 * @param {{
 *   barrioId?: string,
 *   agenteId?: string,
 *   clase?: SeñalDePresencia['clase'],
 *   autoTick?: boolean
 * }} [opts]
 * @returns {FuentePresencia & {
 *   emit: (partial?: Partial<SeñalDePresencia>) => SeñalDePresencia,
 *   close: () => void
 * }}
 */
export function createMockFuentePresencia(opts = {}) {
  /** @type {Set<(señal: SeñalDePresencia) => void>} */
  const subs = new Set();
  let closed = false;
  let emitSeq = 0;
  const defaults = {
    barrioId: opts.barrioId ?? 'blockly-editor',
    agenteId: opts.agenteId ?? 'mock-agente',
    clase: opts.clase ?? 'visitante'
  };

  /** @type {FuentePresencia & { emit: Function, close: Function }} */
  const fuente = {
    suscribir(cb) {
      if (typeof cb !== 'function') throw new Error('suscribir: cb requerido');
      if (closed) throw new Error('fuente_cerrada');
      subs.add(cb);
      return () => {
        subs.delete(cb);
      };
    },

    /**
     * Emite una señal mock a todos los suscriptores.
     * @param {Partial<SeñalDePresencia>} [partial]
     */
    emit(partial = {}) {
      if (closed) throw new Error('fuente_cerrada');
      emitSeq += 1;
      const señal = makeSeñalDePresencia({
        barrioId: partial.barrioId ?? defaults.barrioId,
        fuente: partial.fuente ?? 'mock',
        agenteId: partial.agenteId ?? defaults.agenteId,
        clase: partial.clase ?? defaults.clase,
        tick: typeof partial.tick === 'number' ? partial.tick : emitSeq
      });
      for (const cb of subs) cb(señal);
      return señal;
    },

    close() {
      closed = true;
      subs.clear();
    }
  };
  return fuente;
}

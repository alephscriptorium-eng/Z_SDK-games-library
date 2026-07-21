/**
 * ciudad — ActaDeBarrio v1 (contrato §A3) + helpers de plaza local.
 * Shape alineado a `@zeus/acta-kit` (kit canónico en zeus); aquí vive el
 * enganche al reducer sin dep npm unpublished.
 *
 * ActaDeBarrio v1:
 *   { version:'acta/1', barrioId, estado, resumen, // ≤400
 *     pendientes, ultimaClase, tickEmision, huellaLedger }
 */

import { createHash } from 'node:crypto';

export const ACTA_VERSION = 'acta/1';
export const RESUMEN_MAX = 400;
export const LEDGER_ACTA = 'acta';

export const ACTA_ESTADOS = Object.freeze(['vivo', 'latente', 'muerto', 'roto']);
export const ACTA_CLASES = Object.freeze(['residente', 'visitante', 'flujo']);

/**
 * @typedef {{
 *   version: 'acta/1',
 *   barrioId: string,
 *   estado: 'vivo'|'latente'|'muerto'|'roto',
 *   resumen: string,
 *   pendientes: string[],
 *   ultimaClase: 'residente'|'visitante'|'flujo',
 *   tickEmision: number,
 *   huellaLedger: string
 * }} ActaDeBarrio
 */

/**
 * @param {unknown} evento
 * @returns {string}
 */
export function huellaLedger(evento) {
  const blob = typeof evento === 'string' ? evento : JSON.stringify(evento ?? null);
  return createHash('sha256').update(blob, 'utf8').digest('hex');
}

/**
 * @param {unknown} value
 * @returns {value is ActaDeBarrio}
 */
export function isActaDeBarrioShaped(value) {
  if (value == null || typeof value !== 'object') return false;
  const a = /** @type {Record<string, unknown>} */ (value);
  if (a.version !== ACTA_VERSION) return false;
  if (typeof a.barrioId !== 'string' || !a.barrioId) return false;
  if (!ACTA_ESTADOS.includes(/** @type {string} */ (a.estado))) return false;
  if (typeof a.resumen !== 'string' || a.resumen.length > RESUMEN_MAX) return false;
  if (!Array.isArray(a.pendientes)) return false;
  for (const p of a.pendientes) {
    if (typeof p !== 'string') return false;
  }
  if (!ACTA_CLASES.includes(/** @type {string} */ (a.ultimaClase))) return false;
  if (!Number.isInteger(a.tickEmision)) return false;
  if (typeof a.huellaLedger !== 'string' || !a.huellaLedger) return false;
  return true;
}

/**
 * Emisión pura (tick/huella como input).
 * @param {Omit<ActaDeBarrio, 'version'>} input
 * @returns {ActaDeBarrio}
 */
export function emitirActa(input) {
  const acta = {
    version: ACTA_VERSION,
    barrioId: String(input.barrioId ?? '').trim(),
    estado: input.estado,
    resumen: input.resumen,
    pendientes: Array.isArray(input.pendientes) ? [...input.pendientes] : [],
    ultimaClase: input.ultimaClase,
    tickEmision: input.tickEmision,
    huellaLedger: input.huellaLedger
  };
  if (!isActaDeBarrioShaped(acta)) {
    throw new Error('emitirActa: shape_invalido');
  }
  return acta;
}

/**
 * @param {unknown} entry — ledger domain `{ kind:'acta', detail:{acta} }` o plaza payload
 * @returns {ActaDeBarrio|null}
 */
export function actaDesdeEntry(entry) {
  if (entry == null || typeof entry !== 'object') return null;
  const e = /** @type {Record<string, unknown>} */ (entry);
  const payload =
    e.payload != null && typeof e.payload === 'object'
      ? /** @type {Record<string, unknown>} */ (e.payload)
      : null;
  const kind = (payload && payload.entryKind) || e.entryKind || e.kind;
  if (kind !== LEDGER_ACTA) return null;
  const detailRaw = (payload && payload.detail) || e.detail;
  const detail =
    detailRaw != null && typeof detailRaw === 'object'
      ? /** @type {Record<string, unknown>} */ (detailRaw)
      : null;
  const acta = detail?.acta ?? null;
  return isActaDeBarrioShaped(acta) ? acta : null;
}

/**
 * @param {unknown[]} entries
 * @param {string} barrioId
 * @returns {{ ok: true, acta: ActaDeBarrio|null } | { ok: false, error: string }}
 */
export function adoptarActaDesdePlaza(entries, barrioId) {
  if (typeof barrioId !== 'string' || !barrioId.trim()) {
    return { ok: false, error: 'barrioId_requerido' };
  }
  if (!Array.isArray(entries)) {
    return { ok: false, error: 'entries_requeridas' };
  }
  const id = barrioId.trim();
  /** @type {ActaDeBarrio|null} */
  let last = null;
  for (const entry of entries) {
    const acta = actaDesdeEntry(entry);
    if (!acta || acta.barrioId !== id) continue;
    last = acta;
  }
  return { ok: true, acta: last };
}

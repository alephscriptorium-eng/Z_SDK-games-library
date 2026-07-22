/**
 * ciudad — salud real ↔ mapa (SEMILLA §2).
 * Probes read-only/idempotentes: npm-view · http-status · smoke.
 * El dominio permanece puro: este módulo orquesta I/O y propone estado.
 *
 * Shape exportado para ACL (capa ownership / capability — fuera de aquí):
 *   SALUD_SHAPE_FOR_ACL · acciones default vs capabilityRequired.
 * Mapping edificio↔paquete = `@zeus/ciudad/edificios` (consume este shape).
 * Aquí solo bindings de probe (paquete npm / URL status / script smoke).
 */

import { spawn } from 'node:child_process';
import { BARRIO_ESTADOS } from './contract.mjs';

export const SALUD_VERSION = 'salud/1';

/** Kinds de probe admitidos (juego = dashboard; todos idempotentes). */
export const PROBE_KINDS = Object.freeze(['npm-view', 'http-status', 'smoke']);

/**
 * Acciones que el juego NO ejecuta por defecto.
 * Requieren capability explícita (ACL direccional / ownership).
 * C02 consume esta lista; no se implementa el gate aquí.
 */
export const CAPABILITY_REQUIRED = Object.freeze([
  'maq.launch',
  'maq.stop',
  'maq.restart',
  'npm.publish',
  'git.force-push',
  'acl.write',
  'process.kill'
]);

/** Acciones de wake / sync permitidas sin capability. */
export const WAKE_DEFAULT_ACTIONS = Object.freeze([...PROBE_KINDS]);

/**
 * Contrato estable para integración ACL / ownership.
 * El engine anota el límite; este pack solo declara la frontera.
 */
export const SALUD_SHAPE_FOR_ACL = Object.freeze({
  version: SALUD_VERSION,
  wakeDefaultActions: WAKE_DEFAULT_ACTIONS,
  capabilityRequired: CAPABILITY_REQUIRED,
  /**
   * Resultado de probe (payload observable).
   * @typedef {{
   *   barrioId: string,
   *   kind: 'npm-view'|'http-status'|'smoke',
   *   ok: boolean,
   *   detail: Record<string, unknown>,
   *   checkedAt: number,
   *   estadoSugerido: 'vivo'|'latente'|'muerto'|'roto'
   * }} ProbeResult
   */
  probeResultKeys: Object.freeze([
    'barrioId',
    'kind',
    'ok',
    'detail',
    'checkedAt',
    'estadoSugerido'
  ])
});

export const DEFAULT_NPM_REGISTRY = 'https://npm.scriptorium.escrivivir.co';

/**
 * @typedef {{
 *   barrioId: string,
 *   kind: 'npm-view'|'http-status'|'smoke',
 *   packageName?: string,
 *   registry?: string,
 *   url?: string,
 *   smokeCommand?: string,
 *   smokeArgs?: string[],
 *   label?: string
 * }} SaludBinding
 */

/**
 * @typedef {{
 *   barrioId: string,
 *   kind: string,
 *   ok: boolean,
 *   detail: Record<string, unknown>,
 *   checkedAt: number,
 *   estadoSugerido: string
 * }} ProbeResult
 */

/**
 * Bindings mínimos de probe (no catálogo §A4).
 * `mcp-gallery` → `@zeus/protocol` vía npm view (canal real; barrio existente).
 * Otros barrios con puerto en arbol → http-status cuando hay URL.
 *
 * @param {object} [arbol] gamemap.arbol opcional
 * @param {SaludBinding[]} [extra]
 * @returns {Record<string, SaludBinding>}
 */
export function bindingsSalud(arbol = null, extra = []) {
  /** @type {Record<string, SaludBinding>} */
  const out = {
    'mcp-gallery': {
      barrioId: 'mcp-gallery',
      kind: 'npm-view',
      packageName: '@zeus/protocol',
      registry: DEFAULT_NPM_REGISTRY,
      label: 'registry @zeus/protocol'
    }
  };

  const barrios = arbol?.barrios;
  if (barrios && typeof barrios === 'object') {
    for (const [barrioId, b] of Object.entries(barrios)) {
      if (out[barrioId]) continue;
      const maqs = b?.maquinarias;
      if (!maqs || typeof maqs !== 'object') continue;
      for (const m of Object.values(maqs)) {
        if (m == null || typeof m !== 'object') continue;
        const puerto = m.puerto;
        const healthPath =
          typeof m.health === 'string' && m.health.startsWith('/')
            ? m.health
            : '/health';
        if (typeof puerto === 'number' && puerto > 0) {
          out[barrioId] = {
            barrioId,
            kind: 'http-status',
            url: `http://127.0.0.1:${puerto}${healthPath}`,
            label: `status :${puerto}${healthPath}`
          };
          break;
        }
      }
    }
  }

  for (const b of extra) {
    if (b?.barrioId && PROBE_KINDS.includes(b.kind)) {
      out[b.barrioId] = { ...b };
    }
  }
  return out;
}

/**
 * @param {SaludBinding} binding
 * @returns {{ ok: true } | { ok: false, error: string }}
 */
export function validateBinding(binding) {
  if (!binding || typeof binding !== 'object') {
    return { ok: false, error: 'binding_requerido' };
  }
  if (typeof binding.barrioId !== 'string' || !binding.barrioId.trim()) {
    return { ok: false, error: 'barrioId_requerido' };
  }
  if (!PROBE_KINDS.includes(binding.kind)) {
    return { ok: false, error: 'kind_invalido' };
  }
  if (binding.kind === 'npm-view' && typeof binding.packageName !== 'string') {
    return { ok: false, error: 'packageName_requerido' };
  }
  if (binding.kind === 'http-status' && typeof binding.url !== 'string') {
    return { ok: false, error: 'url_requerida' };
  }
  if (binding.kind === 'smoke' && typeof binding.smokeCommand !== 'string') {
    return { ok: false, error: 'smokeCommand_requerido' };
  }
  return { ok: true };
}

/**
 * Mapea resultado de probe → estado de barrio (§2).
 * @param {{ ok: boolean, detail?: Record<string, unknown> }} probe
 */
export function estadoDesdeProbe(probe) {
  if (probe?.ok === true) return 'vivo';
  const code = probe?.detail?.code;
  if (code === 'E404' || code === 'not_found') return 'muerto';
  if (code === 'ECONNREFUSED' || code === 'unreachable' || code === 'ETIMEDOUT') {
    return 'latente';
  }
  return 'roto';
}

/**
 * @param {object} opts
 * @param {string} opts.command
 * @param {string[]} [opts.args]
 * @param {number} [opts.timeoutMs]
 * @param {(cmd: string, args: string[], o: object) => Promise<{code:number, stdout:string, stderr:string}>} [opts.exec]
 */
async function runCommand(opts) {
  const { command, args = [], timeoutMs = 20_000, exec } = opts;
  if (typeof exec === 'function') {
    return exec(command, args, { timeoutMs });
  }
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      shell: true,
      windowsHide: true,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let stdout = '';
    let stderr = '';
    const timer = setTimeout(() => {
      child.kill();
      reject(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' }));
    }, timeoutMs);
    child.stdout.on('data', (d) => {
      stdout += String(d);
    });
    child.stderr.on('data', (d) => {
      stderr += String(d);
    });
    child.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * npm view real (C8: canal registry, no file:).
 * @param {SaludBinding} binding
 * @param {{ exec?: Function, now?: () => number }} [deps]
 * @returns {Promise<ProbeResult>}
 */
export async function probeNpmView(binding, deps = {}) {
  const gate = validateBinding(binding);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  if (!gate.ok || binding.kind !== 'npm-view') {
    return {
      barrioId: binding?.barrioId || '',
      kind: 'npm-view',
      ok: false,
      detail: { error: gate.ok === false ? gate.error : 'kind_invalido' },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
  }
  const registry = binding.registry || DEFAULT_NPM_REGISTRY;
  try {
    const { code, stdout, stderr } = await runCommand({
      command: 'npm',
      args: ['view', binding.packageName, 'version', '--registry', registry],
      exec: deps.exec
    });
    const version = String(stdout || '').trim();
    const ok = code === 0 && version.length > 0;
    const detail = ok
      ? { packageName: binding.packageName, version, registry }
      : {
          packageName: binding.packageName,
          registry,
          code: /404|E404|not found/i.test(stderr + stdout) ? 'E404' : `exit_${code}`,
          stderr: String(stderr || '').slice(0, 400)
        };
    const result = {
      barrioId: binding.barrioId,
      kind: 'npm-view',
      ok,
      detail,
      checkedAt: now(),
      estadoSugerido: 'latente'
    };
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  } catch (err) {
    const result = {
      barrioId: binding.barrioId,
      kind: 'npm-view',
      ok: false,
      detail: {
        packageName: binding.packageName,
        registry,
        code: err?.code || 'error',
        message: String(err?.message || err).slice(0, 400)
      },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  }
}

/**
 * HTTP status read-only (GET).
 * @param {SaludBinding} binding
 * @param {{ fetch?: typeof fetch, now?: () => number, timeoutMs?: number }} [deps]
 * @returns {Promise<ProbeResult>}
 */
export async function probeHttpStatus(binding, deps = {}) {
  const gate = validateBinding(binding);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  if (!gate.ok || binding.kind !== 'http-status') {
    return {
      barrioId: binding?.barrioId || '',
      kind: 'http-status',
      ok: false,
      detail: { error: gate.ok === false ? gate.error : 'kind_invalido' },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
  }
  const fetchFn = deps.fetch || globalThis.fetch;
  const timeoutMs = deps.timeoutMs ?? 5_000;
  try {
    if (typeof fetchFn !== 'function') {
      throw Object.assign(new Error('fetch_unavailable'), { code: 'unreachable' });
    }
    const ac = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ac
      ? setTimeout(() => ac.abort(), timeoutMs)
      : null;
    const res = await fetchFn(binding.url, {
      method: 'GET',
      signal: ac?.signal
    });
    if (timer) clearTimeout(timer);
    const ok = res.ok === true || (res.status >= 200 && res.status < 400);
    const result = {
      barrioId: binding.barrioId,
      kind: 'http-status',
      ok,
      detail: { url: binding.url, status: res.status },
      checkedAt: now(),
      estadoSugerido: 'latente'
    };
    if (!ok) result.detail.code = `http_${res.status}`;
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  } catch (err) {
    const code =
      err?.code === 'ECONNREFUSED' ||
      err?.cause?.code === 'ECONNREFUSED' ||
      /ECONNREFUSED|fetch failed|aborted/i.test(String(err?.message || err))
        ? 'ECONNREFUSED'
        : err?.code || 'error';
    const result = {
      barrioId: binding.barrioId,
      kind: 'http-status',
      ok: false,
      detail: {
        url: binding.url,
        code,
        message: String(err?.message || err).slice(0, 400)
      },
      checkedAt: now(),
      estadoSugerido: 'latente'
    };
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  }
}

/**
 * Smoke idempotente (exit 0 = ok). No lanza servicios.
 * @param {SaludBinding} binding
 * @param {{ exec?: Function, now?: () => number }} [deps]
 * @returns {Promise<ProbeResult>}
 */
export async function probeSmoke(binding, deps = {}) {
  const gate = validateBinding(binding);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  if (!gate.ok || binding.kind !== 'smoke') {
    return {
      barrioId: binding?.barrioId || '',
      kind: 'smoke',
      ok: false,
      detail: { error: gate.ok === false ? gate.error : 'kind_invalido' },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
  }
  try {
    const { code, stdout, stderr } = await runCommand({
      command: binding.smokeCommand,
      args: Array.isArray(binding.smokeArgs) ? binding.smokeArgs : [],
      exec: deps.exec
    });
    const ok = code === 0;
    const result = {
      barrioId: binding.barrioId,
      kind: 'smoke',
      ok,
      detail: {
        command: binding.smokeCommand,
        code,
        stdout: String(stdout || '').slice(0, 200),
        stderr: String(stderr || '').slice(0, 200)
      },
      checkedAt: now(),
      estadoSugerido: 'latente'
    };
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  } catch (err) {
    const result = {
      barrioId: binding.barrioId,
      kind: 'smoke',
      ok: false,
      detail: {
        command: binding.smokeCommand,
        code: err?.code || 'error',
        message: String(err?.message || err).slice(0, 400)
      },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
    result.estadoSugerido = estadoDesdeProbe(result);
    return result;
  }
}

/**
 * @param {SaludBinding} binding
 * @param {object} [deps]
 * @returns {Promise<ProbeResult>}
 */
export async function probeSalud(binding, deps = {}) {
  const gate = validateBinding(binding);
  const now = typeof deps.now === 'function' ? deps.now : () => Date.now();
  if (!gate.ok) {
    return {
      barrioId: binding?.barrioId || '',
      kind: binding?.kind || 'npm-view',
      ok: false,
      detail: { error: gate.error },
      checkedAt: now(),
      estadoSugerido: 'roto'
    };
  }
  if (binding.kind === 'npm-view') return probeNpmView(binding, deps);
  if (binding.kind === 'http-status') return probeHttpStatus(binding, deps);
  return probeSmoke(binding, deps);
}

/**
 * ¿La acción exige capability? (C02). Default probes = no.
 * @param {string} action
 */
export function requiereCapability(action) {
  return CAPABILITY_REQUIRED.includes(action);
}

/**
 * Payload listo para `domain.applySalud`.
 * @param {ProbeResult} probe
 */
export function señalSaludDesdeProbe(probe) {
  return {
    barrioId: probe.barrioId,
    kind: probe.kind,
    ok: probe.ok === true,
    detail: probe.detail || {},
    checkedAt: probe.checkedAt,
    estadoSugerido: BARRIO_ESTADOS.includes(probe.estadoSugerido)
      ? probe.estadoSugerido
      : estadoDesdeProbe(probe)
  };
}

/**
 * Wake = acción real acotada: probe → (wake si latente+ok) → applySalud.
 * Orden: no sync-estado antes del wake (applySalud ok pondría `vivo` y
 * bloquearía el intent). Probe fail → sync estado y omite wake.
 *
 * @param {{
 *   domain: { applySalud: Function, applyIntent: Function, snapshot: Function },
 *   makeIntent: Function,
 *   actorId: string,
 *   barrioId: string,
 *   binding: SaludBinding,
 *   horseMode?: string,
 *   deps?: object
 * }} opts
 */
export async function wakeConSalud(opts) {
  const {
    domain,
    makeIntent,
    actorId,
    barrioId,
    binding,
    horseMode = 'stub',
    deps = {}
  } = opts;
  if (!domain || typeof domain.applySalud !== 'function') {
    return { ok: false, error: 'domain_sin_applySalud' };
  }
  const bound = { ...binding, barrioId: barrioId || binding.barrioId };
  const probe = await probeSalud(bound, deps);
  const señal = señalSaludDesdeProbe(probe);

  if (!probe.ok) {
    const apply = domain.applySalud(señal);
    return {
      ok: apply.ok === true,
      error: apply.error || null,
      probe,
      apply,
      wake: null,
      skippedWake: true,
      reason: 'probe_no_ok'
    };
  }

  const snap = domain.snapshot('pre-wake-salud');
  const estado = snap.barrios?.[bound.barrioId]?.estado;
  let wake = null;
  if (estado === 'latente') {
    wake = domain.applyIntent(
      makeIntent(actorId, 'wake', {
        tool: `salud.${probe.kind}`,
        barrioId: bound.barrioId,
        horseMode
      })
    );
    if (!wake.ok) {
      const apply = domain.applySalud(señal);
      return { ok: false, error: wake.error, probe, apply, wake };
    }
  }

  // Tras wake (o si ya no era latente): registrar señal; syncEstado si no
  // acabamos de despertar (el wake ya puso vivo).
  const apply = domain.applySalud(señal, {
    syncEstado: wake == null || wake.ok !== true
  });
  return {
    ok: apply.ok === true && (wake == null || wake.ok === true),
    error: apply.error || wake?.error || null,
    probe,
    apply,
    wake,
    skippedWake: wake == null,
    reason: wake == null ? `barrio_${estado}` : null
  };
}

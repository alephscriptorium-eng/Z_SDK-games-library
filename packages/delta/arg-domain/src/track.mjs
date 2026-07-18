/**
 * Resolución de refs arg:track → navegación en browsers reales.
 * Puro de strings (browser-safe). Ver CONTRATO §3 arg:track.
 */

const DEFAULT_LINEA = 'espana';
const DEFAULT_SAT_REL = 'wp/historia';

/**
 * @param {{ kind?: string, uri?: string, index?: number, corpus?: string }} ref
 * @returns {{ browser: 'firehose-browser'|'cache-browser', linea?: string, corpus?: string, path: string, mode?: string }|null}
 */
export function resolveTrackRef(ref) {
  if (!ref?.uri) return null;
  const uri = String(ref.uri);

  let m = uri.match(/^linea:\/\/nodo\/(\d+)$/);
  if (m) {
    return {
      browser: 'cache-browser',
      linea: DEFAULT_LINEA,
      path: `nodos/${m[1]}/meta.json`
    };
  }

  m = uri.match(/^linea:\/\/registro\/([^/]+)\/([^/]+)\/(\d+)$/);
  if (m) {
    const satRel = m[1].replace(/\/+$/, '');
    const registroId = m[2];
    const oldid = m[3];
    return {
      browser: 'cache-browser',
      linea: DEFAULT_LINEA,
      path: `${satRel}/registros/${registroId}-oldid-${oldid}/registro.md`
    };
  }

  m = uri.match(/^firehose:\/\/post\/([^/]+)\/(.+)$/);
  if (m) {
    return {
      browser: 'firehose-browser',
      corpus: m[1],
      path: m[2],
      mode: 'preview'
    };
  }

  m = uri.match(/^firehose:\/\/synthetic\/\d+\/(\d+)/);
  if (m) {
    return {
      browser: 'firehose-browser',
      corpus: 'raw',
      path: `synthetic/post-${m[1]}.json`,
      mode: 'preview'
    };
  }

  return null;
}

/** Helpers alineados con presets-sdk/paths (paridad en test Node). */
export function nodoMetaPathForTrack(nodoId) {
  return `nodos/${nodoId}/meta.json`;
}

export function registroMdPathForTrack(satRel, registroId, oldid) {
  const base = String(satRel || DEFAULT_SAT_REL).replace(/\/+$/, '');
  return `${base}/registros/${registroId}-oldid-${oldid}/registro.md`;
}

export function corpusRelPathForTrack(corpusId, relativePath = '') {
  const base = String(corpusId || '').replace(/\\/g, '/').replace(/^\/+|\/+$/g, '');
  const rel = String(relativePath || '').replace(/\\/g, '/').replace(/^\/+/, '');
  if (!base) return rel;
  return rel ? `${base}/${rel}` : base;
}

/**
 * Compone URL de deep-link para un ref resuelto (vista jugador, sin presets-sdk).
 * @param {ReturnType<typeof resolveTrackRef>} resolved
 * @param {{ cache?: string, firehose?: string }} bases
 * @param {{ actor?: string }} [opts]
 */
export function buildTrackBrowserUrl(resolved, bases, opts = {}) {
  if (!resolved || !bases) return null;
  const baseKey = resolved.browser === 'firehose-browser' ? 'firehose' : 'cache';
  const base = bases[baseKey];
  if (!base) return null;

  const params = new URLSearchParams();
  if (opts.actor) params.set('actor', opts.actor);
  if (resolved.browser === 'cache-browser') {
    if (resolved.linea) params.set('linea', resolved.linea);
    if (resolved.path) params.set('path', resolved.path);
  } else {
    if (resolved.corpus) params.set('corpus', resolved.corpus);
    if (resolved.path) params.set('path', resolved.path);
    if (resolved.mode) params.set('mode', resolved.mode);
  }
  const qs = params.toString();
  return qs ? `${base.replace(/\/$/, '')}/?${qs}` : base;
}

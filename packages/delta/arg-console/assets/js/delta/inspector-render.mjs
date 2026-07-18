/**
 * Inspector de flujo y cantera — render PURO (WP-25, UX §UX-2.3/2.4).
 *
 * Funciones de string sin three ni DOM: reciben el snapshot arg:state, la
 * escena pura (deltaV0) y devuelven HTML. Testables en node con fixtures.
 * Los deep-links son HONESTOS (WP-26): un ref sintético se marca
 * 「sintético」 sin enlace, una cámara ghost dice «no excavado aún».
 *
 * Solo lectura: aquí no se emite ni un intent (G-ARG.1/G-ARG.4).
 */

import { resolveTrackRef, buildTrackBrowserUrl } from '@zeus/arg-domain';

/** Espejo del flow-engine: el cauce nunca se para del todo. */
const RESIDUAL_FLOW = 0.25;

export function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function shortUri(uri, max = 44) {
  if (!uri) return '—';
  const s = String(uri);
  return s.length <= max ? s : `…${s.slice(-max)}`;
}

/** Un ref es sintético si su uri vive en firehose://synthetic/... */
export function isSyntheticUri(uri) {
  return /^firehose:\/\/synthetic\//.test(String(uri ?? ''));
}

/**
 * Deep-link honesto: null si el ref es sintético o no resoluble.
 * @param {string} uri
 * @param {{cache?:string, firehose?:string}} browsers
 * @param {string|null} [actor]
 */
export function dropletDeepLink(uri, browsers, actor = null) {
  if (!uri || isSyntheticUri(uri) || !browsers) return null;
  const resolved = resolveTrackRef({ uri });
  if (!resolved) return null;
  return buildTrackBrowserUrl(resolved, browsers, actor ? { actor } : {});
}

/** Corpus de una gota (derivado de su uri vía resolveTrackRef). */
export function dropletCorpus(uri) {
  if (!uri) return null;
  return resolveTrackRef({ uri })?.corpus ?? null;
}

/**
 * Línea de gota: uri corta · corpus · etiqueta · progreso %, con enlace
 * honesto (o 「sintético」).
 * @param {[string, number, string, string|null|undefined, string|null|undefined]} tuple
 *   tupla compacta del snapshot: [id, progress, state, label?, uri?]
 */
export function renderDropletLine(tuple, { browsers, actor } = {}) {
  const [id, progress, state, label, uri] = tuple;
  const pct = `${Math.round((progress ?? 0) * 100)}%`;
  const corpus = dropletCorpus(uri);
  const href = dropletDeepLink(uri, browsers, actor);
  const fullUri = escapeHtml(uri ?? '');
  const uriHtml = href
    ? `<a class="insp-link" href="${escapeHtml(href)}" title="${fullUri}" target="_blank" rel="noopener">${escapeHtml(shortUri(uri))}</a>`
    : `<span class="insp-uri" title="${fullUri}">${escapeHtml(shortUri(uri))}</span>${
        isSyntheticUri(uri) ? ' <span class="insp-synthetic">「sintético」</span>' : ''
      }`;
  const bits = [
    `<span class="insp-drop-id">${escapeHtml(id)}</span>`,
    uriHtml,
    corpus ? `<span class="insp-corpus">${escapeHtml(corpus)}</span>` : '',
    label ? `<span class="insp-label">«${escapeHtml(label)}»</span>` : '',
    `<span class="insp-progress">${pct}</span>`,
    state === 'spill' ? '<span class="insp-spill">spill</span>' : ''
  ].filter(Boolean);
  return `<div class="insp-drop insp-drop-${escapeHtml(state ?? 'flowing')}">${bits.join(' · ')}</div>`;
}

function renderDroplets(droplets, opts) {
  if (!droplets?.length) {
    return '<p class="insp-muted">— cauce vacío —</p>';
  }
  return droplets.map((tuple) => renderDropletLine(tuple, opts)).join('');
}

/** Barra horizontal 0..1 (presión, murk...). */
export function renderBar(value, { danger = 0.85 } = {}) {
  const v = Math.max(0, Math.min(1, Number(value) || 0));
  const cls = v >= danger ? ' danger' : v >= 0.6 ? ' warn' : '';
  return `<div class="insp-bar"><div class="insp-bar-fill${cls}" style="width:${Math.round(v * 100)}%"></div></div>`;
}

/**
 * @param {string} tapId
 * @param {{snap:object, scene:object, browsers?:object, actor?:string}} ctx
 */
export function renderTapInspector(tapId, ctx) {
  const { snap, scene } = ctx;
  const def = scene.taps[tapId];
  const live = snap?.taps?.[tapId] ?? { aperture: 0, pressure: 0, state: 'ok' };
  const rio = def ? scene.rios[def.riverId] : null;
  const droplets = rio ? snap?.rivers?.[rio.id]?.droplets ?? [] : [];
  const out = [
    `<div class="insp-kv"><span>presión</span> ${renderBar(live.pressure)} <code>${Number(live.pressure).toFixed(2)}</code></div>`,
    `<div class="insp-kv"><span>apertura</span> <code>${Number(live.aperture).toFixed(2)}</code></div>`,
    `<div class="insp-kv"><span>estado</span> <code class="insp-state-${escapeHtml(live.state)}">${escapeHtml(live.state)}</code></div>`
  ];
  if (live.state === 'burst') {
    out.push('<p class="insp-warn">¡RIADA! el grifo ha reventado — las gotas caen como spill hasta el cooldown</p>');
  }
  if (rio) {
    out.push(`<div class="insp-section">gotas en ${escapeHtml(rio.id)} (${droplets.length})</div>`);
    out.push(renderDroplets(droplets, ctx));
  }
  return out.join('');
}

/**
 * @param {string} riverId
 */
export function renderRiverInspector(riverId, ctx) {
  const { snap, scene } = ctx;
  const rio = scene.rios[riverId];
  const droplets = snap?.rivers?.[riverId]?.droplets ?? [];
  const aperture = rio ? snap?.taps?.[rio.tapId]?.aperture ?? 0 : 0;
  const speed = rio ? rio.flowSpeed * Math.max(RESIDUAL_FLOW, aperture) : 0;
  return [
    `<div class="insp-kv"><span>velocidad</span> <code>${speed.toFixed(2)} u/s</code> <span class="insp-muted">(grifo ${escapeHtml(rio?.tapId ?? '?')} · ap ${Number(aperture).toFixed(2)})</span></div>`,
    `<div class="insp-section">gotas en vuelo (${droplets.length})</div>`,
    renderDroplets(droplets, ctx)
  ].join('');
}

/**
 * @param {{snap:object, arrivals?:Array<{uri?:string,label?:string}>}} ctx
 */
export function renderSeaInspector(ctx) {
  const sea = ctx.snap?.sea ?? {};
  const capacity = sea.murkCapacity || 1;
  const out = [
    `<div class="insp-kv"><span>cristales</span> <code>${sea.crystals ?? 0} 💎</code></div>`,
    `<div class="insp-kv"><span>murk</span> ${renderBar((sea.murk ?? 0) / capacity)} <code>${sea.murk ?? 0}/${sea.murkCapacity ?? '—'}</code></div>`
  ];
  if (sea.collapsed) out.push('<p class="insp-warn">EL DELTA HA COLAPSADO — el mar traga las terrazas</p>');
  const tuples = sea.droplets ?? [];
  if (tuples.length) {
    const floating = tuples.filter((t) => t[1]);
    const sunken = tuples.filter((t) => !t[1]);
    const labels = [...new Set(floating.map((t) => t[1]))].sort();
    if (labels.length) {
      out.push(`<div class="insp-section">clusters (${labels.length})</div>`);
      for (const label of labels) {
        const n = floating.filter((t) => t[1] === label).length;
        out.push(`<div class="insp-drop"><span class="insp-label">«${escapeHtml(label)}»</span> · ${n} flotantes</div>`);
      }
    }
    if (floating.length) {
      out.push(`<div class="insp-section">flotantes (${floating.length})</div>`);
      for (const t of floating) out.push(renderSeaDropletLine(t, ctx));
    }
    if (sunken.length) {
      out.push(`<div class="insp-section">hundidas (${sunken.length})</div>`);
      for (const t of sunken) out.push(renderSeaDropletLine(t, ctx));
    }
  }
  const arrivals = ctx.arrivals ?? [];
  if (arrivals.length) {
    out.push(`<div class="insp-section">últimas gotas llegadas (${arrivals.length})</div>`);
    for (const a of arrivals) {
      out.push(
        `<div class="insp-drop">${a.label ? `<span class="insp-label">«${escapeHtml(a.label)}»</span> · ` : ''}${escapeHtml(shortUri(a.uri))}</div>`
      );
    }
  }
  return out.join('');
}

function renderSeaDropletLine(tuple, ctx) {
  const [id, label, uri] = tuple;
  const href = dropletDeepLink(uri, ctx.browsers, ctx.actor);
  const uriHtml = href
    ? `<a class="insp-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">${escapeHtml(shortUri(uri))}</a>`
    : `<span class="insp-uri">${escapeHtml(shortUri(uri))}</span>${isSyntheticUri(uri) ? ' <span class="insp-synthetic">「sintético」</span>' : ''}`;
  return `<div class="insp-drop"><span class="insp-drop-id">${escapeHtml(id)}</span> · ${uriHtml}${label ? ` · <span class="insp-label">«${escapeHtml(label)}»</span>` : ''}</div>`;
}

/**
 * @param {string} chamberId
 * @param {{chambers:Record<string,{ref?:object,state?:string}>, browsers?:object, actor?:string}} ctx
 */
export function renderChamberInspector(chamberId, ctx) {
  const chamber = ctx.chambers?.[chamberId];
  if (!chamber) {
    return '<p class="insp-muted">esperando el estado de la cantera… (llega con el próximo arg:state completo)</p>';
  }
  const uri = chamber.ref?.uri ?? null;
  const state = chamber.state ?? 'ghost';
  const out = [
    `<div class="insp-kv"><span>recurso</span> <span class="insp-uri">${escapeHtml(shortUri(uri))}</span></div>`,
    `<div class="insp-kv"><span>estado</span> <code class="insp-state-${escapeHtml(state)}">${escapeHtml(state)}</code></div>`
  ];
  if (state === 'cached') {
    const href = dropletDeepLink(uri, ctx.browsers, ctx.actor);
    if (href) {
      out.push(`<a class="arg-btn arg-btn-link" href="${escapeHtml(href)}" target="_blank" rel="noopener">abrir en navegador</a>`);
    } else if (isSyntheticUri(uri)) {
      out.push('<p class="insp-muted"><span class="insp-synthetic">「sintético」</span> — sin enlace: este recurso no vive en disco</p>');
    }
  } else if (state === 'digging') {
    out.push('<p class="insp-muted">⛏ excavando…</p>');
  } else {
    out.push('<p class="insp-muted">👻 no excavado aún — abre un pasillo hasta aquí para inflar el recurso</p>');
  }
  return out.join('');
}

const TITLES = {
  tap: (id) => `⚙ grifo · ${id}`,
  river: (id) => `〰 río · ${id}`,
  sea: () => '🌊 el mar',
  chamber: (id) => `⛏ cámara · ${id}`
};

/** Título de la ventanita según la selección. */
export function inspectorTitle(sel) {
  const fn = TITLES[sel?.kind];
  return fn ? fn(sel.id) : '🔍 inspector';
}

/**
 * Render principal: HTML del cuerpo del inspector para una selección
 * `{kind:'tap'|'river'|'sea'|'chamber', id}`.
 *
 * @param {{kind:string, id:string}} sel
 * @param {{snap:object, scene:object, chambers?:object, browsers?:object,
 *          actor?:string|null, arrivals?:Array}} ctx
 */
export function renderInspector(sel, ctx) {
  if (!sel) return '<p class="insp-muted">click en un grifo, río, mar o cámara del mapa</p>';
  switch (sel.kind) {
    case 'tap':
      return renderTapInspector(sel.id, ctx);
    case 'river':
      return renderRiverInspector(sel.id, ctx);
    case 'sea':
      return renderSeaInspector(ctx);
    case 'chamber':
      return renderChamberInspector(sel.id, ctx);
    default:
      return `<p class="insp-muted">símbolo desconocido: ${escapeHtml(sel.kind)}</p>`;
  }
}

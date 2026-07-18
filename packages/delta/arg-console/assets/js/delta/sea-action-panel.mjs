/**
 * Ventanita de acción del mar (WP-31) — patrón cloak-panel.
 */

import { dropletDeepLink, isSyntheticUri, shortUri } from './inspector-render.mjs';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * @param {object} opts
 * @param {{id:string, label:string|null, uri:string|null, state:string}} opts.droplet
 * @param {string[]} opts.labelset
 * @param {boolean} opts.canSalvage proximidad + gota hundida
 * @param {{cache?:string, firehose?:string}} opts.browsers
 * @param {string} [opts.actor]
 */
export function renderSeaActionPanel({ droplet, labelset = [], canSalvage = false, browsers, actor }) {
  if (!droplet) return '<p class="overlay-muted">—</p>';
  const href = dropletDeepLink(droplet.uri, browsers, actor);
  const uriLine = href
    ? `<a class="arg-btn arg-btn-link" href="${esc(href)}" target="_blank" rel="noopener">abrir en firehose</a>`
    : isSyntheticUri(droplet.uri)
      ? '<span class="insp-synthetic">「sintético」</span>'
      : '';
  const salvageBtns =
    droplet.state === 'sunken' && canSalvage
      ? labelset
          .map(
            (label) =>
              `<button type="button" class="arg-btn sea-salvage-btn" data-label="${esc(label)}">rescatar · ${esc(label)}</button>`
          )
          .join('')
      : droplet.state === 'sunken'
        ? '<p class="overlay-muted">acércate a la orilla o una boya para rescatar</p>'
        : '';
  return [
    `<p class="overlay-muted">gota <code>${esc(droplet.id)}</code> · ${esc(droplet.state)}</p>`,
    `<p class="overlay-muted">${esc(shortUri(droplet.uri))}</p>`,
    salvageBtns,
    `<button type="button" class="arg-btn sea-track-btn">lanzar al firehose (track)</button>`,
    uriLine
  ]
    .filter(Boolean)
    .join('\n');
}

/**
 * @param {HTMLElement} root
 * @param {{ onSalvage:(label:string)=>void, onTrack:()=>void }} handlers
 */
export function bindSeaActionPanel(root, { onSalvage, onTrack }) {
  root.querySelector('.sea-track-btn')?.addEventListener('click', () => onTrack());
  root.querySelectorAll('.sea-salvage-btn').forEach((btn) => {
    btn.addEventListener('click', () => onSalvage(btn.dataset.label));
  });
}

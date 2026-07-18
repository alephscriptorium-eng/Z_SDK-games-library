/**
 * Shell compartido de todas las páginas del arg-console: template de
 * @zeus/ui-kit (directo, sin app-shell — config mínima autocontenida) + el
 * import map de página (three, socket.io, ui-3d-kit, view-kit, game-engine y
 * arg-domain servidos vendorizados/crudos por el server).
 */

import { template as uiTemplate, defaultShellBrand } from '@zeus/ui-kit';

const LOCAL_NAV = [
  { href: '/', emoji: '🌊', text: 'Portal', pageKey: 'portal' },
  { href: '/views/tablero', emoji: '🗺️', text: 'Tablero', pageKey: 'view:tablero' },
  { href: '/views/jugador', emoji: '🚶', text: 'Jugador', pageKey: 'view:jugador' },
  { href: '/health', emoji: '💓', text: 'Health', pageKey: 'health' }
];

/**
 * template(title, content, opts) con la marca delta y la nav local fija.
 */
export function template(pageTitle, content, opts = {}) {
  return uiTemplate(pageTitle, content, {
    uiId: 'arg-console',
    brand: defaultShellBrand('delta · arg-console'),
    localNavEntries: LOCAL_NAV,
    theme: 'Dark-MCP',
    themes: [],
    showThemeSelector: false,
    ...opts
  });
}

export const IMPORT_MAP = {
  imports: {
    three: '/vendor/three/build/three.module.js',
    'three/addons/': '/vendor/three/examples/jsm/',
    'socket.io-client': '/vendor/socket.io/socket.io.esm.min.js',
    '@zeus/ui-3d-kit': '/kit/index.mjs',
    '@zeus/ui-3d-kit/': '/kit/',
    '@zeus/view-kit': '/view-kit/index.mjs',
    '@zeus/view-kit/': '/view-kit/',
    '@zeus/game-engine': '/game-engine/index.mjs',
    '@zeus/game-engine/': '/game-engine/',
    '@zeus/arg-domain': '/arg-domain/index.mjs',
    '@zeus/arg-domain/scenes/delta-v0': '/arg-domain/scenes/delta-v0.mjs',
    '@zeus/arg-domain/': '/arg-domain/',
    '@zeus/protocol': '/protocol/index.mjs',
    '@zeus/protocol/': '/protocol/',
    '@zeus/webrtc-viewer/game-actions': '/webrtc-viewer/browser/game-actions.mjs'
  }
};

/**
 * Portal — galería de vistas de delta (una tarjeta por vista registrada,
 * enlazando a /views/:id). Mismo patrón que el portal del 3d-monitor.
 */

import { div, section, h1, h2, p, a, ul, li, span } from 'hyperaxe';
import { template } from './shell.mjs';

/**
 * @param {object} ctx
 * @param {object} ctx.registry      registro de vistas (list())
 * @param {object} ctx.viewerConfig  config de room resuelta (se muestra en cabecera)
 */
export function portalView(ctx) {
  const cards = ctx.registry.list().map((view) =>
    a({ class: 'portal-card', href: `/views/${view.id}` },
      h2({ class: 'portal-card-title' }, `${view.emoji} ${view.title}`),
      p({ class: 'portal-card-desc' }, view.description),
      ul({ class: 'portal-card-elements' },
        ...view.elements.map((el) => li({ class: 'portal-card-element' }, el))
      )
    )
  );

  const content = section({ class: 'portal-page' },
    h1({ class: 'portal-title' }, '🌊 delta · portal de vistas'),
    p({ class: 'portal-sub' },
      'Room ',
      span({ class: 'portal-room' }, ctx.viewerConfig.room),
      ` · ${cards.length} vistas registradas · la vista jugador acepta ?actor= (demo: uno, dos)`
    ),
    div({ class: 'portal-grid' }, ...cards)
  );

  return template('delta', content, {
    currentPage: 'portal',
    styles: ['/assets/css/viewer.css']
  });
}

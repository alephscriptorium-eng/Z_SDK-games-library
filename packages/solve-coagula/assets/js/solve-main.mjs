/**
 * Browser entry: vista solve + widgets @zeus/view-kit (WP-U113).
 */

import {
  createDefaultWidgetRegistry,
  mountStoryWidgets
} from '@zeus/view-kit';

const cfg = JSON.parse(document.getElementById('viewer-config')?.textContent || '{}');
const materials = JSON.parse(
  document.getElementById('solve-materials')?.textContent || '{}'
);

const roomEl = document.getElementById('hud-room');
const actorEl = document.getElementById('hud-actor');
if (roomEl) roomEl.textContent = cfg.room || '—';
if (actorEl) actorEl.textContent = cfg.actor || '—';

const mount = document.getElementById('widgets-mount');
const widgets = Array.isArray(materials.focusWidgets) ? materials.focusWidgets : [];
const dataById = materials.widgetData || {};

if (mount && widgets.length) {
  const registry = createDefaultWidgetRegistry();
  mountStoryWidgets({
    registry,
    widgets,
    dataById,
    mount,
    doc: document
  });
}

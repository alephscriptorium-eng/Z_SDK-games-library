/**
 * Catálogo de vistas de delta. Cada vista combina el registro SSR
 * (`@zeus/app-shell/ssr-view-registry`: stage, HUD, log panel) con su entry
 * de navegador bajo /assets/js/views/.
 *
 * Para añadir una vista: defineView(...) aquí + escribir su entry. El portal
 * y el routing la recogen del registro.
 */

import { defineView, createViewRegistry, renderViewLayout } from '@zeus/app-shell/ssr-view-registry';
import { template, IMPORT_MAP } from './shell.mjs';

const CONN_FIELD = { id: 'hud-conn', label: 'conn', value: '…' };

export const VIEWS = [
  defineView({
    id: 'tablero',
    title: 'Tablero · el delta entero',
    emoji: '🗺️',
    description: 'Overview global del delta (el dios-mapa): cimas con grifos y manómetros, ríos de gotas instanciadas, mar que se enturbia o cristaliza, cantera de cámaras y pasillos, actores en vivo — y el ledger del Notario corriendo en el panel. Solo espejo, sin input de juego.',
    entry: '/assets/js/views/tablero.mjs',
    elements: ['stage 3D', 'HUD global', 'delta-stage (cimas/ríos/mar/cantera)', 'gotas instanciadas + dead reckoning', 'monigotes stick + puppets GLB', 'ledger DOM coloreado', 'room wiring'],
    logPanel: true,
    hud: {
      fields: [
        CONN_FIELD,
        { id: 'hud-room', label: 'room' },
        { id: 'hud-tick', label: 'tick' },
        { id: 'hud-drops', label: 'gotas en vuelo', value: '0' },
        { id: 'hud-tap-a', label: 'grifo-a' },
        { id: 'hud-tap-b', label: 'grifo-b' },
        { id: 'hud-sea', label: 'mar' },
        { id: 'hud-objetivo', label: 'objetivo' },
        { id: 'hud-actors', label: 'actores', value: '0' }
      ],
      note: 'Ledger del Notario en el panel →'
    }
  }),
  defineView({
    id: 'jugador',
    title: 'Jugador · vista encarnada',
    emoji: '🚶',
    description: 'El mismo delta desde la perspectiva del actor (?actor=uno): cámara chase detrás del monigote, WASD para caminar el nav-graph, E para montar el río, 1..3 para etiquetar gotas, Espacio para contactar, Q inventario de cloak, X emote. Todo son intents — la vista nunca muta local.',
    entry: '/assets/js/views/jugador.mjs',
    elements: ['stage 3D', 'cámara chase (Alt = inspección)', 'input teclado → arg:intent', 'menú de contacto (grifo)', 'panel cloak', 'franja tracking (arg:track)', 'dead reckoning', 'room wiring'],
    hud: {
      fields: [
        CONN_FIELD,
        { id: 'hud-room', label: 'room' },
        { id: 'hud-actor', label: 'actor' },
        { id: 'hud-zone', label: 'zona' },
        { id: 'hud-pose', label: 'pose' },
        { id: 'hud-droplet', label: 'gota' },
        { id: 'hud-score', label: 'score' },
        { id: 'hud-tap', label: 'grifo cercano' }
      ],
      note: 'WASD mover · E río · 1-3 etiquetar · Espacio contacto · Q cloak · X emote · Alt inspección'
    }
  })
];

export const viewRegistry = createViewRegistry(VIEWS);

/**
 * Renderiza una vista registrada.
 * @param {string} id
 * @param {{viewerConfig: object}} ctx
 * @returns elemento shell renderizado o null si la vista no existe
 */
export function renderView(id, ctx) {
  const view = viewRegistry.get(id);
  if (!view) return null;
  return renderViewLayout(view, { template, importMap: IMPORT_MAP, ...ctx });
}

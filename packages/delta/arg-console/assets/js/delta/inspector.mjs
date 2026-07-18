/**
 * Inspector de flujo y cantera — wiring 3D→HTML (WP-25).
 *
 * Raycast de click sobre los símbolos del delta-stage (grifos, cauces, mar,
 * cámaras — identificados por su `userData = {kind, id}`) que abre una
 * ventanita HTML (panel.mjs) con el render puro de inspector-render.mjs,
 * refrescada con cada arg:state. El 3D queda como mapa de símbolos
 * clickables; toda la lectura vive aquí, en HTML (UX §UX-2, la ley).
 *
 * Solo lectura: jamás emite intents ni muta escena (G-ARG.1).
 */

import * as THREE from 'three';
import { createPanel } from '@zeus/view-kit';
import { renderInspector, inspectorTitle } from './inspector-render.mjs';

const CLICK_SLOP_PX = 6; // más que esto es un drag de OrbitControls, no un click
const MAX_ARRIVALS = 5;

/**
 * @param {object} opts
 * @param {object} opts.stage      salida de createViewerScene (camera + sceneManager)
 * @param {THREE.Object3D[]} opts.pickables símbolos clickables (delta.pickables)
 * @param {object} opts.scene      escena pura del dominio (deltaV0)
 * @param {object} opts.cfg        viewer config (browsers, actor, view)
 * @param {Element} [opts.container] contenedor del canvas (default #viewer-stage)
 * @returns {{ applySnapshot(snap):void, open(sel):void, close():void, dispose():void }}
 */
export function createInspector({ stage, pickables, scene, cfg, container }) {
  const host = container ?? document.getElementById('viewer-stage');
  const camera = stage.camera;

  const panel = createPanel({
    id: 'inspector-panel',
    title: '🔍 inspector',
    collapsible: true,
    draggable: true,
    view: cfg.view,
    className: 'panel-inspector',
    mount: host
  });
  panel.el.hidden = true;

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();

  let selection = null; // { kind, id }
  let lastSnap = null;
  /** cache del último maze completo: id → { ref, state } */
  const chambers = {};
  /** últimas gotas llegadas al mar (detectadas en cliente) */
  const arrivals = [];
  /** riverId → Map(dropletId → tupla) del snapshot anterior */
  let prevDroplets = new Map();

  function render() {
    if (!selection) {
      panel.body.innerHTML = renderInspector(null, {});
      return;
    }
    panel.setTitle(inspectorTitle(selection));
    panel.body.innerHTML = renderInspector(selection, {
      snap: lastSnap,
      scene,
      chambers,
      browsers: cfg.browsers,
      actor: cfg.actor,
      arrivals
    });
  }

  function open(sel) {
    selection = sel;
    panel.el.hidden = false;
    panel.setCollapsed(false, { persist: false });
    render();
  }

  function close() {
    panel.el.hidden = true;
  }

  /** Sube por los ancestros hasta encontrar un userData con kind. */
  function pickedSelection(object3d) {
    let node = object3d;
    while (node) {
      if (node.userData?.kind) return { kind: node.userData.kind, id: node.userData.id };
      node = node.parent;
    }
    return null;
  }

  // ---- click con tolerancia de drag (OrbitControls también usa el ratón) ----
  let downAt = null;

  function canvasEl() {
    return host?.querySelector('canvas') ?? null;
  }

  function onPointerDown(ev) {
    downAt = { x: ev.clientX, y: ev.clientY };
  }

  function onClick(ev) {
    if (ev.target !== canvasEl()) return; // clicks en paneles HTML no raycastean
    if (downAt && Math.hypot(ev.clientX - downAt.x, ev.clientY - downAt.y) > CLICK_SLOP_PX) return;
    const rect = ev.target.getBoundingClientRect();
    ndc.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(pickables, true);
    for (const hit of hits) {
      const sel = pickedSelection(hit.object);
      if (sel) {
        open(sel);
        return;
      }
    }
    close(); // click en el vacío: el mapa vuelve a ser solo mapa
  }

  host?.addEventListener('pointerdown', onPointerDown);
  host?.addEventListener('click', onClick);

  return {
    open,
    close,

    /** Refresca contenidos con cada arg:state (y cachea maze + llegadas). */
    applySnapshot(snap) {
      lastSnap = snap;
      if (snap?.maze?.chambers) {
        for (const [id, chamber] of Object.entries(snap.maze.chambers)) {
          chambers[id] = { ref: chamber.ref, state: chamber.state };
        }
      }
      // llegadas al mar: gotas del snapshot anterior con progress alto que ya no están
      if (snap?.rivers) {
        const next = new Map();
        for (const [riverId, river] of Object.entries(snap.rivers)) {
          const ids = new Set();
          for (const tuple of river.droplets ?? []) ids.add(tuple[0]);
          next.set(riverId, { ids, droplets: river.droplets ?? [] });
        }
        for (const [riverId, prev] of prevDroplets) {
          const current = next.get(riverId);
          for (const tuple of prev.droplets) {
            const [id, progress, state, label, uri] = tuple;
            if (progress > 0.85 && state !== 'spill' && !current?.ids.has(id)) {
              arrivals.unshift({ uri, label });
              if (arrivals.length > MAX_ARRIVALS) arrivals.pop();
            }
          }
        }
        prevDroplets = next;
      }
      if (!panel.el.hidden && !panel.isCollapsed()) render();
    },

    dispose() {
      host?.removeEventListener('pointerdown', onPointerDown);
      host?.removeEventListener('click', onClick);
      panel.destroy();
    }
  };
}

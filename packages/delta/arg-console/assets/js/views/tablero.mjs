/**
 * Vista "tablero" — overview global del delta (UX.md §tablero, el dios-mapa).
 *
 * Cámara orbital libre sobre todo el delta: delta-stage (cimas/grifos/ríos/
 * mar/cantera) + gotas instanciadas + actores, todo dirigido por los
 * arg:state de la autoridad a 10 Hz con dead reckoning entre snapshots.
 * El panel DOM es el ledger del Notario en vivo (arg:ledger coloreado por
 * kind). Solo espejo: esta vista no emite ni un intent.
 */

import * as THREE from 'three';
import { deltaV0 } from '@zeus/arg-domain/scenes/delta-v0';
import {
  createViewerScene,
  setText,
  readViewerConfig,
  connectRoom,
  onChannelEvent,
  createLogPanel,
  createActorsLayer,
  createPanel
} from '@zeus/view-kit';
import {
  createDeltaStage,
  createRiverDroplets,
  createSeaDroplets,
  createInspector
} from '../delta/index.mjs';
import { EVENTS } from '@zeus/arg-domain';

const LEDGER_COLORS = {
  label: '#00ff41',
  excavate: '#00d4ff',
  burst: '#ff8844',
  collapse: '#ff3344',
  objetivo: '#ffd700',
  cache: '#7cffb2',
  curate: '#c4a1ff',
  milestone: '#ffd27a'
};

function fmtLedger(entry) {
  switch (entry.kind) {
    case 'label':
      return `${entry.actorId ?? '?'} etiqueta «${entry.detail?.label}» en ${entry.detail?.riverId} → ${entry.ref?.uri ?? ''}`;
    case 'excavate':
      return `${entry.actorId ?? '?'} abre ${entry.detail?.corridorId} → ${entry.ref?.uri ?? ''}`;
    case 'burst':
      return `¡RIADA! ${entry.detail?.tapId} revienta sobre ${entry.detail?.riverId}`;
    case 'collapse':
      return `EL DELTA COLAPSA — murk ${entry.detail?.murk} / ${entry.detail?.capacity}`;
    case 'objetivo':
      return `OBJETIVO CUMPLIDO — ${entry.detail?.labeled} etiquetadas, ${entry.detail?.excavated} excavadas`;
    case 'cache':
      return `${entry.actorId ?? '?'} cachea ${entry.detail?.lineId}/${entry.detail?.registroId}`;
    case 'curate':
      return `${entry.actorId ?? '?'} curates ${entry.detail?.lineId}/${entry.detail?.registroId} → ${entry.detail?.status ?? ''}`;
    case 'milestone':
      return `${entry.actorId ?? '?'} milestone ${entry.detail?.lineId}/${entry.detail?.registroId} · ${(entry.detail?.reasons ?? []).join(',')}`;
    default:
      return JSON.stringify(entry.detail ?? {});
  }
}

function main() {
  const cfg = readViewerConfig();
  setText('hud-room', cfg.room);

  const stage = createViewerScene({
    camera: { position: [0, 26, 34], far: 600 },
    controls: { minDistance: 6, maxDistance: 160, maxPolarAngle: Math.PI / 2.05 },
    fog: { near: 30, far: 220 }
  });
  const { scene } = stage;

  const world = new THREE.Group();
  scene.add(world);

  const delta = createDeltaStage(world, deltaV0);
  const droplets = createRiverDroplets(world, deltaV0);
  const seaDroplets = createSeaDroplets(world, deltaV0);
  const actors = createActorsLayer(world);

  // ---- ventanitas (WP-24): leyenda y ledger, arrastrables y colapsables ----
  const hudPanel = createPanel({
    id: 'hud',
    title: '🗺️ leyenda · tablero',
    collapsible: true,
    draggable: true,
    view: cfg.view,
    className: 'panel-hud'
  });
  hudPanel.adopt(document.getElementById('viewer-hud'));

  const ledgerPanel = createPanel({
    id: 'ledger',
    title: '📜 ledger del Notario',
    collapsible: true,
    draggable: true,
    view: cfg.view,
    className: 'panel-ledger'
  });
  ledgerPanel.adopt(document.getElementById('view-log'));

  const ledger = createLogPanel('view-log');

  // ---- inspector de flujo y cantera (WP-25): click en un símbolo 3D ------
  const inspector = createInspector({
    stage,
    pickables: delta.pickables,
    scene: deltaV0,
    cfg
  });

  // ---- proyección de arg:state --------------------------------------------
  let lastStateAt = 0;
  let elapsed = 0;

  function onArgState(snap) {
    lastStateAt = performance.now();
    setText('hud-conn', 'connected');
    setText('hud-tick', snap.tick);
    delta.applySnapshot(snap);
    droplets.applySnapshot(snap);
    seaDroplets.applySnapshot(snap);
    actors.applySnapshot(snap);
    inspector.applySnapshot(snap);

    setText('hud-drops', droplets.count());
    for (const [id, tap] of Object.entries(snap.taps ?? {})) {
      const fieldId = id === 'grifo-a' ? 'hud-tap-a' : id === 'grifo-b' ? 'hud-tap-b' : null;
      if (fieldId) {
        setText(fieldId, `ap ${tap.aperture.toFixed(2)} · pr ${tap.pressure.toFixed(2)}${tap.state !== 'ok' ? ` · ${tap.state.toUpperCase()}` : ''}`);
      }
    }
    if (snap.sea) {
      setText('hud-sea', `${snap.sea.crystals} 💎 · murk ${snap.sea.murk}/${snap.sea.murkCapacity}${snap.sea.collapsed ? ' · COLAPSO' : ''}`);
    }
    if (snap.objetivo) {
      const [n, N] = snap.objetivo.labeled;
      const [m, M] = snap.objetivo.excavated;
      setText('hud-objetivo', `${n}/${N} etiquetadas · ${m}/${M} excavadas`);
    }
    setText('hud-actors', Object.keys(snap.actors ?? {}).length);
  }

  function onArgLedger(entry) {
    ledger.append({
      badge: `[${entry.kind}]`,
      color: LEDGER_COLORS[entry.kind] ?? '#d7fbe6',
      text: fmtLedger(entry)
    });
  }

  // ---- frame loop: dead reckoning entre snapshots ---------------------------
  stage.onFrame((rawDt) => {
    const dt = Math.min(rawDt, 0.1); // guard de pestaña oculta
    elapsed += dt;
    delta.update(dt, elapsed);
    droplets.update(dt);
    seaDroplets.update(dt, elapsed);
    actors.update(dt);
  });
  stage.start();

  // ---- room wiring (G-ARG.2: solo onChannelEvent) ---------------------------
  const room = connectRoom(cfg);
  setText('hud-conn', '…');
  onChannelEvent(room, EVENTS.STATE, onArgState);
  onChannelEvent(room, EVENTS.LEDGER, onArgLedger);

  // Watchdog: el silencio también es un mensaje.
  const watchdog = setInterval(() => {
    if (!lastStateAt || performance.now() - lastStateAt > 3000) {
      setText('hud-conn', 'silencio…');
    }
  }, 1000);

  window.addEventListener('beforeunload', () => {
    clearInterval(watchdog);
    room.disconnect();
    inspector.dispose();
    actors.dispose();
    droplets.dispose();
    seaDroplets.dispose();
    stage.dispose();
  });
}

main();

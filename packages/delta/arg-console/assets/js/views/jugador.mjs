/**
 * Vista "jugador" — la vista encarnada (UX.md §jugador).
 *
 * El mismo delta pero desde la perspectiva del actor (?actor=uno): cámara
 * chase suave detrás del monigote (Alt = inspección orbital libre), input
 * de teclado que SOLO emite arg:intent (la vista jamás muta local — P2), y
 * tres overlays DOM estética terminal: menú de contacto (grifo → tapSet;
 * actor → esqueleto de oferta HORSE, WP-11), panel de cloak (Q, WP-12) y
 * franja inferior de tracking (arg:track del propio actor).
 *
 * Controles: WASD/flechas mover · E río · 1..3 etiquetar · Espacio
 * contacto · Q cloak · X emote · Alt inspección.
 */

import * as THREE from 'three';
import { deltaV0, buildCanteraTopology, buildNavGraph } from '@zeus/arg-domain/scenes/delta-v0';
import { EVENTS, EMOTES, resolveTrackRef, buildTrackBrowserUrl } from '@zeus/arg-domain';
import {
  createViewerScene,
  setText,
  readViewerConfig,
  connectRoom,
  onChannelEvent,
  createActorsLayer,
  createPanel,
  createHorseClient,
  renderContactMenu,
  bindContactMenu,
  setContactLive,
  formatContactLive,
  renderCloakInventory,
  bindCloakInventory,
  fetchPresetSummaries
} from '@zeus/view-kit';
import {
  WEBRTC_REST_ACTIONS,
  resolveWebRtcRestActionBrowser
} from '@zeus/webrtc-viewer/game-actions';
import {
  createDeltaStage,
  createRiverDroplets,
  createSeaDroplets,
  createIntentClient,
  createInspector,
  isSyntheticUri,
  renderSeaActionPanel,
  bindSeaActionPanel
} from '../delta/index.mjs';

const CAMERA_OFFSET = { x: 0, y: 6, z: 9 };
const TRACK_MAX = 3;

function shortUri(uri, max = 34) {
  if (!uri) return '—';
  return uri.length <= max ? uri : `…${uri.slice(-max)}`;
}

function main() {
  const cfg = readViewerConfig();
  const actorId = cfg.actor || 'uno';
  setText('hud-room', cfg.room);
  setText('hud-actor', actorId);

  // Nav-graph completo (nodos ∪ cámaras) para elegir vecinos con WASD.
  // Importar la escena/topología NO es correr motores (G-ARG.1): la
  // autoridad sigue siendo la única verdad — aquí solo se eligen destinos.
  const topology = buildCanteraTopology(deltaV0.cantera);
  const nav = buildNavGraph(deltaV0, topology);

  const stage = createViewerScene({
    camera: { position: [0, 10, 14], far: 500 },
    controls: { minDistance: 3, maxDistance: 120, maxPolarAngle: Math.PI / 2.05 },
    fog: { near: 18, far: 130 } // lo lejano se atenúa, lo cercano se intensifica
  });
  const { scene, camera, controls } = stage;

  const world = new THREE.Group();
  scene.add(world);

  const delta = createDeltaStage(world, deltaV0);
  const droplets = createRiverDroplets(world, deltaV0);
  const seaDroplets = createSeaDroplets(world, deltaV0);
  const actors = createActorsLayer(world);

  // ---- room + intents --------------------------------------------------------
  const room = connectRoom(cfg, { user: `jugador-${actorId}` });
  setText('hud-conn', '…');
  const intents = createIntentClient(room, actorId);
  const horse = createHorseClient(room, actorId);
  let presetSummaries = [];

  async function loadPresets() {
    try {
      presetSummaries = await fetchPresetSummaries();
    } catch (err) {
      console.warn('[jugador] presets:', err);
      presetSummaries = [];
    }
  }

  function initialCloak() {
    const name = cfg.startPack?.[0];
    if (!name) return null;
    return { presetId: name, label: name };
  }

  room.getSocket().on('connect', async () => {
    await loadPresets();
    const cloak = initialCloak();
    intents.join(cloak ? { cloak } : {});
    if (cloak) {
      try {
        await horse.fetchAndBroadcastOffer(cloak.presetId);
      } catch (err) {
        console.warn('[jugador] oferta HORSE inicial:', err);
      }
    }
  });

  // ---- estado proyectado -------------------------------------------------------
  let lastSnap = null;
  let lastStateAt = 0;
  let elapsed = 0;
  const tracks = []; // últimas 3 arg:track propias

  function ownActor() {
    return lastSnap?.actors?.[actorId] ?? null;
  }

  /** Grifo más cercano al actor (por posición del snapshot). */
  function nearestTap(actor) {
    let best = null;
    let bestDist = Infinity;
    for (const tap of Object.values(deltaV0.taps)) {
      const p = deltaV0.nodos[tap.summitNodeId].position;
      const d = Math.hypot(p.x - actor.position.x, p.y - actor.position.y, p.z - actor.position.z);
      if (d < bestDist) { best = tap; bestDist = d; }
    }
    return { tap: best, dist: bestDist };
  }

  // ---- ventanitas (WP-24): HUD/leyenda, contacto, cloak, tracking ------------
  const hudPanel = createPanel({
    id: 'hud',
    title: `🚶 leyenda · ${actorId}`,
    collapsible: true,
    draggable: true,
    view: cfg.view,
    className: 'panel-hud'
  });
  hudPanel.adopt(document.getElementById('viewer-hud'));

  const contactPanel = createPanel({
    id: 'contact-menu',
    title: '🤝 contacto',
    collapsible: true,
    view: cfg.view,
    className: 'panel-contact'
  });
  contactPanel.el.hidden = true;
  const contactMenu = contactPanel.body;

  const cloakPanel = createPanel({
    id: 'cloak-panel',
    title: '🧥 cloak · inventario',
    collapsible: true,
    view: cfg.view,
    className: 'panel-cloak'
  });
  cloakPanel.el.hidden = true;

  const trackPanel = createPanel({
    id: 'track-panel',
    title: '⛓ tracking',
    collapsible: true,
    view: cfg.view,
    className: 'panel-track'
  });
  trackPanel.body.innerHTML = '<div class="track-lines">— aún sin pisar ningún recurso —</div>';

  const seaActionPanel = createPanel({
    id: 'sea-action',
    title: '🌊 gota del mar',
    collapsible: true,
    view: cfg.view,
    className: 'panel-sea-action'
  });
  seaActionPanel.el.hidden = true;

  let selectedSeaDroplet = null;

  function canSalvageSea() {
    const actor = ownActor();
    if (!actor) return false;
    if (actor.zone === 'mar') return true;
    return ['orilla-mar', 'boya-1', 'boya-2'].includes(actor.nodeId);
  }

  function openSeaAction(dropletId) {
    const tuples = lastSnap?.sea?.droplets ?? [];
    const tuple = tuples.find(([id]) => id === dropletId);
    if (!tuple) return;
    const [id, label, uri] = tuple;
    selectedSeaDroplet = { id, label, uri, state: label ? 'floating' : 'sunken' };
    seaActionPanel.body.innerHTML = renderSeaActionPanel({
      droplet: selectedSeaDroplet,
      labelset: deltaV0.labelset,
      canSalvage: canSalvageSea(),
      browsers: cfg.browsers,
      actor: actorId
    });
    bindSeaActionPanel(seaActionPanel.body, {
      onSalvage: (lbl) => intents.salvage(dropletId, lbl),
      onTrack: () => intents.trackCast(dropletId)
    });
    seaActionPanel.el.hidden = false;
    seaActionPanel.setCollapsed(false, { persist: false });
  }

  // ---- inspector de flujo y cantera (WP-25) ---------------------------------
  const inspector = createInspector({
    stage,
    pickables: delta.pickables,
    scene: deltaV0,
    cfg
  });

  let cloakOpen = false;

  async function renderCloakPanel() {
    if (!cloakOpen) { cloakPanel.el.hidden = true; return; }
    if (!presetSummaries.length) await loadPresets();
    const actor = ownActor();
    cloakPanel.body.innerHTML = renderCloakInventory({
      startPack: cfg.startPack ?? [],
      equipped: actor?.cloak ?? null,
      presets: presetSummaries
    });
    bindCloakInventory(cloakPanel.body, async (presetName) => {
      intents.cloakEquip(presetName, presetName);
      try {
        await horse.fetchAndBroadcastOffer(presetName);
      } catch (err) {
        console.warn('[jugador] rebroadcast cloak:', err);
      }
      renderCloakPanel();
    });
    cloakPanel.el.hidden = false;
  }

  let currentContactId = null;
  let currentContactPeer = null;
  let contactBound = false;

  function updateContactLive(text) {
    setContactLive(contactMenu, text);
  }

  function tapLiveLine(tapId) {
    const live = lastSnap?.taps?.[tapId] ?? { aperture: 0, pressure: 0, state: 'ok' };
    return `apertura ${Number(live.aperture).toFixed(2)} · presión ${Number(live.pressure).toFixed(2)}${live.state !== 'ok' ? ` · ${live.state.toUpperCase()}` : ''}`;
  }

  async function runHorseTool(peerId, name, args) {
    updateContactLive(`⏳ ${name}…`);
    try {
      const msg = await horse.horseRpc(peerId, 'tools/call', { name, arguments: args });
      updateContactLive(formatContactLive(msg));
      intents.emote('thumbsUp');
    } catch (err) {
      updateContactLive(formatContactLive(null, err));
    }
  }

  async function runHorsePrompt(peerId, name) {
    updateContactLive(`⏳ prompt ${name}…`);
    try {
      const msg = await horse.horseRpc(peerId, 'prompts/get', { name, arguments: {} });
      updateContactLive(formatContactLive(msg));
    } catch (err) {
      updateContactLive(formatContactLive(null, err));
    }
  }

  async function runHorseResource(peerId, uri) {
    updateContactLive(`⏳ read ${uri}…`);
    try {
      const msg = await horse.horseRpc(peerId, 'resources/read', { uri });
      updateContactLive(formatContactLive(msg));
    } catch (err) {
      updateContactLive(formatContactLive(null, err));
    }
  }

  async function runRestAction(actionId = 'list-presets') {
    updateContactLive(`⏳ REST ${actionId}…`);
    try {
      const webrtcUrl = resolveWebRtcRestActionBrowser(actionId, {
        webrtcViewerUrl: cfg.webrtcViewerUrl,
        room: cfg.room,
        peerId: currentContactPeer,
        userId: actorId,
        mode: 'room'
      });
      if (webrtcUrl) {
        updateContactLive(`WebRTC → ${webrtcUrl}`);
        // Opt-in browser open only when ZEUS_OPEN_BROWSER=1 (swarm policy).
        if (String(globalThis.__ZEUS_OPEN_BROWSER__ ?? '') === '1') {
          globalThis.open?.(webrtcUrl, '_blank', 'noopener');
        } else {
          const a = document.createElement('a');
          a.href = webrtcUrl;
          a.target = '_blank';
          a.rel = 'noopener';
          a.textContent = 'abrir visor WebRTC';
          const live = contactMenu.querySelector('#contact-live');
          if (live) {
            live.textContent = `WebRTC · ${actionId}: `;
            live.appendChild(a);
          }
        }
        return;
      }
      let url = '/api/mcp/presets';
      if (actionId === 'preset-aleph-tronco') url = '/api/mcp/preset/aleph-tronco-puro';
      const res = await fetch(url);
      const data = await res.json();
      updateContactLive(JSON.stringify(data, null, 2));
      if (data.success) intents.emote('thumbsUp');
    } catch (err) {
      updateContactLive(formatContactLive(null, err));
    }
  }

  function mountContactMenu(peerId, offer, liveText) {
    contactMenu.innerHTML = renderContactMenu(offer, {
      liveText,
      restActions: [
        { id: 'list-presets', label: 'REST · listar presets' },
        ...WEBRTC_REST_ACTIONS
      ]
    });
    bindContactMenu(contactMenu, {
      onPrompt: (name) => runHorsePrompt(peerId, name),
      onTool: (name, args) => runHorseTool(peerId, name, args),
      onResource: (_name, uri) => runHorseResource(peerId, uri),
      onRest: (id) => runRestAction(id || 'list-presets'),
      onClose: () => {
        if (currentContactId) intents.contactClose(currentContactId);
        contactPanel.el.hidden = true;
        contactBound = false;
        currentContactPeer = null;
      }
    });
    contactBound = true;
  }

  function renderContactMenuPanel() {
    const contacts = lastSnap?.contacts ?? {};
    let found = null;
    for (const [id, c] of Object.entries(contacts)) {
      if (c.state === 'open' && (c.a === actorId || c.b === actorId)) {
        found = { id, other: c.a === actorId ? c.b : c.a };
        break;
      }
    }
    if (!found) {
      currentContactId = null;
      currentContactPeer = null;
      contactBound = false;
      contactPanel.el.hidden = true;
      return;
    }

    const isNew = found.id !== currentContactId || found.other !== currentContactPeer;
    currentContactId = found.id;
    currentContactPeer = found.other;
    const tapDef = deltaV0.taps[found.other];
    const offer = horse.getOffer(found.other);
    const presetLabel = offer?._meta?.preset?.name ?? found.other;

    contactPanel.setTitle(tapDef ? `⚙ contacto · ${found.other}` : `🤝 contacto · ${found.other}`);

    if (isNew || !contactBound) {
      if (!offer) {
        contactMenu.innerHTML = [
          `<div class="contact-live" id="contact-live">esperando oferta HORSE de ${found.other}…</div>`,
          '<p class="overlay-muted">el peer debe estar en la room con HORSE activo</p>',
          '<button class="arg-btn arg-btn-close" data-close="1">cerrar contacto</button>'
        ].join('\n');
        contactMenu.querySelector('[data-close]')?.addEventListener('click', () => {
          intents.contactClose(found.id);
          contactPanel.el.hidden = true;
        });
        contactBound = false;
      } else {
        const liveText = tapDef ? tapLiveLine(found.other) : `oferta · ${presetLabel}`;
        mountContactMenu(found.other, offer, liveText);
      }
    } else if (tapDef) {
      updateContactLive(tapLiveLine(found.other));
    }

    contactPanel.el.hidden = false;
  }

  function renderTrackPanel() {
    const lines = tracks.map((t) => {
      const emoji = t.hint === 'firehose-browser' ? '🌊' : '🗿';
      // WP-26: deep-links honestos — un ref sintético no vive en disco, sin enlace
      const synthetic = isSyntheticUri(t.ref?.uri);
      const resolved = synthetic ? null : resolveTrackRef(t.ref);
      const href = resolved ? buildTrackBrowserUrl(resolved, cfg.browsers, { actor: actorId }) : null;
      const openBtn = href
        ? ` <a class="arg-btn arg-btn-link" href="${href}" target="_blank" rel="noopener">abrir en navegador</a>`
        : synthetic
          ? ' <span class="insp-synthetic">「sintético」</span>'
          : '';
      return `<div class="track-line">${emoji} ${t.zone} · ${t.ref?.kind ?? '?'} · ${shortUri(t.ref?.uri, 60)}${openBtn}</div>`;
    });
    trackPanel.body.innerHTML = `<div class="track-lines">${
      lines.length ? lines.join('') : '— aún sin pisar ningún recurso —'
    }</div>`;
  }

  // ---- HUD -----------------------------------------------------------------------
  function reflectHud() {
    const actor = ownActor();
    if (!actor) return;
    setText('hud-zone', actor.zone);
    setText('hud-pose', actor.pose + (actor.emote ? ` +${actor.emote}` : ''));
    setText('hud-score', `${actor.score?.labeled ?? 0} etiquetadas · ${actor.score?.excavated ?? 0} excavadas`);
    const { tap, dist } = nearestTap(actor);
    if (tap && lastSnap?.taps?.[tap.id]) {
      const live = lastSnap.taps[tap.id];
      setText('hud-tap', `${tap.id} (${dist.toFixed(1)}m) · ap ${live.aperture.toFixed(2)} · pr ${live.pressure.toFixed(2)}`);
    }
    const latest = tracks[0];
    setText('hud-droplet', actor.riding && latest ? shortUri(latest.ref?.uri) : latest ? shortUri(latest.ref?.uri) : '—');
  }

  // ---- eventos de room (G-ARG.2) ----------------------------------------------
  onChannelEvent(room, EVENTS.STATE, (snap) => {
    lastSnap = snap;
    lastStateAt = performance.now();
    setText('hud-conn', 'connected');
    delta.applySnapshot(snap);
    droplets.applySnapshot(snap);
    seaDroplets.applySnapshot(snap);
    actors.applySnapshot(snap);
    inspector.applySnapshot(snap);
    renderContactMenuPanel();
    if (cloakOpen) renderCloakPanel();
    reflectHud();
  });

  onChannelEvent(room, EVENTS.TRACK, (track) => {
    if (track?.actorId !== actorId) return;
    tracks.unshift(track);
    if (tracks.length > TRACK_MAX) tracks.pop();
    renderTrackPanel();
  });

  // ---- input de teclado (solo intents) -------------------------------------------
  const KEY_VECTORS = {
    KeyW: { x: 0, z: -1 }, ArrowUp: { x: 0, z: -1 },
    KeyS: { x: 0, z: 1 }, ArrowDown: { x: 0, z: 1 },
    KeyA: { x: -1, z: 0 }, ArrowLeft: { x: -1, z: 0 },
    KeyD: { x: 1, z: 0 }, ArrowRight: { x: 1, z: 0 }
  };

  /**
   * WASD → move: la tecla se interpreta relativa a la cámara y se elige el
   * vecino del nav-graph cuya dirección mejor alinee. Solo desde nodo (si
   * el actor va por enlace o río, se ignora).
   */
  function moveTowards(keyVec) {
    const actor = ownActor();
    if (!actor || !actor.nodeId || actor.riding || actor.linkId) return;
    const node = nav.nodos[actor.nodeId];
    if (!node) return;

    // base de cámara proyectada al plano XZ
    const fwd = new THREE.Vector3();
    camera.getWorldDirection(fwd);
    fwd.y = 0;
    if (fwd.lengthSq() < 1e-6) fwd.set(0, 0, -1);
    fwd.normalize();
    const right = new THREE.Vector3(fwd.z, 0, -fwd.x).negate(); // derecha de cámara
    const wish = new THREE.Vector3()
      .addScaledVector(fwd, -keyVec.z)
      .addScaledVector(right, keyVec.x);
    if (wish.lengthSq() < 1e-6) return;
    wish.normalize();

    // vecinos alcanzables desde el nodo actual
    let best = null;
    let bestDot = 0.25; // umbral: no ir a un vecino casi perpendicular
    for (const link of Object.values(nav.enlaces)) {
      let neighborId = null;
      if (link.from === actor.nodeId) neighborId = link.to;
      else if (link.to === actor.nodeId) neighborId = link.from;
      if (!neighborId) continue;
      const np = nav.nodos[neighborId].position;
      const dir = new THREE.Vector3(np.x - node.position.x, 0, np.z - node.position.z);
      if (dir.lengthSq() < 1e-6) continue;
      dir.normalize();
      const dot = dir.dot(wish);
      if (dot > bestDot) {
        bestDot = dot;
        best = neighborId;
      }
    }
    if (best) intents.move(best);
  }

  /** E: ride en embarcadero / dismount montado. Nada más en v0. */
  function handleUse() {
    const actor = ownActor();
    if (!actor) return;
    if (actor.riding) {
      intents.dismount();
      return;
    }
    if (actor.nodeId) {
      for (const rio of Object.values(deltaV0.rios)) {
        if (rio.embarkNodeId === actor.nodeId) {
          intents.ride(rio.id);
          return;
        }
      }
    }
  }

  /** Espacio: contact:request al contactable más próximo (≤ contactRadius). */
  function handleContact() {
    const actor = ownActor();
    if (!actor) return;
    const me = actor.position;
    let best = null;
    let bestDist = deltaV0.contactRadius;

    for (const [id, other] of Object.entries(lastSnap?.actors ?? {})) {
      if (id === actorId) continue;
      const d = Math.hypot(other.position.x - me.x, other.position.y - me.y, other.position.z - me.z);
      if (d <= bestDist) { best = id; bestDist = d; }
    }
    for (const tap of Object.values(deltaV0.taps)) {
      const p = deltaV0.nodos[tap.summitNodeId].position;
      const d = Math.hypot(p.x - me.x, p.y - me.y, p.z - me.z);
      if (d <= bestDist) { best = tap.id; bestDist = d; }
    }
    if (best) intents.contactRequest(best);
  }

  let emoteIndex = 0;
  let inspecting = false;

  window.addEventListener('keydown', (ev) => {
    if (ev.repeat) return;
    if (ev.altKey || ev.code === 'AltLeft' || ev.code === 'AltRight') {
      inspecting = true;
      if (ev.code.startsWith('Alt')) ev.preventDefault();
    }

    if (KEY_VECTORS[ev.code]) {
      moveTowards(KEY_VECTORS[ev.code]);
      return;
    }
    switch (ev.code) {
      case 'KeyE':
        handleUse();
        break;
      case 'Space':
        ev.preventDefault();
        handleContact();
        break;
      case 'KeyX':
        intents.emote(EMOTES[emoteIndex % EMOTES.length]);
        emoteIndex += 1;
        break;
      case 'KeyQ':
        cloakOpen = !cloakOpen;
        if (cloakOpen) {
          loadPresets().then(() => renderCloakPanel());
        } else {
          renderCloakPanel();
        }
        break;
      case 'Digit1':
      case 'Digit2':
      case 'Digit3': {
        const n = Number(ev.code.slice(-1));
        const label = deltaV0.labelset[n - 1];
        if (label) intents.labelCast(label);
        break;
      }
      default:
        break;
    }
  });

  window.addEventListener('keyup', (ev) => {
    if (ev.code === 'AltLeft' || ev.code === 'AltRight') {
      inspecting = false;
      ev.preventDefault();
    }
  });

  const seaRaycaster = new THREE.Raycaster();
  const seaNdc = new THREE.Vector2();
  const stageHost = document.getElementById('viewer-stage');
  stageHost?.addEventListener('click', (ev) => {
    if (ev.target !== stageHost.querySelector('canvas')) return;
    const rect = ev.target.getBoundingClientRect();
    seaNdc.set(
      ((ev.clientX - rect.left) / rect.width) * 2 - 1,
      -((ev.clientY - rect.top) / rect.height) * 2 + 1
    );
    seaRaycaster.setFromCamera(seaNdc, camera);
    const hits = seaRaycaster.intersectObject(seaDroplets.mesh, false);
    if (hits[0]) {
      const pick = seaDroplets.resolvePick(hits[0]);
      if (pick?.kind === 'seaDroplet') openSeaAction(pick.id);
    }
  });

  // ---- cámara chase ----------------------------------------------------------------
  const lookTarget = new THREE.Vector3();

  function chaseCamera(dt) {
    const pos = actors.getPosition(actorId);
    if (!pos) return;
    if (inspecting) {
      // Alt: OrbitControls libre alrededor del actor
      controls.enabled = true;
      controls.target.lerp(new THREE.Vector3(pos.x, pos.y + 1, pos.z), Math.min(1, dt * 5));
      return;
    }
    controls.enabled = false;
    const k = 1 - Math.exp(-dt * 4);
    camera.position.lerp(
      new THREE.Vector3(pos.x + CAMERA_OFFSET.x, pos.y + CAMERA_OFFSET.y, pos.z + CAMERA_OFFSET.z),
      k
    );
    lookTarget.lerp(new THREE.Vector3(pos.x, pos.y + 1, pos.z), Math.min(1, dt * 6));
    camera.lookAt(lookTarget);
    controls.target.copy(lookTarget); // que Alt arranque orbitando donde mirábamos
  }

  // ---- frame loop --------------------------------------------------------------------
  stage.onFrame((rawDt) => {
    const dt = Math.min(rawDt, 0.1);
    elapsed += dt;
    delta.update(dt, elapsed);
    droplets.update(dt);
    seaDroplets.update(dt, elapsed);
    actors.update(dt);
    chaseCamera(dt);
  });
  stage.start();

  // Watchdog de silencio (3 s sin arg:state).
  const watchdog = setInterval(() => {
    if (!lastStateAt || performance.now() - lastStateAt > 3000) {
      setText('hud-conn', 'silencio…');
    }
  }, 1000);

  window.addEventListener('beforeunload', () => {
    clearInterval(watchdog);
    horse.dispose();
    room.disconnect();
    inspector.dispose();
    actors.dispose();
    droplets.dispose();
    seaDroplets.dispose();
    stage.dispose();
  });
}

main();

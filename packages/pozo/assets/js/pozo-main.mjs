/**
 * Browser entry: vista mínima pozo sobre @zeus/view-kit.
 */

import {
  createViewerScene,
  readViewerConfig,
  connectRoom,
  onChannelEvent,
  setText
} from '@zeus/view-kit';
import * as THREE from 'three';

const cfg = readViewerConfig();
const room = connectRoom(cfg, { user: cfg.actor || 'view-pozo' });
const { scene, start } = createViewerScene({ background: 0x0a1218 });

const nodeMeshes = new Map();
const actorMeshes = new Map();
let wellMesh = null;

function ensureWell() {
  if (wellMesh) return wellMesh;
  const group = new THREE.Group();
  const rim = new THREE.Mesh(
    new THREE.TorusGeometry(1.2, 0.18, 12, 32),
    new THREE.MeshStandardMaterial({ color: 0x6b7c8a, roughness: 0.4 })
  );
  rim.rotation.x = Math.PI / 2;
  rim.position.y = 0.35;
  const water = new THREE.Mesh(
    new THREE.CylinderGeometry(1.0, 1.0, 0.2, 24),
    new THREE.MeshStandardMaterial({
      color: 0x2a6f8f,
      transparent: true,
      opacity: 0.85
    })
  );
  water.position.y = 0.15;
  group.add(rim, water);
  group.userData.water = water;
  scene.add(group);
  wellMesh = group;
  return group;
}

function syncNodes(nodes) {
  if (!nodes) return;
  for (const node of Object.values(nodes)) {
    let mesh = nodeMeshes.get(node.id);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.35, 0.4, 0.25, 12),
        new THREE.MeshStandardMaterial({ color: node.id === 'brocal' ? 0x8a9aaa : 0x4a5560 })
      );
      mesh.position.set(...(node.pos || [0, 0, 0]));
      scene.add(mesh);
      nodeMeshes.set(node.id, mesh);
    }
  }
}

function syncActors(actors) {
  const ids = new Set(Object.keys(actors || {}));
  for (const [id, mesh] of actorMeshes) {
    if (!ids.has(id)) {
      scene.remove(mesh);
      actorMeshes.delete(id);
    }
  }
  for (const [id, actor] of Object.entries(actors || {})) {
    let mesh = actorMeshes.get(id);
    if (!mesh) {
      mesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.28, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xe8c07a })
      );
      scene.add(mesh);
      actorMeshes.set(id, mesh);
    }
    const node = nodeMeshes.get(actor.nodeId);
    if (node) {
      mesh.position.copy(node.position);
      mesh.position.y += 0.55;
    }
  }
}

function onState(snap) {
  if (snap?.game && snap.game !== 'pozo') return;
  ensureWell();
  syncNodes(snap.nodes);
  syncActors(snap.actors);

  const level = snap.well?.level ?? 0;
  const cap = snap.well?.capacity ?? 8;
  setText('hud-well', `${level}/${cap}`);
  const drop = snap.well?.lastDrop;
  setText('hud-drop', drop ? `${drop.label} (${drop.actorId})` : '—');
  setText('hud-actors', String(Object.keys(snap.actors || {}).length));
  const lines = snap.feed?.lines;
  setText('hud-feed', Array.isArray(lines) ? lines.slice(0, 3).join(' · ') : '—');

  if (wellMesh?.userData?.water) {
    const t = Math.max(0.05, level / Math.max(1, cap));
    wellMesh.userData.water.scale.y = t;
    wellMesh.userData.water.position.y = 0.05 + t * 0.1;
  }
}

onChannelEvent(room, 'state', onState);
ensureWell();
start();

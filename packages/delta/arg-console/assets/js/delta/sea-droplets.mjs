/**
 * Gotas del mar como InstancedMesh — posiciones de seaLayout (WP-30).
 * Raycast instanceId → dropletId vía mapa interno; pickable expone
 * userData = { kind:'seaDroplet', id }.
 */

import * as THREE from 'three';
import { seaLayout } from '@zeus/arg-domain';

const COLOR_FLOAT = new THREE.Color(0xb8fbff);
const COLOR_SUNKEN = new THREE.Color(0x446688);

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/**
 * @param {THREE.Object3D} parent
 * @param {object} deltaScene deltaV0
 * @param {object} [opts]
 */
export function createSeaDroplets(parent, deltaScene, opts = {}) {
  const max = opts.max ?? 160;
  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.16, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 }),
    max
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  parent.add(mesh);

  const dummy = new THREE.Object3D();
  /** instanceId → dropletId */
  const instanceMap = [];
  let droplets = [];
  let salvageFlash = new Map();

  function dropletsFromSnap(snap) {
    const tuples = snap?.sea?.droplets ?? [];
    return tuples.map(([id, label, uri, seq]) => ({
      id,
      label: label ?? null,
      uri: uri ?? null,
      seq: seq ?? 0,
      state: label ? 'floating' : 'sunken'
    }));
  }

  return {
    mesh,
    pickables: [mesh],

    count: () => droplets.length,

    applySnapshot(snap) {
      const prev = new Map(droplets.map((d) => [d.id, d]));
      droplets = dropletsFromSnap(snap);
      for (const d of droplets) {
        const was = prev.get(d.id);
        if (was?.state === 'sunken' && d.state === 'floating') {
          salvageFlash.set(d.id, 1.2);
        }
      }
    },

    update(dt, elapsed = 0) {
      const { positions } = seaLayout(droplets, deltaScene.mar);
      let i = 0;
      instanceMap.length = 0;
      for (const d of droplets) {
        if (i >= max) break;
        const pos = positions[d.id];
        if (!pos) continue;
        const phase = hashId(d.id) * 0.017;
        const bob = d.state === 'floating' ? Math.sin(elapsed * 2.2 + phase) * 0.12 : 0;
        const flash = salvageFlash.get(d.id) ?? 0;
        if (flash > 0) salvageFlash.set(d.id, Math.max(0, flash - dt));
        const rise = flash > 0 ? (1.2 - flash) * 0.8 : 0;
        dummy.position.set(pos.x, pos.y + bob + rise, pos.z);
        if (d.state === 'floating') {
          dummy.scale.setScalar(1.4);
          dummy.rotation.y = elapsed * 1.5 + phase;
          mesh.setColorAt(i, COLOR_FLOAT);
        } else {
          dummy.scale.setScalar(0.85);
          dummy.rotation.set(0, 0, 0);
          mesh.setColorAt(i, COLOR_SUNKEN);
        }
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        instanceMap[i] = d.id;
        i += 1;
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },

  /** Resuelve hit de raycast sobre el InstancedMesh. */
    resolvePick(intersect) {
      if (!intersect || intersect.instanceId == null) return null;
      const id = instanceMap[intersect.instanceId];
      return id ? { kind: 'seaDroplet', id } : null;
    },

    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  };
}

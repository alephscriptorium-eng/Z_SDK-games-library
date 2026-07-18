/**
 * Gotas de río como InstancedMesh (icosaedro pequeño) con dead reckoning:
 * entre snapshots (10 Hz) cada gota sigue avanzando a
 * flowSpeed * max(0.25, apertura) / distancia por segundo, así el cauce se
 * lee continuo a frame rate. Color por estado: flowing azul tenue, crystal
 * (etiquetada) brillante facetado, spill rojo cayendo fuera del cauce.
 */

import * as THREE from 'three';
import { sampleLink, linkDistance } from '@zeus/game-engine';

const RESIDUAL_FLOW = 0.25; // espejo del flow-engine: el cauce nunca se para

const COLOR_FLOWING = new THREE.Color(0x2a6fd6);
const COLOR_CRYSTAL = new THREE.Color(0xb8fbff);
const COLOR_SPILL = new THREE.Color(0xff3344);

/**
 * @param {THREE.Object3D} parent grupo/escena donde montar
 * @param {object} deltaScene escena pura (deltaV0) — waypoints y flowSpeed
 * @param {object} [opts]
 * @param {number} [opts.max] máximo de instancias
 */
export function createRiverDroplets(parent, deltaScene, opts = {}) {
  const max = opts.max ?? 256;

  const rivers = {};
  for (const rio of Object.values(deltaScene.rios)) {
    rivers[rio.id] = {
      waypoints: rio.waypoints,
      distance: linkDistance(rio.waypoints) || 1,
      flowSpeed: rio.flowSpeed,
      tapId: rio.tapId
    };
  }

  const mesh = new THREE.InstancedMesh(
    new THREE.IcosahedronGeometry(0.13, 0),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 }),
    max
  );
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.count = 0;
  parent.add(mesh);

  const dummy = new THREE.Object3D();

  /** id → { riverId, progress, state, spillFall } */
  let droplets = new Map();
  /** tapId → aperture (para la velocidad de dead reckoning) */
  let apertures = {};

  return {
    mesh,

    /** Nº de gotas vivas (HUD «gotas en vuelo»). */
    count: () => droplets.size,

    /**
     * @param {object} snap arg:state — rivers compactos [[id,progress,state,label]]
     */
    applySnapshot(snap) {
      if (snap.taps) {
        apertures = {};
        for (const [id, tap] of Object.entries(snap.taps)) apertures[id] = tap.aperture ?? 0;
      }
      if (!snap.rivers) return;
      const next = new Map();
      for (const [riverId, river] of Object.entries(snap.rivers)) {
        for (const [id, progress, state] of river.droplets ?? []) {
          const prev = droplets.get(id);
          next.set(id, {
            riverId,
            // la autoridad manda: su progress pisa el local (dead reckoning solo rellena huecos)
            progress,
            state,
            spillFall: prev?.spillFall ?? 0
          });
        }
      }
      droplets = next;
    },

    /** Dead reckoning + volcado de matrices/colores instanciados. */
    update(dt) {
      let i = 0;
      for (const droplet of droplets.values()) {
        const river = rivers[droplet.riverId];
        if (!river || i >= max) continue;
        const aperture = apertures[river.tapId] ?? 0;
        const speed = river.flowSpeed * Math.max(RESIDUAL_FLOW, aperture);
        droplet.progress = Math.min(1, droplet.progress + (speed * dt) / river.distance);

        const pos = sampleLink(river.waypoints, droplet.progress);
        dummy.position.set(pos.x, pos.y + 0.25, pos.z);
        dummy.rotation.set(0, 0, 0);
        dummy.scale.setScalar(1);

        if (droplet.state === 'crystal') {
          // cristal facetado: más grande y girando para que refracte el wireframe
          dummy.scale.setScalar(1.5);
          dummy.rotation.y = droplet.progress * 14;
          dummy.rotation.x = droplet.progress * 6;
          mesh.setColorAt(i, COLOR_CRYSTAL);
        } else if (droplet.state === 'spill') {
          // salpicadura: cae fuera del cauce
          droplet.spillFall += dt * 1.6;
          dummy.position.y = Math.max(0.05, dummy.position.y - droplet.spillFall);
          dummy.position.x += Math.sin(droplet.spillFall * 3) * 0.3;
          mesh.setColorAt(i, COLOR_SPILL);
        } else {
          mesh.setColorAt(i, COLOR_FLOWING);
        }

        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        i += 1;
      }
      mesh.count = i;
      mesh.instanceMatrix.needsUpdate = true;
      if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    },

    dispose() {
      mesh.removeFromParent();
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  };
}

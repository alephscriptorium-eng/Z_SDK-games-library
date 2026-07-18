/**
 * Delta-stage — la escena estática del delta construida desde los datos
 * puros de `deltaV0` (@zeus/arg-domain): plataformas por nodo, pasarelas por
 * enlace, cimas con grifo (válvula + manómetro), cauces de río, mar ondulado
 * que se enturbia con el murk, islas de cristal y la cantera (cámaras +
 * pasillos con ciclo ghost/digging/open).
 *
 * Solo proyecta snapshots (applySnapshot) y anima cosmética (update):
 * jamás corre motores del dominio (G-ARG.1).
 */

import * as THREE from 'three';
import { buildCanteraTopology } from '@zeus/arg-domain/scenes/delta-v0';
import { createLabelSprite } from '@zeus/view-kit';

const ZONE_COLORS = {
  terraza: 0x00ff88,
  cima: 0x00d4ff,
  mar: 0x4488ff,
  cantera: 0xffb347,
  rio: 0x3a86ff
};

const AGUA = 0x2266cc;
const CIAN = 0x00d4ff;
const AMBAR = 0xffb347;
const GRIS = 0x6a6f7a;
const ROJO = 0xff3344;

function lineFromPoints(points, material) {
  const geometry = new THREE.BufferGeometry().setFromPoints(
    points.map((p) => new THREE.Vector3(p.x, p.y, p.z))
  );
  return new THREE.Line(geometry, material);
}

/**
 * @param {object} scene3d objeto escena three (o grupo) donde montar
 * @param {object} deltaScene escena pura del dominio (deltaV0)
 * @returns {{ group: THREE.Group, applySnapshot(snap): void, update(dt:number, elapsed:number): void }}
 */
export function createDeltaStage(scene3d, deltaScene) {
  const group = new THREE.Group();
  group.name = 'delta-stage';
  scene3d.add(group);

  /** Símbolos clickables para el inspector (WP-25): userData = { kind, id }. */
  const pickables = [];

  // ---- plataformas por nodo (wireframe, color por zone) -------------------
  for (const nodo of Object.values(deltaScene.nodos)) {
    const color = ZONE_COLORS[nodo.zone] ?? CIAN;
    const radius = nodo.zone === 'cima' ? 1.7 : nodo.zone === 'mar' ? 0.9 : 1.4;
    const disc = new THREE.Mesh(
      new THREE.CylinderGeometry(radius, radius * 1.1, 0.25, 12),
      new THREE.MeshBasicMaterial({ color, wireframe: true, transparent: true, opacity: 0.55 })
    );
    disc.position.set(nodo.position.x, nodo.position.y - 0.12, nodo.position.z);
    group.add(disc);

    const label = createLabelSprite(nodo.nombre ?? nodo.id, { color: '#9fd8c8', size: 2.6 });
    label.position.set(nodo.position.x, nodo.position.y + 1.9, nodo.position.z);
    group.add(label);
  }

  // ---- pasarelas por enlace (waypoints; medium 'agua' en azul) -------------
  for (const enlace of Object.values(deltaScene.enlaces)) {
    const esAgua = enlace.medium === 'agua';
    const material = new THREE.LineBasicMaterial({
      color: esAgua ? AGUA : 0x3fae6a,
      transparent: true,
      opacity: esAgua ? 0.5 : 0.6
    });
    group.add(lineFromPoints(enlace.waypoints, material));
  }

  // ---- cimas: grifo (válvula toro + aguja) y manómetro ---------------------
  const tapVisuals = {}; // tapId → { needle, barra, barraMat, target }
  for (const tap of Object.values(deltaScene.taps)) {
    const summit = deltaScene.nodos[tap.summitNodeId].position;
    const tapGroup = new THREE.Group();
    tapGroup.position.set(summit.x, summit.y + 0.9, summit.z);
    tapGroup.userData = { kind: 'tap', id: tap.id };
    group.add(tapGroup);
    pickables.push(tapGroup);

    // válvula: toro horizontal + aguja que rota con la apertura
    const valve = new THREE.Mesh(
      new THREE.TorusGeometry(0.42, 0.05, 6, 18),
      new THREE.MeshBasicMaterial({ color: CIAN, wireframe: true })
    );
    valve.rotation.x = Math.PI / 2;
    tapGroup.add(valve);

    const needle = new THREE.Group();
    const needleGeom = new THREE.BoxGeometry(0.06, 0.05, 0.44);
    needleGeom.translate(0, 0, 0.22);
    needle.add(new THREE.Mesh(needleGeom, new THREE.MeshBasicMaterial({ color: 0xeaffef })));
    tapGroup.add(needle);

    // manómetro: marco vertical + barra que sube con la presión
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.3, 0.22),
      new THREE.MeshBasicMaterial({ color: GRIS, wireframe: true, transparent: true, opacity: 0.6 })
    );
    frame.position.set(0.85, 0.55, 0);
    tapGroup.add(frame);

    const barraMat = new THREE.MeshBasicMaterial({ color: 0x00ff88 });
    const barraGeom = new THREE.BoxGeometry(0.13, 1, 0.13);
    barraGeom.translate(0, 0.5, 0); // crece desde la base
    const barra = new THREE.Mesh(barraGeom, barraMat);
    barra.position.set(0.85, -0.1, 0);
    barra.scale.y = 0.001;
    tapGroup.add(barra);

    const label = createLabelSprite(`⚙ ${tap.id}`, { color: '#00d4ff', size: 2.2 });
    label.position.y = 1.9;
    tapGroup.add(label);

    tapVisuals[tap.id] = { needle, barra, barraMat, aperture: 0, pressure: 0, state: 'ok' };
  }

  // ---- cauces de río (línea sutil por waypoints) ----------------------------
  for (const rio of Object.values(deltaScene.rios)) {
    const curve = new THREE.CatmullRomCurve3(
      rio.waypoints.map((p) => new THREE.Vector3(p.x, p.y, p.z))
    );
    const tube = new THREE.Mesh(
      new THREE.TubeGeometry(curve, 40, 0.28, 5, false),
      new THREE.MeshBasicMaterial({ color: AGUA, wireframe: true, transparent: true, opacity: 0.14 })
    );
    tube.userData = { kind: 'river', id: rio.id };
    group.add(tube);
    pickables.push(tube);
  }

  // ---- mar: plano wireframe ondulado + islas de cristal ---------------------
  const marBounds = deltaScene.mar?.bounds ?? { center: { x: 0, y: 0, z: 19 }, width: 46, depth: 26 };
  const seaWidth = marBounds.width ?? 46;
  const seaDepth = marBounds.depth ?? 26;
  const seaCenter = marBounds.center ?? { x: 0, y: 0, z: 19 };
  const seaGeom = new THREE.PlaneGeometry(seaWidth, seaDepth, 26, 15);
  seaGeom.rotateX(-Math.PI / 2);
  const seaBase = seaGeom.attributes.position.array.slice(); // posiciones en reposo
  const seaMat = new THREE.MeshBasicMaterial({
    color: AGUA,
    wireframe: true,
    transparent: true,
    opacity: 0.35
  });
  const sea = new THREE.Mesh(seaGeom, seaMat);
  sea.position.set(seaCenter.x, seaCenter.y, seaCenter.z);
  sea.userData = { kind: 'sea', id: 'mar' };
  group.add(sea);
  pickables.push(sea);

  const ISLAS = [{ x: -4, z: 17 }, { x: 3, z: 20 }, { x: 0, z: 14 }];
  const islands = ISLAS.map((pos) => {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.7, 1.4, 6),
      new THREE.MeshBasicMaterial({ color: 0x9ff7ff, wireframe: true, transparent: true, opacity: 0.9 })
    );
    cone.position.set(pos.x, 0.2, pos.z);
    cone.scale.setScalar(0.001);
    cone.visible = false;
    group.add(cone);
    return cone;
  });

  // ---- cantera: cámaras (cajas) + pasillos (líneas con estado) --------------
  const topology = buildCanteraTopology(deltaScene.cantera);

  const chamberVisuals = {}; // id → { mesh, mat }
  for (const chamber of Object.values(topology.chambers)) {
    const mat = new THREE.MeshBasicMaterial({
      color: GRIS,
      wireframe: true,
      transparent: true,
      opacity: 0.22
    });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.6, 1.6, 1.6), mat);
    box.position.set(chamber.position.x, chamber.position.y + 0.5, chamber.position.z);
    box.userData = { kind: 'chamber', id: chamber.id };
    group.add(box);
    pickables.push(box);
    chamberVisuals[chamber.id] = { mesh: box, mat, state: 'ghost' };
  }

  const corridorVisuals = {}; // id → { line, mats, state }
  for (const corridor of Object.values(topology.corridors)) {
    const a = topology.chambers[corridor.a].position;
    const b = topology.chambers[corridor.b].position;
    const points = [
      new THREE.Vector3(a.x, a.y + 0.5, a.z),
      new THREE.Vector3(b.x, b.y + 0.5, b.z)
    ];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const mats = {
      // fantasma: discontinua gris · digging: pulso ámbar · open: sólida cian
      ghost: new THREE.LineDashedMaterial({ color: GRIS, dashSize: 0.3, gapSize: 0.25, transparent: true, opacity: 0.45 }),
      digging: new THREE.LineBasicMaterial({ color: AMBAR, transparent: true, opacity: 0.9 }),
      open: new THREE.LineBasicMaterial({ color: CIAN, transparent: true, opacity: 0.9 })
    };
    const line = new THREE.Line(geometry, mats.ghost);
    line.computeLineDistances(); // requerido por el material discontinuo
    group.add(line);
    corridorVisuals[corridor.id] = { line, mats, state: 'ghost' };
  }

  // marco de la cantera
  const canteraLabel = createLabelSprite('⛏ LA CANTERA', { color: '#ffb347', size: 3.4 });
  const c0 = topology.chambers[Object.keys(topology.chambers)[0]].position;
  canteraLabel.position.set(
    deltaScene.cantera.origin.x + ((deltaScene.cantera.cols - 1) * deltaScene.cantera.spacing) / 2,
    c0.y + 3.2,
    deltaScene.cantera.origin.z - 2
  );
  group.add(canteraLabel);

  // ---- estado proyectado -----------------------------------------------------
  let seaState = { crystals: 0, murk: 0, murkCapacity: deltaScene.mar.murkCapacity, collapsed: false };
  const aguaColor = new THREE.Color(AGUA);
  const murkColor = new THREE.Color(0x7a4630); // marrón turbio

  return {
    group,
    pickables,

    /** Proyecta un snapshot arg:state sobre la escena estática. */
    applySnapshot(snap) {
      if (snap.taps) {
        for (const [id, tap] of Object.entries(snap.taps)) {
          const visual = tapVisuals[id];
          if (!visual) continue;
          visual.aperture = tap.aperture ?? 0;
          visual.pressure = tap.pressure ?? 0;
          visual.state = tap.state ?? 'ok';
        }
      }
      if (snap.sea) seaState = { ...seaState, ...snap.sea };
      // maze: rev + full si viene; con solo {rev} se conserva lo último visto
      if (snap.maze?.chambers) {
        for (const [id, chamber] of Object.entries(snap.maze.chambers)) {
          const visual = chamberVisuals[id];
          if (visual) visual.state = chamber.state;
        }
      }
      if (snap.maze?.corridors) {
        for (const [id, corridor] of Object.entries(snap.maze.corridors)) {
          const visual = corridorVisuals[id];
          if (visual) visual.state = corridor.state;
        }
      }
    },

    /** Cosmética por frame: olas, aguja, manómetro, pulso de excavación. */
    update(dt, elapsed) {
      // grifos: aguja hacia la apertura; manómetro sube y parpadea cerca de 1
      for (const visual of Object.values(tapVisuals)) {
        const targetAngle = visual.aperture * Math.PI * 1.5;
        visual.needle.rotation.y += (targetAngle - visual.needle.rotation.y) * Math.min(1, dt * 6);
        visual.barra.scale.y = Math.max(0.001, visual.pressure);
        if (visual.state === 'burst') {
          visual.barraMat.color.setHex(Math.sin(elapsed * 18) > 0 ? ROJO : 0x550000);
        } else if (visual.pressure > 0.85) {
          visual.barraMat.color.setHex(Math.sin(elapsed * 10) > 0 ? ROJO : 0xffaa00);
        } else if (visual.pressure > 0.6) {
          visual.barraMat.color.setHex(0xffaa00);
        } else {
          visual.barraMat.color.setHex(0x00ff88);
        }
      }

      // mar: ondulación de vértices + turbidez por murk; colapso = sube y traga
      const positions = seaGeom.attributes.position;
      for (let i = 0; i < positions.count; i += 1) {
        const x = seaBase[i * 3];
        const z = seaBase[i * 3 + 2];
        positions.setY(i, Math.sin(x * 0.35 + elapsed * 1.1) * 0.16 + Math.cos(z * 0.45 + elapsed * 0.8) * 0.14);
      }
      positions.needsUpdate = true;

      const murkRatio = Math.min(1, seaState.murkCapacity ? seaState.murk / seaState.murkCapacity : 0);
      seaMat.color.copy(aguaColor).lerp(murkColor, murkRatio);
      seaMat.opacity = 0.35 + 0.4 * murkRatio;
      if (seaState.collapsed) {
        sea.position.y = Math.min(3.2, sea.position.y + dt * 0.35); // el mar traga terrazas
        seaMat.opacity = 0.85;
      }

      // islas de cristal crecen con crystals
      const growth = Math.min(1.6, seaState.crystals * 0.06);
      islands.forEach((cone, i) => {
        const s = Math.max(0, growth - i * 0.25);
        cone.visible = s > 0.01;
        cone.scale.setScalar(Math.max(0.001, s));
      });

      // cantera: materiales por estado + pulso ámbar del digging
      for (const visual of Object.values(chamberVisuals)) {
        if (visual.state === 'cached') {
          visual.mat.color.setHex(CIAN);
          visual.mat.opacity = 0.85;
        } else {
          visual.mat.color.setHex(GRIS);
          visual.mat.opacity = 0.22;
        }
      }
      for (const visual of Object.values(corridorVisuals)) {
        const mat = visual.mats[visual.state] ?? visual.mats.ghost;
        if (visual.line.material !== mat) visual.line.material = mat;
        if (visual.state === 'digging') {
          mat.opacity = 0.45 + 0.45 * Math.abs(Math.sin(elapsed * 6));
        }
      }
    }
  };
}

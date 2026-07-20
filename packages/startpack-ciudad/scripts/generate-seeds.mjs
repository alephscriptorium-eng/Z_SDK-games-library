#!/usr/bin/env node
/**
 * Build-time generator: ciudad-source → seeds/gamemap.json
 * Does not read cantera at runtime; source is embedded in ciudad-source.mjs.
 */
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { BARRIOS, CALLES, DISTRITOS, GOBIERNO } from './ciudad-source.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT = join(ROOT, 'seeds', 'gamemap.json');

const NODE_LAYOUT = {
  plaza: { x: 0, y: 0, z: 0 },
  zigurat: { x: 12, y: 0, z: 0 },
  editores: { x: 24, y: 0, z: -12 },
  'red-stream': { x: 24, y: 0, z: -4 },
  'runtime-mcp': { x: 24, y: 0, z: 4 },
  'lore-voz': { x: 24, y: 0, z: 12 },
  'infra-ui': { x: 24, y: 0, z: 20 }
};

function nodeEntry(id) {
  const p = NODE_LAYOUT[id] || { x: 0, y: 0, z: 0 };
  return { ...p, facing: 0 };
}

function buildNodos() {
  /** @type {Record<string, object>} */
  const nodos = {};

  for (const g of GOBIERNO) {
    const barrioIds = BARRIOS.filter((b) => b.distrito === g.id).map(
      (b) => `ancla-${b.id}`
    );
    const enlaces = CALLES.filter((c) => c.from === g.id || c.to === g.id).map(
      (c) => c.id
    );
    nodos[g.id] = {
      id: g.id,
      displayName: g.displayName,
      role: g.role,
      kind: 'gobierno',
      entrada: nodeEntry(g.id),
      anclas: barrioIds,
      enlaces
    };
  }

  for (const d of DISTRITOS) {
    if (nodos[d.id]) {
      // zigurat already created as gobierno; enrich zone meta
      nodos[d.id].zone = d.id;
      nodos[d.id].kind = 'gobierno-zona';
      continue;
    }
    const barrioIds = BARRIOS.filter((b) => b.distrito === d.id).map(
      (b) => `ancla-${b.id}`
    );
    const enlaces = CALLES.filter((c) => c.from === d.id || c.to === d.id).map(
      (c) => c.id
    );
    nodos[d.id] = {
      id: d.id,
      displayName: d.displayName,
      role: d.role,
      kind: 'zona',
      zone: d.id,
      entrada: nodeEntry(d.id),
      anclas: barrioIds,
      enlaces
    };
  }

  return nodos;
}

function buildEnlaces() {
  /** @type {Record<string, object>} */
  const enlaces = {};
  for (const c of CALLES) {
    const fromPos = NODE_LAYOUT[c.from] || { x: 0, y: 0, z: 0 };
    const toPos = NODE_LAYOUT[c.to] || { x: 0, y: 0, z: 0 };
    enlaces[c.id] = {
      id: c.id,
      displayName: c.displayName,
      dry: c.dry,
      from: c.from,
      to: c.to,
      bidirectional: true,
      walkSpeed: 1.4,
      waypoints: [
        { ...fromPos },
        {
          x: (fromPos.x + toPos.x) / 2,
          y: 0,
          z: (fromPos.z + toPos.z) / 2
        },
        { ...toPos }
      ]
    };
  }
  return enlaces;
}

function buildAnclas() {
  /** @type {Record<string, object>} */
  const anclas = {};
  const byDistrict = {};
  for (const b of BARRIOS) {
    byDistrict[b.distrito] = byDistrict[b.distrito] || [];
    byDistrict[b.distrito].push(b);
  }

  for (const [distrito, list] of Object.entries(byDistrict)) {
    const base = NODE_LAYOUT[distrito] || { x: 0, y: 0, z: 0 };
    list.forEach((b, i) => {
      const anchorId = `ancla-${b.id}`;
      anclas[anchorId] = {
        id: anchorId,
        parent: distrito,
        displayName: b.displayName,
        barrioId: b.id,
        slug: b.slug,
        estado: b.estado,
        position: {
          x: base.x + 2,
          y: 0,
          z: base.z + (i - (list.length - 1) / 2) * 2
        },
        facing: 0,
        slot: 'sit',
        kind: 'gamething.barrio'
      };
    });
  }
  return anclas;
}

function buildDefaultAnchors(anclas) {
  /** @type {Record<string, string>} */
  const defaults = {};
  for (const a of Object.values(anclas)) {
    if (!defaults[a.parent]) defaults[a.parent] = a.id;
  }
  return defaults;
}

function buildZones() {
  return DISTRITOS.map((d) => ({
    id: d.id,
    displayName: d.displayName,
    role: d.role,
    nodeId: d.id,
    barrios: BARRIOS.filter((b) => b.distrito === d.id).map((b) => b.id)
  }));
}

function buildArbol() {
  /** @type {Record<string, object>} */
  const barrios = {};
  for (const b of BARRIOS) {
    barrios[b.id] = {
      distrito: b.distrito,
      estado: b.estado,
      edificios: b.edificios,
      maquinarias: b.maquinarias
    };
  }
  return { barrios };
}

function buildGamemap() {
  const nodos = buildNodos();
  const enlaces = buildEnlaces();
  const anclas = buildAnclas();

  if (BARRIOS.length !== 24) {
    throw new Error(`expected 24 barrios, got ${BARRIOS.length}`);
  }
  if (DISTRITOS.length !== 6) {
    throw new Error(`expected 6 distritos, got ${DISTRITOS.length}`);
  }

  return {
    id: 'ciudad-demo',
    sceneId: 'ciudad-v0',
    version: '0.1.0',
    displayName: 'Ciudad · topología',
    labelset: ['ciudad', 'topologia'],
    startPack: [],
    objetivo: {
      barriosDespiertos: 1
    },
    seeds: {
      feedSeed: 1
    },
    cues: [],
    gobierno: {
      gobierna: 'plaza',
      opera: 'zigurat',
      ejecutan: 'barrios'
    },
    zones: buildZones(),
    nodos,
    enlaces,
    anclas,
    defaultAnchorByNode: buildDefaultAnchors(anclas),
    arbol: buildArbol()
  };
}

mkdirSync(dirname(OUT), { recursive: true });
const gamemap = buildGamemap();
writeFileSync(OUT, `${JSON.stringify(gamemap, null, 2)}\n`, 'utf8');
console.log(
  `wrote ${OUT} · nodes=${Object.keys(gamemap.nodos).length} links=${Object.keys(gamemap.enlaces).length} anchors=${Object.keys(gamemap.anclas).length} barrios=${Object.keys(gamemap.arbol.barrios).length}`
);

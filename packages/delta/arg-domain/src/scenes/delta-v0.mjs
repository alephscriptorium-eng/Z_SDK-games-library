/**
 * Escena canónica `delta-v0`: el tablero del juego delta.
 *
 * Datos puros (sin three, sin red) en el idioma de @zeus/game-engine:
 * nodos con posición, enlaces con waypoints + walkSpeed. Encima añade el
 * vocabulario propio del ARG: grifos (taps), ríos, mar y la topología de la
 * cantera (el laberinto). Los refs y estados iniciales de la cantera los
 * pone el feed (start pack o sintético), aquí solo vive la geometría.
 *
 *   cima-a ▲                ▲ cima-b
 *     │ río-a            río-b │
 *   terraza-a ── plaza ── terraza-b
 *     │            │           │
 *   embarcadero-a  │   embarcadero-b
 *          ~~~~ orilla-mar ~~~~ ── cantera-entrada ── cantera 4×3
 *          boya-1 ~~ boya-2
 */

const WALK = 2.4;
const SWIM = 1.6;
const DIG_WALK = 2.0;

function link(id, from, to, waypoints, walkSpeed = WALK, extra = {}) {
  return { id, from, to, waypoints, walkSpeed, medium: 'tierra', ...extra };
}

const NODOS = {
  plaza: { id: 'plaza', nombre: 'Plaza', zone: 'terraza', position: { x: 0, y: 4, z: -2 } },
  'terraza-a': { id: 'terraza-a', nombre: 'Terraza oeste', zone: 'terraza', position: { x: -8, y: 7, z: -10 } },
  'terraza-b': { id: 'terraza-b', nombre: 'Terraza este', zone: 'terraza', position: { x: 8, y: 7, z: -10 } },
  'cima-a': { id: 'cima-a', nombre: 'Cima oeste', zone: 'cima', position: { x: -14, y: 12, z: -18 } },
  'cima-b': { id: 'cima-b', nombre: 'Cima este', zone: 'cima', position: { x: 14, y: 12, z: -18 } },
  'embarcadero-a': { id: 'embarcadero-a', nombre: 'Embarcadero oeste', zone: 'terraza', position: { x: -11, y: 2, z: 0 } },
  'embarcadero-b': { id: 'embarcadero-b', nombre: 'Embarcadero este', zone: 'terraza', position: { x: 11, y: 2, z: 0 } },
  'orilla-mar': { id: 'orilla-mar', nombre: 'Orilla del mar', zone: 'mar', position: { x: 0, y: 1, z: 7 } },
  'boya-1': { id: 'boya-1', nombre: 'Boya 1', zone: 'mar', position: { x: -6, y: 0.4, z: 14 } },
  'boya-2': { id: 'boya-2', nombre: 'Boya 2', zone: 'mar', position: { x: 6, y: 0.4, z: 14 } },
  'cantera-entrada': { id: 'cantera-entrada', nombre: 'Boca de la cantera', zone: 'cantera', position: { x: 16, y: 1, z: 2 } }
};

const ENLACES = {
  'plaza--terraza-a': link('plaza--terraza-a', 'plaza', 'terraza-a', [
    NODOS.plaza.position, { x: -4, y: 5.5, z: -6 }, NODOS['terraza-a'].position
  ]),
  'plaza--terraza-b': link('plaza--terraza-b', 'plaza', 'terraza-b', [
    NODOS.plaza.position, { x: 4, y: 5.5, z: -6 }, NODOS['terraza-b'].position
  ]),
  'terraza-a--cima-a': link('terraza-a--cima-a', 'terraza-a', 'cima-a', [
    NODOS['terraza-a'].position, { x: -11, y: 9.5, z: -14 }, NODOS['cima-a'].position
  ]),
  'terraza-b--cima-b': link('terraza-b--cima-b', 'terraza-b', 'cima-b', [
    NODOS['terraza-b'].position, { x: 11, y: 9.5, z: -14 }, NODOS['cima-b'].position
  ]),
  'terraza-a--embarcadero-a': link('terraza-a--embarcadero-a', 'terraza-a', 'embarcadero-a', [
    NODOS['terraza-a'].position, { x: -10, y: 4, z: -4 }, NODOS['embarcadero-a'].position
  ]),
  'terraza-b--embarcadero-b': link('terraza-b--embarcadero-b', 'terraza-b', 'embarcadero-b', [
    NODOS['terraza-b'].position, { x: 10, y: 4, z: -4 }, NODOS['embarcadero-b'].position
  ]),
  'plaza--orilla-mar': link('plaza--orilla-mar', 'plaza', 'orilla-mar', [
    NODOS.plaza.position, { x: 0, y: 2, z: 3 }, NODOS['orilla-mar'].position
  ]),
  'orilla-mar--boya-1': link('orilla-mar--boya-1', 'orilla-mar', 'boya-1', [
    NODOS['orilla-mar'].position, { x: -3, y: 0.5, z: 10 }, NODOS['boya-1'].position
  ], SWIM, { medium: 'agua' }),
  'orilla-mar--boya-2': link('orilla-mar--boya-2', 'orilla-mar', 'boya-2', [
    NODOS['orilla-mar'].position, { x: 3, y: 0.5, z: 10 }, NODOS['boya-2'].position
  ], SWIM, { medium: 'agua' }),
  'boya-1--boya-2': link('boya-1--boya-2', 'boya-1', 'boya-2', [
    NODOS['boya-1'].position, { x: 0, y: 0.3, z: 16 }, NODOS['boya-2'].position
  ], SWIM, { medium: 'agua' }),
  'orilla-mar--cantera-entrada': link('orilla-mar--cantera-entrada', 'orilla-mar', 'cantera-entrada', [
    NODOS['orilla-mar'].position, { x: 8, y: 1, z: 5 }, NODOS['cantera-entrada'].position
  ])
};

/** Grifos: artilugios sobre las cimas que gobiernan cada río. */
const TAPS = {
  'grifo-a': {
    id: 'grifo-a',
    summitNodeId: 'cima-a',
    riverId: 'rio-a',
    aperture: 0,
    spawnRate: 1.6,        // gotas/s a apertura 1
    inflowRate: 0.02,      // presión/s con grifo cerrado (~50 s hasta riada)
    releaseRate: 0.1,      // presión/s aliviada a apertura 1
    floodMurkRate: 0.8,    // murk/s que vierte una riada
    burstDurationSec: 4,
    burstCooldownSec: 6
  },
  'grifo-b': {
    id: 'grifo-b',
    summitNodeId: 'cima-b',
    riverId: 'rio-b',
    aperture: 0,
    spawnRate: 1.6,
    inflowRate: 0.02,
    releaseRate: 0.1,
    floodMurkRate: 0.8,
    burstDurationSec: 4,
    burstCooldownSec: 6
  }
};

/** Ríos: cauces desde cada cima hasta la boca del mar. */
const RIOS = {
  'rio-a': {
    id: 'rio-a',
    tapId: 'grifo-a',
    flowSpeed: 3,
    embarkNodeId: 'embarcadero-a',
    embarkProgress: 0.5,
    mouthNodeId: 'orilla-mar',
    waypoints: [
      { x: -14, y: 11.5, z: -17 },
      { x: -12.5, y: 8.5, z: -11 },
      { x: -11.5, y: 5, z: -5 },
      { x: -11, y: 2, z: 0 },
      { x: -9, y: 0.8, z: 6 },
      { x: -5, y: 0.3, z: 11 },
      { x: 0, y: 0, z: 16 }
    ]
  },
  'rio-b': {
    id: 'rio-b',
    tapId: 'grifo-b',
    flowSpeed: 3,
    embarkNodeId: 'embarcadero-b',
    embarkProgress: 0.5,
    mouthNodeId: 'orilla-mar',
    waypoints: [
      { x: 14, y: 11.5, z: -17 },
      { x: 12.5, y: 8.5, z: -11 },
      { x: 11.5, y: 5, z: -5 },
      { x: 11, y: 2, z: 0 },
      { x: 9, y: 0.8, z: 6 },
      { x: 5, y: 0.3, z: 11 },
      { x: 0, y: 0, z: 16 }
    ]
  }
};

/** Topología de la cantera: grid de cámaras; refs/estados los pone el feed. */
const CANTERA = {
  cols: 4,
  rows: 3,
  origin: { x: 20, y: 1, z: -6 },
  spacing: 4,
  entryNodeId: 'cantera-entrada',
  entryChamberId: 'camara-0-2'
};

export function chamberId(col, row) {
  return `camara-${col}-${row}`;
}

export function corridorId(a, b) {
  return `pasillo-${a}--${b}`;
}

/**
 * Genera cámaras y pasillos (adyacencia derecha/abajo) de la cantera.
 * @returns {{chambers: Record<string,object>, corridors: Record<string,object>}}
 */
export function buildCanteraTopology(cantera = CANTERA) {
  const chambers = {};
  const corridors = {};
  for (let col = 0; col < cantera.cols; col++) {
    for (let row = 0; row < cantera.rows; row++) {
      const id = chamberId(col, row);
      chambers[id] = {
        id,
        col,
        row,
        position: {
          x: cantera.origin.x + col * cantera.spacing,
          y: cantera.origin.y,
          z: cantera.origin.z + row * cantera.spacing
        }
      };
      if (col > 0) {
        const a = chamberId(col - 1, row);
        corridors[corridorId(a, id)] = { id: corridorId(a, id), a, b: id };
      }
      if (row > 0) {
        const a = chamberId(col, row - 1);
        corridors[corridorId(a, id)] = { id: corridorId(a, id), a, b: id };
      }
    }
  }
  return { chambers, corridors };
}

/**
 * Nav-graph completo: nodos/enlaces base ∪ cámaras (nodos) ∪ pasillos
 * (enlaces con corridorId — el reducer solo los deja cruzar si el
 * maze-engine los tiene `open`).
 */
export function buildNavGraph(scene, topology) {
  const nodos = { ...scene.nodos };
  const enlaces = { ...scene.enlaces };

  for (const chamber of Object.values(topology.chambers)) {
    nodos[chamber.id] = {
      id: chamber.id,
      nombre: chamber.id,
      zone: 'cantera',
      position: chamber.position
    };
  }
  for (const corridor of Object.values(topology.corridors)) {
    enlaces[corridor.id] = link(
      corridor.id,
      corridor.a,
      corridor.b,
      [nodos[corridor.a].position, nodos[corridor.b].position],
      DIG_WALK,
      { corridorId: corridor.id }
    );
  }

  // La boca de la cantera conecta con la cámara de entrada (siempre abierta).
  const entryLinkId = `${scene.cantera.entryNodeId}--${scene.cantera.entryChamberId}`;
  enlaces[entryLinkId] = link(
    entryLinkId,
    scene.cantera.entryNodeId,
    scene.cantera.entryChamberId,
    [nodos[scene.cantera.entryNodeId].position, nodos[scene.cantera.entryChamberId].position],
    DIG_WALK
  );

  return { nodos, enlaces };
}

export const deltaV0 = {
  id: 'delta-v0',
  spawnNodeId: 'plaza',
  labelset: ['agora', 'memoria', 'ruido'],
  nodos: NODOS,
  enlaces: ENLACES,
  taps: TAPS,
  rios: RIOS,
  mar: {
    murkCapacity: 60,
    /** Plano del mar (paridad con delta-stage: 46×26 centrado en z=19). */
    bounds: { center: { x: 0, y: 0, z: 19 }, width: 46, depth: 26 },
    seaPoolMax: { floating: 96, sunken: 48 }
  },
  cantera: CANTERA,
  /** Radio de proximidad para contact:request (unidades de mundo). */
  contactRadius: 3.5
};

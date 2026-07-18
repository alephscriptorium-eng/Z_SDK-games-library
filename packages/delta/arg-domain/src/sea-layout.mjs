/**
 * seaLayout — posiciones puras y deterministas de gotas del mar (MAR.md §1).
 * Browser-safe: mismos datos ⇒ mismas posiciones en autoridad y visores.
 */

const GOLDEN_ANGLE = Math.PI * (3 - Math.sqrt(5));

function hashId(id) {
  let h = 0;
  const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Convierte marDef.bounds (center/width/depth o xMin..zMax) a caja axis-aligned. */
function resolveBounds(marDef = {}) {
  const b = marDef.bounds ?? {};
  if (b.center && b.width != null && b.depth != null) {
    const { center, width, depth } = b;
    return {
      xMin: center.x - width / 2,
      xMax: center.x + width / 2,
      zMin: center.z - depth / 2,
      zMax: center.z + depth / 2,
      y: center.y ?? 0
    };
  }
  return {
    xMin: b.xMin ?? -23,
    xMax: b.xMax ?? 23,
    zMin: b.zMin ?? 6,
    zMax: b.zMax ?? 32,
    y: b.y ?? 0
  };
}

/** Normaliza entradas: objetos del engine o tuplas compactas del snapshot. */
function normalizeDroplets(droplets) {
  if (!droplets?.length) return [];
  return droplets.map((d) => {
    if (Array.isArray(d)) {
      const [id, label, , seq] = d;
      return { id, label: label ?? null, state: label ? 'floating' : 'sunken', seq: seq ?? 0 };
    }
    return {
      id: d.id,
      label: d.label ?? null,
      state: d.state ?? (d.label ? 'floating' : 'sunken'),
      seq: d.seq ?? 0
    };
  });
}

/**
 * @param {Array<object|Array>} droplets
 * @param {{ bounds?: object }} marDef
 * @returns {{ clusters: Array<{label:string, center:{x,y,z}, members:string[]}>, positions: Record<string,{x,y,z}> }}
 */
export function seaLayout(droplets, marDef = {}) {
  const bounds = resolveBounds(marDef);
  const baseY = bounds.y;
  const items = normalizeDroplets(droplets);
  const positions = {};

  const floating = items.filter((d) => d.state === 'floating' && d.label);
  const sunken = items.filter((d) => d.state === 'sunken' || !d.label);

  const byLabel = new Map();
  for (const d of floating) {
    if (!byLabel.has(d.label)) byLabel.set(d.label, []);
    byLabel.get(d.label).push(d);
  }
  const labelOrder = [...byLabel.entries()]
    .map(([label, members]) => ({
      label,
      members: members.sort((a, b) => a.seq - b.seq),
      firstSeq: Math.min(...members.map((m) => m.seq))
    }))
    .sort((a, b) => a.firstSeq - b.firstSeq);

  const nClusters = labelOrder.length;
  const arcZ = bounds.zMax - 0.5;
  const arcXSpan = (bounds.xMax - bounds.xMin) * 0.7;
  const arcXCenter = (bounds.xMin + bounds.xMax) / 2;

  const clusters = labelOrder.map(({ label, members }, ci) => {
    const t = nClusters <= 1 ? 0.5 : ci / Math.max(1, nClusters - 1);
    const center = {
      x: arcXCenter + (t - 0.5) * arcXSpan,
      y: baseY + 0.35,
      z: arcZ
    };
    members.forEach((d, i) => {
      const r = 0.55 * Math.sqrt(i + 1);
      const angle = i * GOLDEN_ANGLE;
      positions[d.id] = {
        x: center.x + r * Math.cos(angle),
        y: center.y + 0.08 * Math.sin(i * 1.7),
        z: center.z + r * Math.sin(angle) * 0.6
      };
    });
    return { label, center, members: members.map((m) => m.id) };
  });

  const nearZMax = bounds.zMin + (bounds.zMax - bounds.zMin) * 0.45;
  for (const d of sunken) {
    const h = hashId(d.id);
    const hx = (h % 1000) / 1000;
    const hz = ((h / 1000) % 1000) / 1000;
    positions[d.id] = {
      x: bounds.xMin + hx * (bounds.xMax - bounds.xMin),
      y: baseY - 0.6 - (h % 7) * 0.08,
      z: bounds.zMin + hz * (nearZMax - bounds.zMin)
    };
  }

  return { clusters, positions };
}

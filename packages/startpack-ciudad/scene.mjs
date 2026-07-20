/**
 * Extract the flat map-engine scene from a ciudad gamemap seed.
 * Drops pack metadata (`arbol`, `zones`, …) that the game engine ignores (D-8).
 *
 * @param {object} gamemap
 */
export function toMapScene(gamemap) {
  if (!gamemap || typeof gamemap !== 'object') {
    throw new Error('toMapScene: gamemap required');
  }
  if (!gamemap.nodos || !gamemap.enlaces || !gamemap.anclas) {
    throw new Error('toMapScene: missing nodos/enlaces/anclas');
  }
  return {
    id: gamemap.sceneId || gamemap.id,
    version: gamemap.version || '0.1.0',
    displayName: gamemap.displayName || gamemap.id,
    nodos: gamemap.nodos,
    enlaces: gamemap.enlaces,
    anclas: gamemap.anclas,
    defaultAnchorByNode: gamemap.defaultAnchorByNode || {}
  };
}

/**
 * Lightweight schema check for `arbol.maquinarias` entries (Z12 catalog shape).
 * @param {object} arbol
 * @returns {{ ok: boolean, errors: string[] }}
 */
export function validateArbol(arbol) {
  const errors = [];
  if (!arbol || typeof arbol !== 'object' || !arbol.barrios) {
    return { ok: false, errors: ['arbol.barrios missing'] };
  }
  for (const [barrioId, barrio] of Object.entries(arbol.barrios)) {
    if (!Array.isArray(barrio.edificios)) {
      errors.push(`${barrioId}: edificios must be array`);
    }
    const maquinarias = barrio.maquinarias || {};
    for (const [mid, m] of Object.entries(maquinarias)) {
      for (const key of [
        'cmd',
        'puerto',
        'health',
        'autoRestart',
        'deps',
        'barrio',
        'edificio'
      ]) {
        if (!(key in m)) errors.push(`${mid}: missing ${key}`);
      }
      if (m.barrio !== barrioId) {
        errors.push(`${mid}: barrio field must equal parent ${barrioId}`);
      }
      if (!Array.isArray(m.deps)) errors.push(`${mid}: deps must be array`);
      if (typeof m.autoRestart !== 'boolean') {
        errors.push(`${mid}: autoRestart must be boolean`);
      }
      if (m.puerto !== null && typeof m.puerto !== 'number') {
        errors.push(`${mid}: puerto must be number|null`);
      }
    }
  }
  return { ok: errors.length === 0, errors };
}

/**
 * ciudad — edificios ↔ paquetes (cara lore del mapa).
 *
 * Destino canónico del vínculo edificio↔paquete: este módulo.
 * Solo ids del catálogo fleet (patrón mcp-launcher / CATALOG_SEED).
 * Gentes = capabilities/tools declaradas en el catálogo.
 * Salud: consume SALUD_SHAPE_FOR_ACL (no reinventar probes ni capability).
 */

import {
  DEFAULT_NPM_REGISTRY,
  PROBE_KINDS,
  SALUD_SHAPE_FOR_ACL
} from './salud.mjs';

export const EDIFICIOS_VERSION = 'edificios/1';

/**
 * @typedef {object} CatalogEntry
 * @property {string} id
 * @property {string} name
 * @property {string|null} [workspace] npm package / submodule face
 * @property {string} [spawnGroup]
 * @property {string[]} [capabilities] gentes = tools del edificio
 * @property {string} [notes]
 */

/**
 * Espejo del catálogo fleet (ids + workspace + capabilities).
 * Sin puertos ni spawn: eso es actuador; aquí solo identidad de paquete.
 * @type {ReadonlyArray<CatalogEntry>}
 */
export const CATALOG_SEED = Object.freeze([
  Object.freeze({
    id: 'linea-espana',
    name: 'linea-espana',
    workspace: '@zeus/linea-system',
    spawnGroup: 'linea-system',
    capabilities: Object.freeze(['linea.tronco', 'rnfp.linea', 'fleet.lineas'])
  }),
  Object.freeze({
    id: 'linea-wp-historia',
    name: 'linea-wp-historia',
    workspace: '@zeus/linea-system',
    spawnGroup: 'linea-system',
    capabilities: Object.freeze(['linea.satelite', 'rnfp.linea.satelite', 'fleet.lineas'])
  }),
  Object.freeze({
    id: 'solar-sun',
    name: 'solar-sun',
    workspace: '@zeus/solar-system',
    spawnGroup: 'solar-system',
    capabilities: Object.freeze(['fleet.solar'])
  }),
  Object.freeze({
    id: 'solar-moon',
    name: 'solar-moon',
    workspace: '@zeus/solar-system',
    spawnGroup: 'solar-system',
    capabilities: Object.freeze(['fleet.solar'])
  }),
  Object.freeze({
    id: 'solar-earth',
    name: 'solar-earth',
    workspace: '@zeus/solar-system',
    spawnGroup: 'solar-system',
    capabilities: Object.freeze(['fleet.solar'])
  }),
  Object.freeze({
    id: 'forces',
    name: 'forces-disk',
    workspace: '@zeus/force-system',
    spawnGroup: 'force-system',
    capabilities: Object.freeze(['fleet.forces'])
  }),
  Object.freeze({
    id: 'linea-editor',
    name: 'linea-editor',
    workspace: '@zeus/linea-editor',
    spawnGroup: 'linea-editor',
    capabilities: Object.freeze(['linea.editor', 'fleet.lineas', 'rnfp.linea.editor'])
  }),
  Object.freeze({
    id: 'ssb',
    name: 'ssb-disk',
    workspace: '@zeus/ssb-system',
    spawnGroup: 'ssb-system',
    capabilities: Object.freeze(['fleet.ssb'])
  }),
  Object.freeze({
    id: 'firehose',
    name: 'linea-firehose',
    workspace: '@zeus/linea-firehose',
    spawnGroup: 'linea-firehose',
    capabilities: Object.freeze(['fleet.firehose'])
  }),
  Object.freeze({
    id: 'console-monitor',
    name: 'console-monitor',
    workspace: '@zeus/console-monitor',
    spawnGroup: 'console-monitor',
    capabilities: Object.freeze(['fleet.consoleMonitor'])
  }),
  Object.freeze({
    id: 'arg-player-uno',
    name: 'arg-player-uno',
    workspace: null,
    spawnGroup: 'arg-player',
    capabilities: Object.freeze(['fleet.argPlayer', 'game.delta'])
  }),
  Object.freeze({
    id: 'arg-player-dos',
    name: 'arg-player-dos',
    workspace: null,
    spawnGroup: 'arg-player',
    capabilities: Object.freeze(['fleet.argPlayer', 'game.delta'])
  }),
  Object.freeze({
    id: 'pozo-player',
    name: 'pozo-player',
    workspace: null,
    spawnGroup: 'pozo-player',
    capabilities: Object.freeze(['fleet.pozoPlayer', 'game.pozo'])
  }),
  Object.freeze({
    id: 'solve-player',
    name: 'solve-player',
    workspace: null,
    spawnGroup: 'solve-player',
    capabilities: Object.freeze(['fleet.solvePlayer', 'game.solve'])
  })
]);

/** @type {ReadonlySet<string>} */
export const CATALOG_IDS = Object.freeze(new Set(CATALOG_SEED.map((e) => e.id)));

/**
 * Shape estable: identidad de edificio + frontera salud (citada, no copiada).
 */
export const EDIFICIOS_SHAPE = Object.freeze({
  version: EDIFICIOS_VERSION,
  invariante: 'solo_ids_catalogo',
  catalogIds: Object.freeze([...CATALOG_IDS]),
  /** Gentes = capabilities del catálogo. */
  gentesKey: 'capabilities',
  /** Paquete npm / submodule face. */
  paqueteKey: 'workspace',
  /** Consume shape salud — no reinventar probes. */
  salud: Object.freeze({
    version: SALUD_SHAPE_FOR_ACL.version,
    wakeDefaultActions: SALUD_SHAPE_FOR_ACL.wakeDefaultActions,
    probeKinds: PROBE_KINDS
  })
});

/**
 * @param {string} id
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {boolean}
 */
export function isCatalogId(id, catalog = CATALOG_SEED) {
  if (typeof id !== 'string' || !id.trim()) return false;
  return catalog.some((e) => e.id === id.trim());
}

/**
 * Gate: solo ids declarados. Rechazo fuera de catálogo.
 * @param {string} id
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {CatalogEntry}
 */
export function getCatalogEntry(id, catalog = CATALOG_SEED) {
  const key = typeof id === 'string' ? id.trim() : '';
  const entry = catalog.find((e) => e.id === key);
  if (!entry) {
    throw new Error(
      `Unknown catalog id "${id}". Edificios only resolve declared catalog ids.`
    );
  }
  return entry;
}

/**
 * @typedef {{
 *   edificioId: string,
 *   catalogId: string,
 *   packageName: string|null,
 *   gentes: string[],
 *   spawnGroup: string|null,
 *   barrioId: string|null,
 *   source: 'catalog'|'arbol'|'overlay'
 * }} VinculoEdificio
 */

/**
 * Edificio ≡ entrada de catálogo (submódulo/paquete).
 * @param {string} edificioId — debe ser id de catálogo
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {VinculoEdificio}
 */
export function resolveEdificio(edificioId, catalog = CATALOG_SEED) {
  const entry = getCatalogEntry(edificioId, catalog);
  return {
    edificioId: entry.id,
    catalogId: entry.id,
    packageName: entry.workspace ?? null,
    gentes: [...(entry.capabilities || [])],
    spawnGroup: entry.spawnGroup || null,
    barrioId: null,
    source: 'catalog'
  };
}

/**
 * Vincula un edificio del mapa a un id de catálogo (rechaza fuera).
 * @param {{ edificioId: string, catalogId: string, barrioId?: string|null }} link
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {VinculoEdificio}
 */
export function vincularEdificio(link, catalog = CATALOG_SEED) {
  if (!link || typeof link !== 'object') {
    throw new Error('vincularEdificio: link required');
  }
  const edificioId =
    typeof link.edificioId === 'string' ? link.edificioId.trim() : '';
  if (!edificioId) throw new Error('vincularEdificio: edificioId required');
  const entry = getCatalogEntry(link.catalogId, catalog);
  const barrioId =
    typeof link.barrioId === 'string' && link.barrioId.trim()
      ? link.barrioId.trim()
      : null;
  return {
    edificioId,
    catalogId: entry.id,
    packageName: entry.workspace ?? null,
    gentes: [...(entry.capabilities || [])],
    spawnGroup: entry.spawnGroup || null,
    barrioId,
    source: 'overlay'
  };
}

/**
 * Gentes (= tools) de un edificio vía catálogo.
 * @param {string} catalogId
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {string[]}
 */
export function gentesDeCatalogo(catalogId, catalog = CATALOG_SEED) {
  return [...(getCatalogEntry(catalogId, catalog).capabilities || [])];
}

/**
 * ¿La tool/gente está declarada en el catálogo del edificio?
 * @param {string} catalogId
 * @param {string} tool
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 */
export function assertGenteInCatalogo(catalogId, tool, catalog = CATALOG_SEED) {
  const gentes = gentesDeCatalogo(catalogId, catalog);
  const t = typeof tool === 'string' ? tool.trim() : '';
  if (!t || !gentes.includes(t)) {
    throw new Error(
      `Unknown tool "${tool}" for catalog id "${catalogId}". Gentes must be catalog capabilities.`
    );
  }
  return t;
}

/**
 * Escanea `arbol` del startpack: acepta solo catalogId ∈ catálogo.
 * @param {object|null|undefined} arbol
 * @param {ReadonlyArray<CatalogEntry>} [catalog]
 * @returns {{
 *   ok: VinculoEdificio[],
 *   rechazados: { barrioId: string, edificioId: string|null, catalogId: string, maquinariaId: string, error: string }[]
 * }}
 */
export function indexArbolEdificios(arbol, catalog = CATALOG_SEED) {
  /** @type {VinculoEdificio[]} */
  const ok = [];
  /** @type {{ barrioId: string, edificioId: string|null, catalogId: string, maquinariaId: string, error: string }[]} */
  const rechazados = [];
  const barrios = arbol?.barrios;
  if (!barrios || typeof barrios !== 'object') {
    return { ok, rechazados };
  }
  for (const [barrioId, barrio] of Object.entries(barrios)) {
    const maquinarias = barrio?.maquinarias;
    if (!maquinarias || typeof maquinarias !== 'object') continue;
    for (const [maquinariaId, m] of Object.entries(maquinarias)) {
      if (!m || typeof m !== 'object') continue;
      if (typeof m.catalogId !== 'string' || !m.catalogId.trim()) continue;
      const catalogId = m.catalogId.trim();
      const edificioId =
        typeof m.edificio === 'string' && m.edificio.trim()
          ? m.edificio.trim()
          : null;
      if (!isCatalogId(catalogId, catalog)) {
        rechazados.push({
          barrioId,
          edificioId,
          catalogId,
          maquinariaId,
          error: 'catalog_id_fuera'
        });
        continue;
      }
      const entry = getCatalogEntry(catalogId, catalog);
      ok.push({
        edificioId: edificioId || entry.id,
        catalogId: entry.id,
        packageName: entry.workspace ?? null,
        gentes: [...(entry.capabilities || [])],
        spawnGroup: entry.spawnGroup || null,
        barrioId,
        source: 'arbol'
      });
    }
  }
  return { ok, rechazados };
}

/**
 * Índice por edificioId (último gana si hay colisión).
 * @param {VinculoEdificio[]} vinculos
 * @returns {Record<string, VinculoEdificio>}
 */
export function indexByEdificio(vinculos) {
  /** @type {Record<string, VinculoEdificio>} */
  const out = {};
  for (const v of vinculos || []) {
    if (v?.edificioId) out[v.edificioId] = v;
  }
  return out;
}

/**
 * Binding de salud (npm-view) desde un vínculo — consume shape salud.
 * No lanza maquinarias; solo probe read-only cuando hay packageName.
 * @param {VinculoEdificio} vinculo
 * @param {{ barrioId?: string, registry?: string }} [opts]
 * @returns {{ ok: true, binding: object } | { ok: false, error: string }}
 */
export function saludBindingDesdeVinculo(vinculo, opts = {}) {
  if (!vinculo || typeof vinculo !== 'object') {
    return { ok: false, error: 'vinculo_requerido' };
  }
  if (!isCatalogId(vinculo.catalogId)) {
    return { ok: false, error: 'catalog_id_fuera' };
  }
  if (!vinculo.packageName) {
    return { ok: false, error: 'sin_paquete' };
  }
  if (!PROBE_KINDS.includes('npm-view')) {
    return { ok: false, error: 'probe_kind_invalido' };
  }
  const barrioId =
    (typeof opts.barrioId === 'string' && opts.barrioId.trim()) ||
    vinculo.barrioId ||
    '';
  if (!barrioId) {
    return { ok: false, error: 'barrio_requerido' };
  }
  return {
    ok: true,
    binding: {
      barrioId,
      kind: 'npm-view',
      packageName: vinculo.packageName,
      registry: opts.registry || DEFAULT_NPM_REGISTRY,
      label: `catalog ${vinculo.catalogId} → ${vinculo.packageName}`,
      catalogId: vinculo.catalogId,
      edificioId: vinculo.edificioId
    }
  };
}

/**
 * Mapa completo: catálogo (edificios=ids) + arbol filtrado + overlays opcionales.
 * @param {{
 *   arbol?: object|null,
 *   overlays?: { edificioId: string, catalogId: string, barrioId?: string|null }[],
 *   catalog?: ReadonlyArray<CatalogEntry>
 * }} [opts]
 */
export function mapEdificios(opts = {}) {
  const catalog = opts.catalog || CATALOG_SEED;
  const fromCatalog = catalog.map((e) => resolveEdificio(e.id, catalog));
  const fromArbol = indexArbolEdificios(opts.arbol || null, catalog);
  /** @type {VinculoEdificio[]} */
  const fromOverlay = [];
  /** @type {{ edificioId: string, catalogId: string, error: string }[]} */
  const overlayRechazados = [];
  for (const link of opts.overlays || []) {
    try {
      fromOverlay.push(vincularEdificio(link, catalog));
    } catch (err) {
      overlayRechazados.push({
        edificioId: String(link?.edificioId || ''),
        catalogId: String(link?.catalogId || ''),
        error: String(err?.message || err)
      });
    }
  }
  const vinculos = [...fromCatalog, ...fromArbol.ok, ...fromOverlay];
  return {
    version: EDIFICIOS_VERSION,
    byEdificio: indexByEdificio(vinculos),
    vinculos,
    rechazados: [...fromArbol.rechazados, ...overlayRechazados],
    shape: EDIFICIOS_SHAPE
  };
}

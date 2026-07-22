/**
 * Tests edificios ↔ catálogo: gate ids · rechazo · consumidor dominio/salud.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import {
  CATALOG_IDS,
  CATALOG_SEED,
  EDIFICIOS_SHAPE,
  assertGenteInCatalogo,
  gentesDeCatalogo,
  getCatalogEntry,
  indexArbolEdificios,
  isCatalogId,
  mapEdificios,
  resolveEdificio,
  saludBindingDesdeVinculo,
  vincularEdificio
} from '../src/edificios.mjs';
import { SALUD_SHAPE_FOR_ACL, probeNpmView } from '../src/salud.mjs';

const STARTPACK_SEED = join(
  dirname(fileURLToPath(import.meta.url)),
  '..',
  '..',
  'startpack-ciudad',
  'seeds',
  'gamemap.json'
);

function loadGamemap() {
  return JSON.parse(readFileSync(STARTPACK_SEED, 'utf8'));
}

describe('ciudad edificios', () => {
  it('shape: solo ids catálogo + cita salud (no reinventar)', () => {
    assert.equal(EDIFICIOS_SHAPE.version, 'edificios/1');
    assert.equal(EDIFICIOS_SHAPE.invariante, 'solo_ids_catalogo');
    assert.equal(EDIFICIOS_SHAPE.salud.version, SALUD_SHAPE_FOR_ACL.version);
    assert.deepEqual(
      [...EDIFICIOS_SHAPE.salud.wakeDefaultActions],
      [...SALUD_SHAPE_FOR_ACL.wakeDefaultActions]
    );
    assert.ok(CATALOG_IDS.has('linea-editor'));
    assert.equal(CATALOG_SEED.length, CATALOG_IDS.size);
  });

  it('getCatalogEntry / resolveEdificio: edificio → paquete verificable', () => {
    const entry = getCatalogEntry('linea-editor');
    assert.equal(entry.workspace, '@zeus/linea-editor');
    const v = resolveEdificio('linea-editor');
    assert.equal(v.catalogId, 'linea-editor');
    assert.equal(v.packageName, '@zeus/linea-editor');
    assert.ok(v.gentes.includes('linea.editor'));
    assert.equal(gentesDeCatalogo('linea-editor').includes('fleet.lineas'), true);
  });

  it('rechazo de id fuera de catálogo', () => {
    assert.equal(isCatalogId('prolog-ui'), false);
    assert.equal(isCatalogId('state-machine-server'), false);
    assert.throws(() => getCatalogEntry('prolog-ui'), /Unknown catalog id/);
    assert.throws(() => resolveEdificio('no-existe'), /Unknown catalog id/);
    assert.throws(
      () => vincularEdificio({ edificioId: 'x', catalogId: 'aaia-mcp-server' }),
      /Unknown catalog id/
    );
  });

  it('assertGenteInCatalogo rechaza tool inventada', () => {
    assert.equal(assertGenteInCatalogo('linea-editor', 'linea.editor'), 'linea.editor');
    assert.throws(
      () => assertGenteInCatalogo('linea-editor', 'tool.inventada'),
      /Unknown tool/
    );
  });

  it('indexArbolEdificios: catalogIds del seed fuera → rechazados', () => {
    const gamemap = loadGamemap();
    const { ok, rechazados } = indexArbolEdificios(gamemap.arbol);
    assert.equal(ok.length, 0, 'ningún catalogId del arbol seed está en fleet');
    assert.ok(rechazados.length >= 1);
    assert.ok(rechazados.every((r) => r.error === 'catalog_id_fuera'));
    assert.ok(rechazados.some((r) => r.catalogId === 'prolog-ui'));
    assert.ok(rechazados.some((r) => r.catalogId === 'state-machine-server'));
  });

  it('mapEdificios + overlay válido; overlay inválido rechazado', () => {
    const gamemap = loadGamemap();
    const map = mapEdificios({
      arbol: gamemap.arbol,
      overlays: [
        {
          edificioId: 'mcp-presets',
          catalogId: 'linea-editor',
          barrioId: 'mcp-gallery'
        },
        { edificioId: 'fake', catalogId: 'no-existe' }
      ]
    });
    assert.ok(map.byEdificio['linea-editor']);
    assert.equal(map.byEdificio['mcp-presets'].catalogId, 'linea-editor');
    assert.equal(map.byEdificio['mcp-presets'].packageName, '@zeus/linea-editor');
    assert.ok(map.rechazados.some((r) => r.catalogId === 'no-existe'));
    assert.ok(map.rechazados.some((r) => r.catalogId === 'prolog-ui'));
  });

  it('eje I: dominio consume map + saludBinding → applySalud (payload)', async () => {
    const gamemap = loadGamemap();
    const d = createCiudadDomainState({
      now: () => 2000,
      gamemap,
      edificioOverlays: [
        {
          edificioId: 'mcp-presets',
          catalogId: 'linea-editor',
          barrioId: 'mcp-gallery'
        }
      ]
    });
    const snap = d.snapshot('edificios');
    assert.equal(snap.edificios.version, 'edificios/1');
    assert.equal(snap.edificios.byEdificio['mcp-presets'].packageName, '@zeus/linea-editor');
    assert.ok(snap.edificios.rechazados.some((r) => r.error === 'catalog_id_fuera'));

    const vinculo = d.getEdificios().byEdificio['mcp-presets'];
    const built = saludBindingDesdeVinculo(vinculo, { barrioId: 'mcp-gallery' });
    assert.equal(built.ok, true, built.error);
    assert.equal(built.binding.kind, 'npm-view');
    assert.equal(built.binding.packageName, '@zeus/linea-editor');

    const probe = await probeNpmView(built.binding, {
      exec: async () => ({ code: 0, stdout: '0.1.0\n', stderr: '' })
    });
    assert.equal(probe.ok, true);
    const applied = d.applySalud(probe);
    assert.equal(applied.ok, true, applied.error);
    assert.equal(d.getSalud('mcp-gallery').detail.packageName, '@zeus/linea-editor');
    assert.equal(d.getSalud('mcp-gallery').detail.version, '0.1.0');
  });

  it('eje II: una sola definición de gate (getCatalogEntry)', () => {
    const src = readFileSync(
      join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'edificios.mjs'),
      'utf8'
    );
    const defs = src.match(/export function getCatalogEntry/g) || [];
    assert.equal(defs.length, 1);
  });
});

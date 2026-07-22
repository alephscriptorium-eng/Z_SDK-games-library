/**
 * Smoke edificios ↔ catálogo + cara salud (read-only).
 * Overlay demo: mcp-presets → linea-editor → npm view @zeus/linea-editor.
 * Si el paquete no está en el canal, el mapa refleja muerto/latente (verdad);
 * el CA de este corte es mapping + rechazo, no publish del workspace.
 * Salida: EDIFICIOS_SMOKE_OK | EDIFICIOS_SMOKE_FAIL
 */

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import {
  EDIFICIOS_SHAPE,
  getCatalogEntry,
  mapEdificios,
  saludBindingDesdeVinculo
} from '../src/edificios.mjs';
import { probeNpmView, SALUD_SHAPE_FOR_ACL } from '../src/salud.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SEED = join(ROOT, '..', 'startpack-ciudad', 'seeds', 'gamemap.json');

async function main() {
  const gamemap = JSON.parse(readFileSync(SEED, 'utf8'));
  const overlay = {
    edificioId: 'mcp-presets',
    catalogId: 'linea-editor',
    barrioId: 'mcp-gallery'
  };

  const entry = getCatalogEntry(overlay.catalogId);
  if (entry.workspace !== '@zeus/linea-editor') {
    throw new Error('catalog workspace drift');
  }
  if (EDIFICIOS_SHAPE.salud.version !== SALUD_SHAPE_FOR_ACL.version) {
    throw new Error('salud shape not consumed');
  }

  const indexed = mapEdificios({ arbol: gamemap.arbol, overlays: [overlay] });
  const fuera = indexed.rechazados.filter((r) => r.error === 'catalog_id_fuera');
  if (fuera.length < 1) {
    throw new Error('expected arbol catalogIds outside fleet to be rejected');
  }
  if (!indexed.byEdificio['mcp-presets']?.packageName) {
    throw new Error('overlay mapping missing packageName');
  }

  const d = createCiudadDomainState({
    gamemap,
    edificioOverlays: [overlay]
  });
  const vinculo = d.getEdificios().byEdificio['mcp-presets'];
  const built = saludBindingDesdeVinculo(vinculo);
  if (!built.ok) throw new Error(built.error);

  const probe = await probeNpmView(built.binding);
  const applied = d.applySalud(probe);
  if (!applied.ok) throw new Error(applied.error || 'applySalud failed');

  const snap = d.snapshot('edificios-smoke');
  const out = {
    ok: true,
    catalogId: overlay.catalogId,
    packageName: entry.workspace,
    probeOk: probe.ok,
    probeCode: probe.detail?.code || null,
    version: probe.detail?.version || null,
    barrio: snap.barrios['mcp-gallery']?.estado,
    rechazadosArbol: fuera.length,
    shape: EDIFICIOS_SHAPE.version,
    saludShape: SALUD_SHAPE_FOR_ACL.version
  };

  console.log('ok catalog', overlay.catalogId, '→', entry.workspace);
  console.log(
    'ok probe',
    probe.ok ? `version ${probe.detail.version}` : `mapa=${out.barrio} code=${out.probeCode}`
  );
  console.log('ok rechazo fuera de catálogo ×', fuera.length);
  console.log('EDIFICIOS_SMOKE_OK');
  console.log(JSON.stringify(out));
}

main().catch((err) => {
  console.error('EDIFICIOS_SMOKE_FAIL', err);
  process.exitCode = 1;
});

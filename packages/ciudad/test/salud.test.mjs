/**
 * Tests salud real ↔ mapa: probes + applySalud + shape ACL.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCiudadDomainState } from '../src/domain.mjs';
import { makeIntent } from '../src/contract.mjs';
import {
  CAPABILITY_REQUIRED,
  SALUD_SHAPE_FOR_ACL,
  WAKE_DEFAULT_ACTIONS,
  bindingsSalud,
  estadoDesdeProbe,
  probeNpmView,
  probeSalud,
  requiereCapability,
  wakeConSalud
} from '../src/salud.mjs';

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

describe('ciudad salud', () => {
  it('shape ACL: defaults idempotentes vs capabilityRequired', () => {
    assert.equal(SALUD_SHAPE_FOR_ACL.version, 'salud/1');
    assert.deepEqual([...WAKE_DEFAULT_ACTIONS], ['npm-view', 'http-status', 'smoke']);
    assert.ok(CAPABILITY_REQUIRED.includes('maq.launch'));
    assert.ok(CAPABILITY_REQUIRED.includes('acl.write'));
    assert.equal(requiereCapability('npm-view'), false);
    assert.equal(requiereCapability('maq.stop'), true);
  });

  it('estadoDesdeProbe mapea ok / 404 / unreachable', () => {
    assert.equal(estadoDesdeProbe({ ok: true }), 'vivo');
    assert.equal(estadoDesdeProbe({ ok: false, detail: { code: 'E404' } }), 'muerto');
    assert.equal(
      estadoDesdeProbe({ ok: false, detail: { code: 'ECONNREFUSED' } }),
      'latente'
    );
    assert.equal(estadoDesdeProbe({ ok: false, detail: { code: 'boom' } }), 'roto');
  });

  it('bindingsSalud: mcp-gallery → npm-view protocol + http desde arbol', () => {
    const gamemap = loadGamemap();
    const map = bindingsSalud(gamemap.arbol);
    assert.equal(map['mcp-gallery'].kind, 'npm-view');
    assert.equal(map['mcp-gallery'].packageName, '@zeus/protocol');
    assert.equal(map['wiring-editor'].kind, 'http-status');
    assert.match(map['wiring-editor'].url, /127\.0\.0\.1:1880/);
  });

  it('applySalud sincroniza barrio con señal (sin I/O)', () => {
    const d = createCiudadDomainState({ now: () => 1000, gamemap: loadGamemap() });
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'latente');
    const r = d.applySalud({
      barrioId: 'blockly-editor',
      kind: 'npm-view',
      ok: true,
      detail: { version: '0.3.0' },
      checkedAt: 1000,
      estadoSugerido: 'vivo'
    });
    assert.equal(r.ok, true, r.error);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
    assert.equal(d.snapshot('t').lastSalud.kind, 'npm-view');
    assert.equal(d.getSalud('blockly-editor').detail.version, '0.3.0');
    const out = d.drainOutbox();
    assert.ok(out.ledger.some((e) => e.kind === 'salud'));
  });

  it('probeNpmView inyectable (eje I consumidor dominio)', async () => {
    const binding = {
      barrioId: 'mcp-gallery',
      kind: 'npm-view',
      packageName: '@zeus/protocol',
      registry: 'https://npm.scriptorium.escrivivir.co'
    };
    const probe = await probeNpmView(binding, {
      now: () => 42,
      exec: async () => ({ code: 0, stdout: '0.3.0\n', stderr: '' })
    });
    assert.equal(probe.ok, true);
    assert.equal(probe.detail.version, '0.3.0');
    assert.equal(probe.estadoSugerido, 'vivo');
  });

  it('wakeConSalud: probe ok + latente → wake tool salud.npm-view', async () => {
    let t = 1000;
    const d = createCiudadDomainState({ now: () => t, gamemap: loadGamemap() });
    assert.equal(d.applyIntent(makeIntent('rabbit', 'join', {})).ok, true);
    assert.equal(
      d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' })).ok,
      true
    );
    assert.equal(
      d.applyIntent(
        makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
      ).ok,
      true
    );
    t = 2000;
    const result = await wakeConSalud({
      domain: d,
      makeIntent,
      actorId: 'rabbit',
      barrioId: 'blockly-editor',
      binding: {
        barrioId: 'blockly-editor',
        kind: 'npm-view',
        packageName: '@zeus/protocol',
        registry: 'https://npm.scriptorium.escrivivir.co'
      },
      deps: {
        now: () => t,
        exec: async () => ({ code: 0, stdout: '0.3.0\n', stderr: '' })
      }
    });
    assert.equal(result.ok, true, result.error);
    assert.equal(result.probe.ok, true);
    assert.equal(result.wake?.ok, true);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'vivo');
    assert.equal(d.snapshot('t').lastWake.tool, 'salud.npm-view');
    assert.equal(d.snapshot('t').lastSalud.ok, true);
  });

  it('wakeConSalud: probe fail → mapa roto/latente, sin wake vivo', async () => {
    const d = createCiudadDomainState({ now: () => 1000, gamemap: loadGamemap() });
    d.applyIntent(makeIntent('rabbit', 'join', {}));
    d.applyIntent(makeIntent('rabbit', 'walk', { nodeId: 'zigurat' }));
    d.applyIntent(
      makeIntent('rabbit', 'walk', { anchorId: 'ancla-blockly-editor' })
    );
    const result = await wakeConSalud({
      domain: d,
      makeIntent,
      actorId: 'rabbit',
      barrioId: 'blockly-editor',
      binding: {
        barrioId: 'blockly-editor',
        kind: 'npm-view',
        packageName: '@zeus/no-such-pkg-c01',
        registry: 'https://npm.scriptorium.escrivivir.co'
      },
      deps: {
        exec: async () => ({
          code: 1,
          stdout: '',
          stderr: 'npm error 404 Not Found'
        })
      }
    });
    assert.equal(result.skippedWake, true);
    assert.equal(result.probe.ok, false);
    assert.equal(d.snapshot('t').barrios['blockly-editor'].estado, 'muerto');
  });

  it('probeSalud http-status inyectable (2º cliente eje IV)', async () => {
    const probe = await probeSalud(
      {
        barrioId: 'wiring-editor',
        kind: 'http-status',
        url: 'http://127.0.0.1:1880/'
      },
      {
        now: () => 7,
        fetch: async () => ({ ok: true, status: 200 })
      }
    );
    assert.equal(probe.ok, true);
    assert.equal(probe.estadoSugerido, 'vivo');
  });
});

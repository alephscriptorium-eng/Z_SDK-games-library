import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PKG = path.resolve(__dirname, '..');
const GEN = path.join(PKG, 'tools', 'generate-ciudad-volumes.mjs');
const FIXTURE = path.join(PKG, 'fixtures', 'cantera-min');

function hashTree(root) {
  const files = [];
  function walk(dir, rel = '') {
    for (const name of fs.readdirSync(dir).sort()) {
      const abs = path.join(dir, name);
      const r = rel ? `${rel}/${name}` : name;
      const st = fs.statSync(abs);
      if (st.isDirectory()) walk(abs, r);
      else files.push({ r, body: fs.readFileSync(abs) });
    }
  }
  walk(root);
  const h = createHash('sha256');
  for (const f of files) {
    h.update(f.r);
    h.update('\0');
    h.update(f.body);
    h.update('\0');
  }
  return { hash: h.digest('hex'), files: files.length };
}

/** Cantera for tests: env override, else pack-local fixture (never a host plan path). */
function findCantera() {
  if (process.env.CIUDAD_CANTERA && fs.existsSync(process.env.CIUDAD_CANTERA)) {
    return process.env.CIUDAD_CANTERA;
  }
  if (fs.existsSync(path.join(FIXTURE, 'GRAFO', 'handoffs.tsv'))) {
    return FIXTURE;
  }
  return null;
}

test('generator is idempotent (same cantera → same volume hash)', (t) => {
  const cantera = findCantera();
  if (!cantera) {
    t.skip('no CIUDAD_CANTERA and pack fixture missing');
    return;
  }
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'mockdatas-ciudad-'));
  const out1 = path.join(tmp, 'a');
  const out2 = path.join(tmp, 'b');
  for (const out of [out1, out2]) {
    const r = spawnSync(process.execPath, [GEN, '--cantera', cantera, '--out', out], {
      encoding: 'utf8'
    });
    assert.equal(r.status, 0, r.stderr || r.stdout);
  }
  const h1 = hashTree(out1);
  const h2 = hashTree(out2);
  assert.equal(h1.files, h2.files);
  assert.equal(h1.hash, h2.hash);
});

test('pack volumes.json declares firehose corpora when generated into package volumes/', (t) => {
  const volumesJson = path.join(PKG, 'volumes', 'volumes.json');
  if (!fs.existsSync(volumesJson)) {
    t.skip('volumes/ not generated yet');
    return;
  }
  const cfg = JSON.parse(fs.readFileSync(volumesJson, 'utf8'));
  assert.ok(cfg.volumes.firehose);
  assert.ok(cfg.volumes.lineas);
  const candidate = cfg.volumes.firehose.corpora.find((c) => c.id === 'candidate');
  assert.ok(candidate);
  assert.ok(candidate.files > 0);
});

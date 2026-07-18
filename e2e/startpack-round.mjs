#!/usr/bin/env node
/**
 * e2e WP-U62 — una ronda arranca desde start pack instalable.
 *
 * Flujo:
 * 1. Notario produce tarball (+ acta) para delta
 * 2. Instala el tarball en un staging dir (equivalente a npm install @zeus/startpack-delta)
 * 3. Carga el pack y verifica gamemap + ZEUS_VOLUMES_ROOT
 * 4. Arranca autoridad delta con ZEUS_STARTPACK_ROOT (feeds synthetic) unos segundos
 * 5. Comprueba log de start pack + health implícito (proceso vivo + snapshot env)
 *
 * Mesh completo (socket + viewers): cubierto por e2e:arg; aquí el CA es
 * «ronda nueva desde start pack».
 */

import { spawn, spawnSync } from 'node:child_process';
import {
  mkdirSync,
  rmSync,
  existsSync,
  readFileSync,
  writeFileSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = join(__dirname, '..');
const require = createRequire(import.meta.url);

function fail(msg) {
  console.error(`❌ ${msg}`);
  process.exit(1);
}

function ok(msg) {
  console.log(`✅ ${msg}`);
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || LIBRARY_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(opts.env || {}) }
  });
  if (res.status !== 0) {
    fail(`${cmd} ${args.join(' ')} → ${res.stderr || res.stdout}`);
  }
  return (res.stdout || '').trim();
}

console.log('\n🧪 e2e:startpack — ronda desde start pack\n');

// 1. Notario pack (sin GitHub)
run('node', ['scripts/notario-release.mjs', '--game', 'delta', '--skip-tests']);
const summaryPath = join(LIBRARY_ROOT, '.release-startpack', 'summary-delta.json');
if (!existsSync(summaryPath)) fail('missing summary-delta.json');
const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
ok(`Notario tarball: ${summary.tarball}`);
if (!existsSync(summary.tarball)) fail('tarball missing');
if (!existsSync(summary.acta)) fail('acta missing');
ok(`Acta: ${summary.acta}`);

// 2. Install tarball into staging (npm install equivalent)
const staging = join(tmpdir(), `zeus-startpack-e2e-${Date.now()}`);
mkdirSync(staging, { recursive: true });
writePackageJson(staging);
run('npm', ['install', summary.tarball, '--no-save'], { cwd: staging });
ok(`npm install tarball → ${staging}`);

const startpackRoot = join(staging, 'node_modules', '@zeus', 'startpack-delta');
if (!existsSync(join(startpackRoot, 'manifest.json'))) {
  fail(`installed pack missing at ${startpackRoot}`);
}
ok('npm install @zeus/startpack-delta (via file tarball) OK');

// 3. Load pack
const { loadStartPack } = await import(
  `file://${startpackRoot.replace(/\\/g, '/')}/index.mjs`
);
const pack = loadStartPack({ root: startpackRoot });
if (pack.game !== 'delta') fail(`expected delta, got ${pack.game}`);
if (!pack.gamemap?.startPack?.includes('aleph-tronco-puro')) fail('gamemap startPack incomplete');
ok(`loadStartPack gamemap=${pack.gamemap.id} volumes=${pack.volumesRoot}`);

// 4. Resolve zeus sdk for authority deps
const { resolveZeusSdkRoot } = require(join(LIBRARY_ROOT, 'scripts/zeus-sdk-root.cjs'));
let sdkRoot;
try {
  sdkRoot = resolveZeusSdkRoot();
} catch (e) {
  fail(`ZEUS_SDK_ROOT: ${e.message}`);
}

// 5. Start authority briefly with start pack
const authorityEntry = join(
  LIBRARY_ROOT,
  'packages/delta/arg-demos/apps/authority/index.mjs'
);
const child = spawn(process.execPath, [authorityEntry], {
  cwd: LIBRARY_ROOT,
  env: {
    ...process.env,
    ZEUS_STARTPACK_ROOT: startpackRoot,
    ZEUS_STARTPACK_REQUIRED: '1',
    ZEUS_ARG_FEEDS: 'synthetic',
    ZEUS_SDK_ROOT: sdkRoot,
    ZEUS_OPEN_BROWSER: '0'
  },
  stdio: ['ignore', 'pipe', 'pipe']
});

let stdout = '';
let stderr = '';
child.stdout.on('data', (b) => {
  stdout += b.toString();
});
child.stderr.on('data', (b) => {
  stderr += b.toString();
});

const started = await waitFor(
  () => /start pack @zeus\/startpack-delta/.test(stdout) && /delta authority/.test(stdout),
  15000
);
if (!started) {
  child.kill('SIGTERM');
  fail(`authority did not announce start pack.\nstdout:\n${stdout}\nstderr:\n${stderr}`);
}
ok('authority arrancó ronda desde start pack');

child.kill('SIGTERM');
await new Promise((r) => child.once('close', r));

// cleanup staging (keep .release-startpack for release upload)
try {
  rmSync(staging, { recursive: true, force: true });
} catch {
  /* ignore */
}

console.log('\n🟢 e2e:startpack OK\n');

function writePackageJson(dir) {
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify({ name: 'startpack-e2e-staging', private: true, type: 'module' }, null, 2)
  );
}

function waitFor(pred, ms) {
  const start = Date.now();
  return new Promise((resolve) => {
    const t = setInterval(() => {
      if (pred()) {
        clearInterval(t);
        resolve(true);
      } else if (Date.now() - start > ms) {
        clearInterval(t);
        resolve(false);
      }
    }, 100);
  });
}

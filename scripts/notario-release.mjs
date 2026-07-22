#!/usr/bin/env node
/**
 * Notario — pipeline de release de start packs (WP-U62 / ARG WP-20/23 spirit).
 *
 * Una ronda → paquete `@zeus/startpack-<game>` + acta + tarball.
 * Canal primario: registry propio (NPM_USERNAME+PASSWORD D-24 (a), o NPM_TOKEN).
 * Espejo: GitHub Release.
 *
 * Uso:
 *   node scripts/notario-release.mjs --game delta
 *   node scripts/notario-release.mjs --game pozo --publish-github
 *   node scripts/notario-release.mjs --game delta --dry-run
 *
 * Sin secretos en el árbol. No sube .env.
 */

import {
  mkdirSync,
  writeFileSync,
  copyFileSync,
  existsSync
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';
import { resolveStartpackGame, listStartpackGames } from './lib/startpack-games.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LIBRARY_ROOT = join(__dirname, '..');
const OUT_DIR = join(LIBRARY_ROOT, '.release-startpack');

function parseArgs(argv) {
  const out = {
    game: null,
    dryRun: false,
    publishGithub: false,
    publishNpm: false,
    skipTests: false
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--game') out.game = argv[++i];
    else if (a === '--dry-run') out.dryRun = true;
    else if (a === '--publish-github') out.publishGithub = true;
    else if (a === '--publish-npm') out.publishNpm = true;
    else if (a === '--skip-tests') out.skipTests = true;
    else if (a === '--help' || a === '-h') out.help = true;
  }
  return out;
}

function run(cmd, args, opts = {}) {
  const res = spawnSync(cmd, args, {
    cwd: opts.cwd || LIBRARY_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32',
    env: { ...process.env, ...(opts.env || {}) }
  });
  if (res.status !== 0) {
    const err = (res.stderr || res.stdout || '').trim();
    throw new Error(`${cmd} ${args.join(' ')} failed (${res.status}): ${err}`);
  }
  return (res.stdout || '').trim();
}

function gitShort() {
  try {
    return run('git', ['rev-parse', '--short', 'HEAD']);
  } catch {
    return 'unknown';
  }
}

/**
 * Valida el pack cargando loadStartPack y comprobando archivos clave.
 * @param {import('./lib/startpack-games.mjs').StartpackGame} entry
 */
async function validatePack(entry) {
  const pkgRoot = join(LIBRARY_ROOT, entry.dir);
  const mod = await import(pathToFileURL(join(pkgRoot, 'index.mjs')).href);
  const pack = mod.loadStartPack({ root: pkgRoot });
  const checks = [];

  const push = (id, ok, detail = '') => checks.push({ id, ok, detail });

  push('loadStartPack', Boolean(pack?.manifest), `game=${pack?.game}`);
  push(
    'volumes.json',
    existsSync(join(pack.volumesRoot, 'volumes.json')),
    pack.volumesRoot
  );
  push('acta', existsSync(pack.actaPath), pack.actaPath);
  push('gamemap', Boolean(pack.gamemap?.id), pack.gamemap?.id || '');

  if (entry.game === 'delta') {
    push(
      'presets',
      Array.isArray(pack.presets) && pack.presets.length > 0,
      `n=${pack.presets?.length ?? 0}`
    );
    push(
      'startPack',
      Array.isArray(pack.gamemap?.startPack) && pack.gamemap.startPack.length > 0,
      (pack.gamemap?.startPack || []).join(',')
    );
  }

  const failed = checks.filter((c) => !c.ok);
  return { pack, checks, ok: failed.length === 0, failed };
}

function writeActa(entry, { pack, checks, commit, date }) {
  const lines = [
    `# Acta — ${entry.packageName} v${pack.version}`,
    '',
    'Rellenada por el Notario (`scripts/notario-release.mjs`). Sin acta no hay release.',
    '',
    '| dato | valor |',
    '| ---- | ----- |',
    `| game | ${entry.game} |`,
    `| package | \`${entry.packageName}\` |`,
    `| version | ${pack.version} |`,
    `| fecha | ${date} |`,
    `| commit | ${commit} |`,
    `| volumesRoot | \`${pack.volumesRoot}\` |`,
    '',
    '## Gates de esta pasada',
    '',
    '| gate | resultado | detalle |',
    '| ---- | --------- | ------- |'
  ];
  for (const c of checks) {
    lines.push(`| ${c.id} | ${c.ok ? '✅' : '❌'} | ${c.detail || ''} |`);
  }
  lines.push('', '## Notas', '', 'Generado automáticamente en WP-U62.', '');
  writeFileSync(pack.actaPath, lines.join('\n'), 'utf8');
  return pack.actaPath;
}

function npmPack(entry) {
  mkdirSync(OUT_DIR, { recursive: true });
  const pkgRoot = join(LIBRARY_ROOT, entry.dir);
  const out = run('npm', ['pack', '--pack-destination', OUT_DIR], { cwd: pkgRoot });
  // npm pack prints the filename on the last line
  const lines = out.split(/\r?\n/).filter(Boolean);
  const filename = lines[lines.length - 1];
  const tarball = join(OUT_DIR, filename);
  if (!existsSync(tarball)) {
    throw new Error(`npm pack did not produce ${tarball}; output:\n${out}`);
  }
  return tarball;
}

function publishGithubRelease(entry, { version, tarball, actaPath, dryRun }) {
  const tag = `startpack-${entry.game}-v${version}`;
  const title = `${entry.packageName}@${version}`;
  const notesPath = join(OUT_DIR, `notes-${entry.game}.md`);
  const notes = [
    `Start pack release for **${entry.game}** (WP-U62).`,
    '',
    `- Package: ${entry.packageName}`,
    `- Tarball: ${tarball.split(/[/\\\\]/).pop()}`,
    `- Acta: included as release asset`,
    '',
    'Registry publish may be gated (NPM_TOKEN). Install via tarball asset if needed.'
  ].join('\n');
  writeFileSync(notesPath, notes, 'utf8');

  if (dryRun) {
    console.log(`[dry-run] gh release create ${tag} ${tarball} ${actaPath}`);
    return { tag, skipped: true };
  }

  // Delete existing tag/release if re-running same version (idempotent local ops)
  const existing = spawnSync('gh', ['release', 'view', tag], {
    cwd: LIBRARY_ROOT,
    encoding: 'utf8',
    shell: process.platform === 'win32'
  });
  if (existing.status === 0) {
    run('gh', ['release', 'delete', tag, '--yes', '--cleanup-tag']);
  }

  run('gh', [
    'release',
    'create',
    tag,
    tarball,
    actaPath,
    '--title',
    title,
    '--notes-file',
    notesPath
  ]);
  return { tag, skipped: false };
}

function publishNpm(entry, { dryRun }) {
  // D-24 (a): NPM_USERNAME + NPM_PASSWORD → .npmrc username/_password.
  // Legacy: NPM_TOKEN bearer. Cualquiera basta para no skippear.
  const token = process.env.NPM_TOKEN;
  const hasBasic =
    Boolean(process.env.NPM_USERNAME) && Boolean(process.env.NPM_PASSWORD);
  if (!token && !hasBasic) {
    console.log(
      '⏳ npm publish skipped: NPM_TOKEN / NPM_USERNAME+PASSWORD absent (ops gated)'
    );
    return { skipped: true, reason: 'auth absent' };
  }
  const pkgRoot = join(LIBRARY_ROOT, entry.dir);
  if (dryRun) {
    console.log(`[dry-run] npm publish -w ${entry.packageName}`);
    return { skipped: true, reason: 'dry-run' };
  }
  const env = {};
  if (token) {
    // npmrc may map //registry/:_authToken=${NPM_TOKEN}
    env.NPM_TOKEN = token;
  }
  run('npm', ['publish', '--access', 'public'], {
    cwd: pkgRoot,
    env
  });
  return { skipped: false };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || !args.game) {
    console.log(`Usage: notario-release.mjs --game <${listStartpackGames().join('|')}> [--publish-github] [--publish-npm] [--dry-run]`);
    process.exit(args.help ? 0 : 1);
  }

  const entry = resolveStartpackGame(args.game);
  const date = new Date().toISOString().slice(0, 10);
  const commit = gitShort();

  console.log(`\n📜 Notario · game=${entry.game} · pkg=${entry.packageName}\n`);

  if (!args.skipTests) {
    run('npm', ['test', '-w', entry.packageName]);
  }

  const validation = await validatePack(entry);
  if (!validation.ok) {
    console.error('Validation failed:', validation.failed);
    process.exit(1);
  }

  const actaPath = writeActa(entry, {
    pack: validation.pack,
    checks: validation.checks,
    commit,
    date
  });
  console.log(`acta written: ${actaPath}`);

  // Re-validate after acta write
  const post = await validatePack(entry);
  if (!post.ok) {
    console.error('Post-acta validation failed:', post.failed);
    process.exit(1);
  }

  const tarball = npmPack(entry);
  console.log(`tarball: ${tarball}`);

  // Copy acta next to tarball for convenience
  const actaCopy = join(OUT_DIR, `ACTA-${entry.game}-v${validation.pack.version}.md`);
  copyFileSync(actaPath, actaCopy);

  let gh = { skipped: true, reason: 'not requested' };
  if (args.publishGithub) {
    gh = publishGithubRelease(entry, {
      version: validation.pack.version,
      tarball,
      actaPath: actaCopy,
      dryRun: args.dryRun
    });
    console.log(`GitHub Release: ${gh.tag}${gh.skipped ? ' (dry-run/skip)' : ' OK'}`);
  }

  let npm = { skipped: true, reason: 'not requested' };
  if (args.publishNpm) {
    npm = publishNpm(entry, { dryRun: args.dryRun });
  }

  const summary = {
    game: entry.game,
    package: entry.packageName,
    version: validation.pack.version,
    tarball,
    acta: actaCopy,
    checks: validation.checks,
    github: gh,
    npm
  };
  writeFileSync(join(OUT_DIR, `summary-${entry.game}.json`), JSON.stringify(summary, null, 2));
  console.log('\n✅ Notario done');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

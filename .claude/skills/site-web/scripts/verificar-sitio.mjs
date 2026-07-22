#!/usr/bin/env node
// verificar-sitio.mjs — gate de verificación de un sitio estático generado.
// Método marco-agnóstico: parametrizá DIST / BASE por env o args. Sin deps
// (solo Node ≥18: fs, path, fetch global).
//
// Verifica sobre el `dist/` YA construido (no sobre el markdown fuente —
// así cubre también los hrefs que emiten componentes .vue, que el
// `ignoreDeadLinks` de VitePress no revisa):
//   1) ENLACES: cada <a href> / <link href> / <img|script src> interno
//      resuelve a un fichero real (respeta `base` + `cleanUrls`); las
//      anclas `#id` existen en la página destino. Externos http(s) →
//      WARNING (no bloquean; ver DC-5 del mundo-fuente).
//   2) VERDAD DE CONTENIDO (opcional): si existe un manifiesto de
//      aserciones (VERDAD, default `<DIST>/../verdad-checks.json`), valida
//      patrones que DEBEN o NO DEBEN aparecer en el HTML generado.
//
// Exit ≠ 0 si hay enlace interno/ancla roto o aserción de verdad fallida.
// Externos rotos: exit 0 (solo se listan como warning).
//
// Uso:
//   node verificar-sitio.mjs [--dist <dir>] [--base </sub/>] [--no-external]
//   DIST=docs/.vitepress/dist BASE=/ EXTERNAL=0 node verificar-sitio.mjs

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, posix } from 'node:path';

// ---- parámetros ----
const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const DIST = arg('--dist', process.env.DIST || 'docs/.vitepress/dist');
let BASE = arg('--base', process.env.BASE || '/');
// Guard MSYS/Windows (frágil #2): un `/` suelto puede llegar convertido a
// `/C:/…` por conversión de rutas de Git Bash. Si parece ruta de disco,
// es base raíz.
if (/^\/?[A-Za-z]:[\\/]/.test(BASE)) BASE = '/';
if (!BASE.startsWith('/')) BASE = '/' + BASE;
if (!BASE.endsWith('/')) BASE += '/';
const CHECK_EXTERNAL =
  !argv.includes('--no-external') && process.env.EXTERNAL !== '0';
const VERDAD = arg('--verdad', process.env.VERDAD || join(DIST, '..', 'verdad-checks.json'));

if (!existsSync(DIST)) {
  console.error(`[verificar-sitio] dist inexistente: ${DIST}\n  ¿corriste 'npm run docs:build' antes?`);
  process.exit(2);
}

// ---- recolectar HTML ----
function walk(dir) {
  const out = [];
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else out.push(p);
  }
  return out;
}
const allFiles = walk(DIST);
const htmlFiles = allFiles.filter((f) => f.endsWith('.html'));
// set de rutas existentes relativas al dist, con separador POSIX
const existing = new Set(allFiles.map((f) => relative(DIST, f).split('\\').join('/')));

// cache de ids/anchors por fichero html (id="..." o name="...")
const anchorCache = new Map();
function anchorsOf(relPath) {
  if (anchorCache.has(relPath)) return anchorCache.get(relPath);
  const abs = join(DIST, relPath);
  const set = new Set();
  if (existsSync(abs)) {
    const html = readFileSync(abs, 'utf-8');
    for (const m of html.matchAll(/\s(?:id|name)="([^"]+)"/g)) set.add(m[1]);
  }
  anchorCache.set(relPath, set);
  return set;
}

// resuelve una ruta interna (sin #ancla) → fichero relativo existente o null
function resolveInternal(linkPath, fromRel) {
  let p = linkPath.split('?')[0];
  try {
    p = decodeURIComponent(p);
  } catch {}
  if (p.startsWith('/')) {
    // absoluta: quitar base
    if (BASE !== '/' && p.startsWith(BASE)) p = '/' + p.slice(BASE.length);
    p = p.replace(/^\/+/, '');
  } else {
    // relativa al directorio del fichero actual
    p = posix.normalize(posix.join(posix.dirname(fromRel), p));
  }
  if (p === '' || p.endsWith('/')) p = posix.join(p, 'index.html');
  const cands = [p];
  if (!p.endsWith('.html')) cands.push(p + '.html', posix.join(p, 'index.html'));
  for (const c of cands) if (existing.has(c)) return c;
  return null;
}

// ---- barrer enlaces ----
const brokenInternal = [];
const brokenAnchor = [];
const externals = new Map(); // url -> Set(fromRel)
const linkRe = /(?:href|src)="([^"]*)"/g;

for (const f of htmlFiles) {
  const rel = relative(DIST, f).split('\\').join('/');
  const html = readFileSync(f, 'utf-8');
  for (const m of html.matchAll(linkRe)) {
    const raw = m[1].trim();
    if (!raw) continue;
    if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) continue;
    if (/^https?:\/\//i.test(raw)) {
      if (!externals.has(raw)) externals.set(raw, new Set());
      externals.get(raw).add(rel);
      continue;
    }
    if (raw.startsWith('//')) continue; // protocol-relative externo
    // interno (con posible ancla)
    const hashIdx = raw.indexOf('#');
    const linkPath = hashIdx >= 0 ? raw.slice(0, hashIdx) : raw;
    const anchor = hashIdx >= 0 ? raw.slice(hashIdx + 1) : '';
    let targetRel = rel;
    if (linkPath !== '') {
      const r = resolveInternal(linkPath, rel);
      if (!r) {
        brokenInternal.push({ from: rel, link: raw });
        continue;
      }
      targetRel = r;
    }
    if (anchor && !anchorsOf(targetRel).has(anchor)) {
      brokenAnchor.push({ from: rel, link: raw, target: targetRel });
    }
  }
}

// ---- externos (warning; nunca bloquean) ----
const externalWarn = [];
if (CHECK_EXTERNAL && externals.size) {
  for (const [url, froms] of externals) {
    let ok = false;
    let note = '';
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 8000);
      const res = await fetch(url, { method: 'GET', redirect: 'follow', signal: ctrl.signal });
      clearTimeout(t);
      ok = res.status < 400;
      note = String(res.status);
    } catch (e) {
      note = e.name === 'AbortError' ? 'timeout' : (e.cause?.code || e.message || 'error');
    }
    if (!ok) externalWarn.push({ url, note, from: [...froms][0] });
  }
}

// ---- verdad de contenido (opcional) ----
const verdadFail = [];
if (existsSync(VERDAD)) {
  let corpus = '';
  for (const f of htmlFiles) corpus += readFileSync(f, 'utf-8');
  let checks = [];
  try {
    checks = JSON.parse(readFileSync(VERDAD, 'utf-8'));
  } catch (e) {
    console.error(`[verificar-sitio] manifiesto de verdad ilegible: ${VERDAD} (${e.message})`);
    process.exit(2);
  }
  for (const c of checks) {
    const re = new RegExp(c.patron, c.flags || '');
    const found = re.test(corpus);
    const debe = c.noDebeAparecer ? !found : found;
    if (!debe) verdadFail.push(c);
  }
}

// ---- informe ----
const nHtml = htmlFiles.length;
console.log(`[verificar-sitio] dist=${DIST} base=${BASE} html=${nHtml}`);
console.log(`  enlaces internos rotos: ${brokenInternal.length}`);
console.log(`  anclas rotas:           ${brokenAnchor.length}`);
console.log(`  externos revisados:     ${CHECK_EXTERNAL ? externals.size : 'omitido'}${CHECK_EXTERNAL ? ` (warning: ${externalWarn.length})` : ''}`);
if (existsSync(VERDAD)) console.log(`  verdad de contenido:    ${verdadFail.length} fallo(s)`);

for (const b of brokenInternal) console.log(`  ✗ INTERNO ${b.from} → ${b.link}`);
for (const b of brokenAnchor) console.log(`  ✗ ANCLA   ${b.from} → ${b.link} (destino ${b.target})`);
for (const w of externalWarn) console.log(`  ⚠ EXTERNO ${w.note} ${w.url}  (en ${w.from})`);
for (const v of verdadFail) console.log(`  ✗ VERDAD  ${v.descripcion || v.patron}`);

const fail = brokenInternal.length + brokenAnchor.length + verdadFail.length;
if (fail > 0) {
  console.error(`\n[verificar-sitio] FALLO: ${fail} problema(s) que bloquean el deploy.`);
  process.exit(1);
}
console.log(`\n[verificar-sitio] OK: enlaces internos y anclas resuelven; verdad de contenido consistente.`);

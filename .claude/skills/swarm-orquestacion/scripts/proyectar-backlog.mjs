#!/usr/bin/env node
// proyectar-backlog.mjs — proyección del backlog local a un tracker de
// issues, SIN sync bidireccional. Marco-agnóstico; sin deps (Node ≥18 +
// `gh` CLI autenticado para el adaptador GitHub).
//
// Modelo (DC-10..DC-14): el markdown local es la FUENTE DE VERDAD; los
// issues son proyección desechable. `export` va local→remoto (idempotente);
// `import` trae lo remoto a un INBOX que el orquestador reconcilia a mano
// (jamás escribe el BACKLOG). Mapeo: ✅→closed, ⬜/🔶→open (sin labels).
//
// GATE DE CEGUERA (DC-12): antes de exportar a un tracker PÚBLICO, el
// contenido se valida contra CEGUERA_PATTERN (regex del mundo, vía env —
// NUNCA se almacena en el skill). Sin patrón → se rehúsa (fail-safe).
//
// MODO POR DEFECTO: LOCAL-ONLY (DC-15). El `export` real a GitHub exige
// opt-in explícito (`--habilitar-github` / `PROYECCION_GITHUB=1`); sin él
// rehúsa. El `--dry-run` (preview, sin API) se permite siempre.
//
// Uso:
//   # preview (sin API, sin opt-in):
//   CEGUERA_PATTERN='tok1|tok2' node proyectar-backlog.mjs export --dry-run
//   # proyección real (solo si el usuario lo pidió):
//   CEGUERA_PATTERN='tok1|tok2' PROYECCION_GITHUB=1 node proyectar-backlog.mjs export [--alcance todos|abiertos] [--repo owner/name]
//   node proyectar-backlog.mjs import [--dry-run] [--repo owner/name]
//
// --alcance (DC-20): `todos` (default) proyecta todo el backlog; `abiertos`
//   solo ⬜/🔶. Auto-cierre (DC-19): los issues del sync-map fuera del
//   conjunto proyectado se cierran y salen del map.
//   [--backlog plan/BACKLOG.md] [--map plan/.sync-map.json] [--inbox plan/INBOX-GH.md]

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const argv = process.argv.slice(2);
const MODE = argv[0];
const has = (f) => argv.includes(f);
const val = (f, d) => {
  const i = argv.indexOf(f);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const BACKLOG = val('--backlog', 'plan/BACKLOG.md');
const MAP = val('--map', 'plan/.sync-map.json');
const INBOX = val('--inbox', 'plan/INBOX-GH.md');
const REPO = val('--repo', ''); // vacío = gh infiere del cwd
const DRY = has('--dry-run');

if (!['export', 'import'].includes(MODE)) {
  console.error('uso: proyectar-backlog.mjs <export|import> [--dry-run] [--repo o/n]');
  process.exit(2);
}
if (!existsSync(BACKLOG)) {
  console.error(`[proyectar] BACKLOG inexistente: ${BACKLOG}`);
  process.exit(2);
}

// --- parser de WPs del backlog ---
// Item: `- <estado> **WP-XX · título**` + cuerpo hasta el próximo `- ` o `## `.
function parseBacklog(text) {
  const lines = text.split(/\r?\n/);
  const wps = [];
  const head = /^- \s*(⬜|🔶|✅)\s*\*\*(WP-[A-Za-z0-9]+)\s*·\s*(.+?)\*\*/;
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(head);
    if (!m) continue;
    const [, estado, id, titulo] = m;
    const body = [lines[i]];
    let j = i + 1;
    for (; j < lines.length; j++) {
      if (/^- \s*(⬜|🔶|✅)/.test(lines[j]) || /^#{2,3}\s/.test(lines[j])) break;
      body.push(lines[j]);
    }
    wps.push({ id, estado, titulo: titulo.trim(), body: body.join('\n').trim() });
    i = j - 1;
  }
  return wps;
}

// --- gate de ceguera (DC-12) ---
function cegueraGate(wps) {
  const pattern = process.env.CEGUERA_PATTERN;
  if (!pattern) {
    console.error('[proyectar] CEGUERA_PATTERN no definido: se rehúsa exportar a un tracker público sin prueba de ceguera (DC-12).');
    process.exit(3);
  }
  const re = new RegExp(pattern, 'i');
  const hits = [];
  for (const w of wps) {
    const blob = `${w.id} ${w.titulo}\n${w.body}`;
    if (re.test(blob)) hits.push(w.id);
  }
  if (hits.length) {
    console.error(`[proyectar] CEGUERA FALLA: tokens de marco en ${hits.join(', ')}. No se proyecta.`);
    process.exit(1);
  }
  console.log(`[proyectar] ceguera OK (${wps.length} WP validados contra el patrón del mundo).`);
}

// --- adaptador GitHub (gh) ---
function gh(args) {
  const full = REPO ? [...args, '--repo', REPO] : args;
  return execFileSync('gh', full, { encoding: 'utf-8' }).trim();
}

function issueBody(w) {
  return [
    `<!-- proyeccion:${w.id} -->`,
    '> **Proyección generada** del backlog local (fuente de verdad única).',
    '> Comentad, **no editéis** — los comentarios entran por inbox y los',
    '> reconcilia el orquestador; los cambios en la web no persisten.',
    '',
    w.body,
  ].join('\n');
}

function loadMap() {
  if (!existsSync(MAP)) return {};
  try {
    return JSON.parse(readFileSync(MAP, 'utf-8'));
  } catch {
    return {};
  }
}

function doExport() {
  // Candado de modo (DC-15): local-only por defecto. La proyección real a
  // GitHub exige opt-in EXPLÍCITO del usuario. El dry-run (preview, sin
  // API) se permite siempre.
  if (!DRY) {
    const optin = has('--habilitar-github') || process.env.PROYECCION_GITHUB === '1';
    if (!optin) {
      console.error('[proyectar] proyección a GitHub DESHABILITADA por defecto (local-only, DC-15).');
      console.error('  Actívala solo si el usuario lo pidió: --habilitar-github o PROYECCION_GITHUB=1.');
      console.error('  (Para previsualizar sin tocar la API: añade --dry-run.)');
      process.exit(4);
    }
  }
  const alcance = val('--alcance', process.env.ALCANCE || 'todos'); // todos | abiertos
  if (!['todos', 'abiertos'].includes(alcance)) {
    console.error(`[proyectar] --alcance inválido: ${alcance} (usa todos|abiertos)`);
    process.exit(2);
  }
  const wps = parseBacklog(readFileSync(BACKLOG, 'utf-8'));
  // Conjunto proyectado según alcance (DC-20): 'abiertos' = solo ⬜/🔶.
  const proyectados = alcance === 'abiertos' ? wps.filter((w) => w.estado !== '✅') : wps;
  cegueraGate(proyectados);
  const map = loadMap();
  const enConjunto = new Set(proyectados.map((w) => w.id));

  const plan = [];
  for (const w of proyectados) {
    const cerrado = w.estado === '✅';
    const num = map[w.id];
    if (!num) plan.push({ w, accion: 'crear', estado: cerrado ? 'closed' : 'open' });
    else plan.push({ w, num, accion: 'actualizar', estado: cerrado ? 'closed' : 'open' });
  }
  // Auto-cierre (DC-19): issue del map cuyo WP no está en el conjunto
  // proyectado (retirado del backlog, o excluido por alcance) → cerrar.
  for (const [id, num] of Object.entries(map)) {
    if (!enConjunto.has(id)) plan.push({ w: { id }, num, accion: 'cerrar-sobrante', estado: 'closed' });
  }

  const nCierres = plan.filter((p) => p.accion === 'cerrar-sobrante').length;
  console.log(`[proyectar] export ${DRY ? '(DRY-RUN)' : ''} · alcance=${alcance} · ${proyectados.length} proyectado(s), ${nCierres} a cerrar · repo=${REPO || '(cwd)'}`);
  for (const p of plan) {
    const etiqueta = `${p.accion} ${p.w.id} → ${p.estado}${p.num ? ` (#${p.num})` : ''}`;
    if (DRY) {
      console.log(`  · ${etiqueta}`);
      continue;
    }
    if (p.accion === 'cerrar-sobrante') {
      try {
        gh(['issue', 'close', String(p.num), '--comment', 'Cerrado por proyección: el WP ya no está en el conjunto proyectado del backlog (fuente de verdad).']);
      } catch {}
      delete map[p.w.id];
      console.log(`  ✓ cerrado sobrante ${p.w.id} → #${p.num}`);
      continue;
    }
    const title = `${p.w.id} · ${p.w.titulo}`;
    const body = issueBody(p.w);
    if (p.accion === 'crear') {
      const url = gh(['issue', 'create', '--title', title, '--body', body]);
      const num = Number(url.split('/').pop());
      map[p.w.id] = num;
      if (p.estado === 'closed') try { gh(['issue', 'close', String(num)]); } catch {}
      console.log(`  ✓ creado ${p.w.id} → #${num} (${p.estado})`);
    } else {
      gh(['issue', 'edit', String(p.num), '--title', title, '--body', body]);
      try {
        if (p.estado === 'closed') gh(['issue', 'close', String(p.num)]);
        else gh(['issue', 'reopen', String(p.num)]);
      } catch {}
      console.log(`  ✓ actualizado ${p.w.id} → #${p.num} (${p.estado})`);
    }
  }
  if (!DRY) {
    writeFileSync(MAP, JSON.stringify(map, null, 2) + '\n');
    console.log(`[proyectar] sync-map → ${MAP}`);
  }
  console.log('[proyectar] OK.');
}

function doImport() {
  const map = loadMap();
  const ids = Object.entries(map);
  console.log(`[proyectar] import ${DRY ? '(DRY-RUN)' : ''} · ${ids.length} issue(s) mapeados`);
  const entradas = [];
  for (const [id, num] of ids) {
    let data;
    try {
      data = JSON.parse(gh(['issue', 'view', String(num), '--json', 'state,comments,title']));
    } catch (e) {
      entradas.push(`- ${id} (#${num}): no accesible (${e.message.split('\n')[0]})`);
      continue;
    }
    const comentarios = (data.comments || []).filter((c) => c.body && c.body.trim());
    if (comentarios.length) {
      entradas.push(`### ${id} (#${num}) — ${comentarios.length} comentario(s) [state=${data.state}]`);
      for (const c of comentarios) entradas.push(`- @${c.author?.login || '?'}: ${c.body.replace(/\s+/g, ' ').slice(0, 200)}`);
    }
  }
  const contenido = [
    '# INBOX-GH — cola de reconciliación (proyección remota → local)',
    '',
    '> Lo remoto NUNCA escribe el BACKLOG. El orquestador lee esto y decide',
    '> a mano qué llevar al plan. Vaciar tras reconciliar.',
    '',
    entradas.length ? entradas.join('\n') : '_(sin novedades remotas)_',
    '',
  ].join('\n');
  if (DRY) {
    console.log('--- INBOX-GH.md (preview) ---\n' + contenido);
  } else {
    writeFileSync(INBOX, contenido);
    console.log(`[proyectar] inbox → ${INBOX}`);
  }
  console.log('[proyectar] OK.');
}

if (MODE === 'export') doExport();
else doImport();

#!/usr/bin/env node
// verificar-piel-fanzine.mjs — CA estructural C8 anti-regresión (issue #15).
// Sobre dist/ ya construido: la HOME debe tener clases de la piel fanzine
// (stamp / washi / callout) y NO el shell DefaultTheme (Layout / VPNav*).
//
// Uso:
//   node verificar-piel-fanzine.mjs [--dist <dir>] [--home <rel>]
//   DIST=docs/.vitepress/dist node verificar-piel-fanzine.mjs
//
// Referencia de familia (solo lectura / documentación del método):
//   https://pub.escrivivir.co/ → fanzine.css + stamp/washi/callout

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}
const DIST = arg('--dist', process.env.DIST || 'docs/.vitepress/dist');
const HOME_REL = arg('--home', process.env.HOME_HTML || 'index.html');
const homePath = join(DIST, HOME_REL);

if (!existsSync(homePath)) {
  console.error(`[verificar-piel-fanzine] home inexistente: ${homePath}`);
  console.error(`  ¿corriste 'npm run docs:build'?`);
  process.exit(2);
}

const html = readFileSync(homePath, 'utf-8');

const mustHave = [
  { re: /class="[^"]*\bstamp\b[^"]*"/, label: 'stamp' },
  { re: /class="[^"]*\bwashi\b[^"]*"/, label: 'washi' },
  { re: /class="[^"]*\bcallout\b[^"]*"/, label: 'callout' }
];

// Shell DefaultTheme en portada = regresión (issue #15)
const mustNot = [
  { re: /class="Layout"/, label: 'class="Layout" (shell VP)' },
  { re: /\bVPNavBar\b/, label: 'VPNavBar' },
  { re: /\bVPNav\b/, label: 'VPNav' },
  { re: /\bVPSidebar\b/, label: 'VPSidebar' }
];

const missing = mustHave.filter((c) => !c.re.test(html)).map((c) => c.label);
const presentBad = mustNot.filter((c) => c.re.test(html)).map((c) => c.label);

console.log(`[verificar-piel-fanzine] home=${homePath}`);
console.log(`  clases piel presentes: ${mustHave.map((c) => c.label).filter((l) => !missing.includes(l)).join(', ') || '(ninguna)'}`);
console.log(`  shell VP ausente:      ${presentBad.length === 0 ? 'sí' : 'NO'}`);

if (missing.length || presentBad.length) {
  for (const m of missing) console.log(`  ✗ FALTA clase piel: ${m}`);
  for (const b of presentBad) console.log(`  ✗ SHELL prohibido en home: ${b}`);
  console.error(
    `\n[verificar-piel-fanzine] FALLO: home sin piel fanzine o con shell DefaultTheme.`
  );
  console.error(
    `  Fix: theme con fanzine.css + Layout.vue (plantillas skill). variables ≠ piel.`
  );
  process.exit(1);
}

console.log(`\n[verificar-piel-fanzine] OK: home con stamp/washi/callout y sin shell VP.`);

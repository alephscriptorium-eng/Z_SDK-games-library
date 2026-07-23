#!/usr/bin/env node
// verificar-piel.mjs — CA estructural «piel DECLARADA renderiza» (issue #18).
// Sustituye el absolutismo «shell ausente» de 0.6.1.
//
// Uso:
//   node verificar-piel.mjs --piel familia-vp|fanzine [--dist <dir>] [--home <rel>]
//   PIEL=familia-vp DIST=docs/.vitepress/dist node verificar-piel.mjs
//
// Sin --piel / PIEL → familia-vp (DEFAULT del método).

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}

const DIST = arg('--dist', process.env.DIST || 'docs/.vitepress/dist');
const HOME_REL = arg('--home', process.env.HOME_HTML || 'index.html');
const PIEL = (arg('--piel', process.env.PIEL || 'familia-vp') || 'familia-vp')
  .trim()
  .toLowerCase();

const CANONICAS = new Set(['familia-vp', 'fanzine']);
if (!CANONICAS.has(PIEL)) {
  console.error(
    `[verificar-piel] piel desconocida: ${PIEL}. Canónicas: familia-vp | fanzine`
  );
  process.exit(2);
}

const homePath = join(DIST, HOME_REL);
if (!existsSync(homePath)) {
  console.error(`[verificar-piel] home inexistente: ${homePath}`);
  console.error(`  ¿corriste 'npm run docs:build'?`);
  process.exit(2);
}

const html = readFileSync(homePath, 'utf-8');

function check(rules) {
  const missing = rules.mustHave
    .filter((c) => !c.re.test(html))
    .map((c) => c.label);
  const presentBad = rules.mustNot
    .filter((c) => c.re.test(html))
    .map((c) => c.label);
  return { missing, presentBad };
}

const RULES = {
  'familia-vp': {
    mustHave: [
      { re: /class="Layout"/, label: 'class="Layout" (shell VP)' },
      { re: /\bVPNavBar\b/, label: 'VPNavBar' },
      {
        re: /VPSocialLink|icon-github|github\.com|social-links/i,
        label: 'socialLinks GitHub (señal)'
      }
    ],
    mustNot: [
      { re: /class="[^"]*\bstamp\b[^"]*"/, label: 'stamp (fanzine en DEFAULT)' },
      { re: /class="[^"]*\bwashi\b[^"]*"/, label: 'washi (fanzine en DEFAULT)' }
    ]
  },
  fanzine: {
    mustHave: [
      { re: /class="[^"]*\bstamp\b[^"]*"/, label: 'stamp' },
      { re: /class="[^"]*\bwashi\b[^"]*"/, label: 'washi' },
      { re: /class="[^"]*\bcallout\b[^"]*"/, label: 'callout' }
    ],
    mustNot: [
      { re: /class="Layout"/, label: 'class="Layout" (shell VP en home fanzine)' },
      { re: /\bVPNavBar\b/, label: 'VPNavBar' },
      { re: /\bVPSidebar\b/, label: 'VPSidebar' }
    ]
  }
};

const { missing, presentBad } = check(RULES[PIEL]);

console.log(`[verificar-piel] piel=${PIEL} home=${homePath}`);
console.log(
  `  señales OK: ${RULES[PIEL].mustHave
    .map((c) => c.label)
    .filter((l) => !missing.includes(l))
    .join(', ') || '(ninguna)'}`
);
console.log(
  `  señales prohibidas ausentes: ${presentBad.length === 0 ? 'sí' : 'NO'}`
);

if (missing.length || presentBad.length) {
  for (const m of missing) console.log(`  ✗ FALTA: ${m}`);
  for (const b of presentBad) console.log(`  ✗ PROHIBIDO presente: ${b}`);
  console.error(
    `\n[verificar-piel] FALLO: piel declarada «${PIEL}» no renderiza.`
  );
  console.error(
    `  Fix: plantillas de la piel + declaración en calibración/frontmatter.`
  );
  process.exit(1);
}

console.log(`\n[verificar-piel] OK: piel «${PIEL}» renderiza en home.`);

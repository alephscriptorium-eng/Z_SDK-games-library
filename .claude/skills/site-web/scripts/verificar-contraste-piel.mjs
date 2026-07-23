#!/usr/bin/env node
// verificar-contraste-piel.mjs — CA contraste/a11y issue #18.
// Comprueba que el CSS de la piel remapea pares VP que colapsan
// (brand soft = tinta, hover sin inversión, etc.).
//
// Uso:
//   node verificar-contraste-piel.mjs --piel familia-vp|fanzine [--css <path>]
//   PIEL=fanzine node verificar-contraste-piel.mjs

import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dir = dirname(fileURLToPath(import.meta.url));
const PLANTILLAS = join(__dir, '..', 'reference', 'plantillas');

const argv = process.argv.slice(2);
function arg(name, def) {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
}

const PIEL = (arg('--piel', process.env.PIEL || 'familia-vp') || 'familia-vp')
  .trim()
  .toLowerCase();

const DEFAULT_CSS = {
  'familia-vp': join(PLANTILLAS, 'familia-vp.css'),
  fanzine: join(PLANTILLAS, 'fanzine.css')
};

const cssPath = arg('--css', DEFAULT_CSS[PIEL]);
if (!cssPath || !existsSync(cssPath)) {
  console.error(`[verificar-contraste-piel] CSS inexistente: ${cssPath}`);
  process.exit(2);
}

const css = readFileSync(cssPath, 'utf-8');

/** Colapso prohibido: brand-soft apuntando a tinta/ink (fondo=texto). */
const COLAPSO_SOFT =
  /--vp-c-brand-soft\s*:\s*var\(--(?:zine-ink|vp-c-brand-1|vp-c-text-1)\)/;

const REQUIRED = {
  'familia-vp': [
    {
      re: /--vp-c-brand-soft\s*:\s*var\(--zine-gray-soft\)/,
      label: 'brand-soft = gray-soft (no tinta)'
    },
    {
      re: /\.VPDoc a:hover[\s\S]{0,120}background:\s*var\(--zine-ink\)/,
      label: 'hover enlace: fondo tinta'
    },
    {
      re: /\.VPDoc a:hover[\s\S]{0,160}color:\s*var\(--zine-paper\)/,
      label: 'hover enlace: texto papel'
    },
    {
      re: /\.VPDoc a\s*\{[\s\S]{0,80}color:\s*var\(--zine-ink\)/,
      label: 'enlace base: texto tinta'
    }
  ],
  fanzine: [
    {
      re: /\.zine-main\s+a\b/,
      label: 'composición VP: enlaces bajo .zine-main'
    },
    {
      re: /\.zine-main\s+a:hover[\s\S]{0,120}background:\s*#000/,
      label: 'hover .zine-main: fondo #000'
    },
    {
      re: /\.zine-main\s+a:hover[\s\S]{0,120}color:\s*#fff/,
      label: 'hover .zine-main: texto #fff'
    }
  ]
};

if (!REQUIRED[PIEL]) {
  console.error(`[verificar-contraste-piel] piel desconocida: ${PIEL}`);
  process.exit(2);
}

console.log(`[verificar-contraste-piel] piel=${PIEL} css=${cssPath}`);

if (PIEL === 'familia-vp' && COLAPSO_SOFT.test(css)) {
  console.error(
    `  ✗ COLAPSO: --vp-c-brand-soft apunta a tinta (texto=fondo)`
  );
  process.exit(1);
}

const missing = REQUIRED[PIEL].filter((r) => !r.re.test(css)).map((r) => r.label);
if (missing.length) {
  for (const m of missing) console.log(`  ✗ FALTA remap: ${m}`);
  console.error(
    `\n[verificar-contraste-piel] FALLO: pares de contraste incompletos.`
  );
  process.exit(1);
}

console.log(`  remaps OK: ${REQUIRED[PIEL].map((r) => r.label).join(' · ')}`);
console.log(`\n[verificar-contraste-piel] OK: contraste «${PIEL}» declarado.`);

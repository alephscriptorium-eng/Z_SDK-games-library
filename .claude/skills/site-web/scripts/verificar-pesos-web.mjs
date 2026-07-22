#!/usr/bin/env node
/**
 * CA medible · pesos de assets web (BRAND-2 / LIB-070).
 * Falla si algún fichero emparejado supera --max-kb (default 150).
 *
 * Uso:
 *   node verificar-pesos-web.mjs --dir <dir> [--max-kb 150] [--glob '*.png,*.ico,*.webp']
 */
import { readdirSync, statSync } from 'node:fs';
import { join, resolve, extname } from 'node:path';

function parseArgs(argv) {
  let dir = null;
  let maxKb = 150;
  let exts = new Set(['.png', '.ico', '.webp', '.jpg', '.jpeg', '.gif']);
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dir') dir = resolve(argv[++i] || '');
    else if (a === '--max-kb') maxKb = Number(argv[++i]);
    else if (a === '--ext') {
      exts = new Set(
        String(argv[++i] || '')
          .split(',')
          .map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase()),
      );
    } else if (a === '--help' || a === '-h') {
      console.log(
        'uso: verificar-pesos-web.mjs --dir <dir> [--max-kb 150] [--ext png,ico,webp]',
      );
      process.exit(0);
    }
  }
  if (!dir || Number.isNaN(maxKb) || maxKb <= 0) {
    console.error(
      'uso: verificar-pesos-web.mjs --dir <dir> [--max-kb 150] [--ext png,ico,webp]',
    );
    process.exit(2);
  }
  return { dir, maxKb, exts };
}

const { dir, maxKb, exts } = parseArgs(process.argv.slice(2));
const maxBytes = maxKb * 1024;

let entries;
try {
  entries = readdirSync(dir, { withFileTypes: true });
} catch (e) {
  console.error(`[verificar-pesos-web] no se puede leer: ${dir}`);
  console.error(e.message);
  process.exit(2);
}

const files = entries
  .filter((d) => d.isFile() && exts.has(extname(d.name).toLowerCase()))
  .map((d) => d.name)
  .sort();

if (files.length === 0) {
  console.error(
    `[verificar-pesos-web] FAIL: 0 archivos con extensiones ${[...exts].join(',')} en ${dir}`,
  );
  process.exit(1);
}

const maxBytesLabel = `${maxKb}KB`;
let fail = 0;
for (const name of files) {
  const p = join(dir, name);
  const bytes = statSync(p).size;
  const ok = bytes < maxBytes;
  console.log(
    `${name}: ${bytes} bytes (<${maxBytesLabel}=${ok})`,
  );
  if (!ok) fail++;
}

if (fail > 0) {
  console.error(
    `[verificar-pesos-web] FAIL: ${fail}/${files.length} sobre umbral ${maxBytesLabel}`,
  );
  process.exit(1);
}

console.log(
  `[verificar-pesos-web] OK: ${files.length} archivo(s) < ${maxBytesLabel} en ${dir}`,
);

#!/usr/bin/env node
// verificar-changelog.mjs — gate opt-in del CHANGELOG de GOBIERNO.
// Marco-agnóstico; sin deps (Node ≥18).
//
// Eje de gobierno (DC-23 / práctica CHANGELOG):
//   Un CHANGELOG de gobierno por mundo — WP-id-keyed, derivado del BACKLOG.
//   NO verifica CHANGELOG de paquete (N, changesets/semver, máquina-generados).
//
// Disciplina (C9): el CHANGELOG de gobierno no se inventa — se deriva del
// backlog cerrado. Este gate comprueba:
//   1) Existe la sección de la versión (`## [x.y.z]` o `## x.y.z`).
//   2) Todo WP marcado ✅ en el BACKLOG aparece referenciado en ese CHANGELOG.
// Exit ≠ 0 si falla cualquiera de las dos, o si el rol no es `gobierno`.
//
// Opt-in / parametrizable (adoptable en monorepos):
//   --role gobierno   (obligatorio declarar rol; solo `gobierno` corre el gate)
//   --changelog F     ruta del CHANGELOG de gobierno (no los de paquete)
//   --backlog F       ruta del BACKLOG del mundo
//   --version x.y.z   versión cuya sección se exige
//
// Uso:
//   node verificar-changelog.mjs --role gobierno [--version x.y.z] \
//     [--changelog F] [--backlog F]
//   ROLE=gobierno VERSION=... CHANGELOG=... BACKLOG=... node verificar-changelog.mjs
//
// Monorepo (2º cliente): apuntar --changelog al CHANGELOG de gobierno del
// mundo; dejar fuera packages/*/CHANGELOG.md (otro eje; no pasan por aquí).

import { readFileSync, existsSync } from 'node:fs';

const argv = process.argv.slice(2);

if (argv.includes('--help') || argv.includes('-h')) {
  console.log(`verificar-changelog — gate del CHANGELOG de gobierno (opt-in)

Uso:
  node verificar-changelog.mjs --role gobierno [opciones]

Opciones:
  --role ROLE         Obligatorio. Solo 'gobierno' ejecuta el gate.
                      'paquete' se rechaza: los CHANGELOG de paquete
                      (changesets/semver) son otro eje y no pasan por aquí.
  --version x.y.z     Versión a verificar (o VERSION / package.json)
  --changelog F       Ruta del CHANGELOG de gobierno (default: CHANGELOG.md)
  --backlog F         Ruta del BACKLOG (default: plan/BACKLOG.md)
  -h, --help          Esta ayuda

Monorepo: parametrizar rutas al CHANGELOG de gobierno + BACKLOG del mundo;
no invocar este gate sobre packages/*/CHANGELOG.md.`);
  process.exit(0);
}

const arg = (n, d) => {
  const i = argv.indexOf(n);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : d;
};

const ROLE = (arg('--role', process.env.ROLE || '')).trim().toLowerCase();
const CHANGELOG = arg('--changelog', process.env.CHANGELOG || 'CHANGELOG.md');
const BACKLOG = arg('--backlog', process.env.BACKLOG || 'plan/BACKLOG.md');
let VERSION = arg('--version', process.env.VERSION || '');
if (!VERSION) {
  try {
    VERSION = JSON.parse(readFileSync('package.json', 'utf-8')).version;
  } catch {}
}

// Rol: opt-in explícito. Sin rol → no asumir; con rol ≠ gobierno → rechazar.
if (!ROLE) {
  console.error(
    '[verificar-changelog] falta --role (opt-in). Declarar: --role gobierno\n' +
      '  Este gate solo aplica al CHANGELOG de gobierno (uno/mundo, WP-id-keyed).\n' +
      '  Los CHANGELOG de paquete (N, changesets) no pasan por aquí. Ver --help.',
  );
  process.exit(2);
}
if (ROLE === 'paquete') {
  console.error(
    '[verificar-changelog] rol=paquete rechazado.\n' +
      '  Los CHANGELOG de paquete (changesets/semver) son otro eje; no los\n' +
      '  verifica este gate. Usar --role gobierno sobre el CHANGELOG de gobierno.',
  );
  process.exit(2);
}
if (ROLE !== 'gobierno') {
  console.error(
    `[verificar-changelog] rol desconocido: ${ROLE} (aceptado: gobierno)`,
  );
  process.exit(2);
}

for (const [label, f] of [
  ['CHANGELOG(gobierno)', CHANGELOG],
  ['BACKLOG', BACKLOG],
]) {
  if (!existsSync(f)) {
    console.error(`[verificar-changelog] ${label} inexistente: ${f}`);
    process.exit(2);
  }
}

const changelog = readFileSync(CHANGELOG, 'utf-8');
const backlog = readFileSync(BACKLOG, 'utf-8');

const problemas = [];

// 1) sección de la versión (en el CHANGELOG de gobierno)
if (VERSION) {
  const escaped = VERSION.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const re = new RegExp(`^##\\s*\\[?${escaped}\\]?\\b`, 'm');
  if (!re.test(changelog)) {
    problemas.push(
      `falta la sección del CHANGELOG de gobierno para la versión ${VERSION} (## [${VERSION}] o ## ${VERSION})`,
    );
  }
} else {
  console.error(
    '[verificar-changelog] sin versión (ni --version ni package.json); no se puede verificar la sección',
  );
  process.exit(2);
}

// 2) todo WP ✅ del backlog está en el CHANGELOG de gobierno.
// Solo entradas de lista con marca de estado (`- ✅ **WP-…`); ignora prosa
// que mencione «al ✅» u otros usos del glyph (evita falsos positivos).
const cerrados = new Set();
for (const line of backlog.split(/\r?\n/)) {
  const m = line.match(/^\s*-\s*✅\s+\*{0,2}(WP-[A-Za-z0-9]+)/);
  if (m) cerrados.add(m[1]);
}
const faltan = [...cerrados].filter(
  (wp) => !new RegExp(`\\b${wp}\\b`).test(changelog),
);

console.log(
  `[verificar-changelog] role=gobierno · version=${VERSION} · changelog=${CHANGELOG} · WP ✅ en backlog: ${cerrados.size}`,
);
if (faltan.length) {
  problemas.push(
    `WP cerrados ausentes del CHANGELOG de gobierno: ${faltan.join(', ')}`,
  );
}

if (problemas.length) {
  for (const p of problemas) console.error(`  ✗ ${p}`);
  console.error(
    `\n[verificar-changelog] FALLO: ${problemas.length} problema(s). ` +
      `El CHANGELOG de gobierno debe reflejar el backlog cerrado (copiar, no inventar).`,
  );
  process.exit(1);
}
console.log(
  `[verificar-changelog] OK: CHANGELOG de gobierno ${VERSION} presente y todos los WP ✅ referenciados.`,
);

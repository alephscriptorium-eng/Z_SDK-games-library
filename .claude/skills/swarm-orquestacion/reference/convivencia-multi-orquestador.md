# Convivencia multi-orquestador

Contrato de método cuando **dos o más orquestadores** operan a la vez
sobre el mismo ecosistema (varios territorios de código / gobierno
emparentados). Parametriza «el mundo», «carril» y «territorio hermano».
No nombra mundos reales ni el marco.

**Este fichero es la fuente única del contrato.** Roles y ciclo solo
enlazan; no re-declaran el cuerpo.

## Caso fundante (lección 2026-07-22)

Lección abstracta (no datos de instancia):

```text
eval del desajuste → enmiendas de contrato (v1.1) → reconciliación → PASS
```

Sirve para recordar que la convivencia se **escribe en el método** antes
de despachar obra en paralelo. Cualquier incidente de cruce de carriles
se cierra con enmienda de contrato + evidencia de reconciliación, no con
improvisación en el chat.

## Parámetros

| parámetro | significado |
| --------- | ----------- |
| `carril` | unidad de gobierno + obra con orquestador propio (prefijo de `plan/`, backlog, sprint) |
| `territorio` | árbol de código donde ese orquestador es el único escritor de obra |
| `territorio hermano` | otro repo/carpeta del ecosistema; exclusivo de su carril |
| `vigía` | observador read-only de todos los carriles; no despacha |
| `Rn-<carril>` | etiqueta de ronda del vigía sobre un carril concreto |

## Contrato

### §1 · Partición de obra

Un orquestador por territorio de código. Ningún worker de un carril
escribe fuera del `ALCANCE_DIFF` de su territorio. Si la obra toca un
hermano, la ejecuta el orquestador (o worker) **dueño** de ese hermano.

### §2 · Partición de gobierno

Un escritor por prefijo de `plan/` (un carril = un árbol de gobierno).
**V2 por carril:** un commit de gobierno no mezcla aceptación (✅) con
brief (🔶) de otro WP **ni** mezcla estados de carriles distintos. Cada
carril aplica V2 (`reglas-metodo-v03.md` §V2) en su propio prefijo.

### §3 · Vigía único y rondas `Rn-<carril>`

Hay **un** vigía para el ecosistema. Sus pulsos llevan etiqueta
`Rn-<carril>` (una ronda por carril observado). **Ningún despacho** de
obra o de gobierno de un carril sin gate **PASS** de la ronda vigente de
ese carril. FAIL o silencio ≠ autorización.

### §4 · Territorio hermano exclusivo

Cada territorio hermano tiene dueño de carril. Checkout, worktree y
rama `wp/*` en un hermano solo los abre el carril dueño (o un worker
bajo su brief). Cruzar a un hermano ajeno para «acelerar» es
anti-patrón.

### §5 · REPORTES y BRIEFS bajo el sprint del carril

`REPORTES/`, briefs y entregas viven bajo el sprint / prefijo `plan/`
del **carril** que despachó el WP. Prohibido un cajón compartido de
reportes entre carriles (colisión de nombres y de semántica de ✅).

### §6 · Consumo de raíz

Lectura de la raíz compartida (docs de método, catálogo, registry):
**OK**. Escritura en la raíz: se **encola** al carril dueño/custodio de
ese árbol; el otro carril no la edita «de pasada».

### §7 · E2E por vías permitidas

Pruebas de punta a punta entre territorios solo por estas vías:

1. **Registry limpio** — consumir el artefacto publicado/fijado.
2. **Fixture copiada a scratch** — copia neutra en directorio temporal;
   no el checkout vivo del hermano.
3. **Vía post-gate de identidad peer** — solo tras el gate que el mundo
   declare para peers (p. ej. sello de versión / identidad).

**Prohibido:** checkouts raíz ajenos como dependencia de prueba.

### §8 · Higiene pre-despacho

Antes de marcar 🔶 / abrir BRIEF / lanzar worker, el orquestador del
carril verifica:

```text
[ ] sin worktrees huérfanos conocidos en su territorio (y hermanos que
    él opera)
[ ] sin ramas wp/* mergeadas o abandonadas sin justificar
[ ] git status del plan/ del carril explicado
[ ] ronda Rn-<carril> en PASS (ver §3)
```

Sin esta higiene, no hay despacho. Detalle operativo del rol:
`reference/roles/ORQUESTADOR.md` (apunta aquí; no duplica el contrato).

### §9 · Locks y freeze mutuo

Si aparece un `index.lock` (u homólogo) **sostenido** en un territorio
del ecosistema, se **congelan los pushes de gobierno de ambos carriles**
hasta liberar el lock y auditar. Un lock de un lado no se «sortea»
pusheando gobierno del otro.

## Anti-patrones (resumen)

| Síntoma | Mitigación |
| ------- | ---------- |
| Dos orquestadores escriben el mismo dir | §1 / §4 |
| Un commit mezcla ✅/🔶 de dos carriles | §2 + V2 |
| Despacho sin `Rn-<carril>` PASS | §3 + §8 |
| Reportes en carpeta compartida | §5 |
| E2E vía checkout raíz ajeno | §7 |
| Push de gobierno con lock ajeno vivo | §9 |

## Relación con el resto del método

- Ciclo y roles: enlazan este contrato; no lo reescriben.
- V2 atómico por WP: `reglas-metodo-v03.md` §V2; aquí se **extiende** a
  frontera entre carriles (§2).
- Checklist de cierre de ola: sigue en `reglas-metodo-v05.md`; la higiene
  **pre-despacho** es §8 de este fichero (momento distinto).

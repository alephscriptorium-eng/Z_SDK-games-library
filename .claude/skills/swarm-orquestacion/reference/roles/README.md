# reference/roles — protocolo del swarm

Prompts listos para pegar en el runner. Agnósticos de herramienta: cualquier
agente los consume tal cual. El **mundo** aporta rutas y PRACTICAS locales.

## Roles

| Prompt | Rol | Cuándo |
| ------ | --- | ------ |
| [ORQUESTADOR.md](ORQUESTADOR.md) | Orquestador | Chat principal: estado, asignación, revisión, ✅ |
| [WORKER.md](WORKER.md) | Worker | Chat nuevo por WP: implementar + reportar |
| [REVISION.md](REVISION.md) | Orquestador | Revisar un entregable (reporte + diff) |
| [CORRECCION.md](CORRECCION.md) | Worker | Tras devolución: corregir en la misma rama |
| [BRIEF.md](BRIEF.md) | Orquestador → usuario | Plantilla de brief para lanzar un worker |

## Dónde vive el estado

- **`plan/BACKLOG.md` es del orquestador y vive en la rama principal del
  mundo.** Marca 🔶 al asignar y ✅ al aceptar. El worker no lo edita.
- **El reporte vive en la rama del WP** (`plan/REPORTES/WP-….md`): nombre
  único = sin conflictos; llega a la rama principal con el merge.
- **`plan/DECISIONES.md` §abiertas es del custodio** (humano o rol que el
  mundo declare).

## Repo y worktrees

Un repo (o carpeta) = el mundo. Parámetros: `MUNDO_RAIZ`, `WORKTREE_BASE`,
`ALCANCE_DIFF` (ver SKILL.md).

- Rama `wp/<id>-<slug>` por WP; el brief la declara.
- Paralelismo: un worktree por chat worker:

```bash
git -C "$MUNDO_RAIZ" worktree add "$WORKTREE_BASE/mundo-wp-<id>" -b wp/<id>-<slug>
# al aceptar y mergear: git worktree remove "$WORKTREE_BASE/mundo-wp-<id>"
```

## Flujo

```text
1. Chat orquestador → «Estado del swarm»
2. Orquestador propone lote, marca 🔶 en la rama principal y rellena un BRIEF
3. Usuario abre worktrees + chats worker (WORKER.md + brief)
4. Worker termina → reporte en plan/REPORTES/ (en su rama) → avisa
5. Chat orquestador (REVISION.md + reporte + rama) → ✅ + merge, o devolución
6. Si devuelto: mismo chat worker (CORRECCION.md + comentarios del reporte)
```

## Reglas de oro

1. Un WP = un chat worker = una rama = (si hay paralelo) un worktree.
2. Solo el orquestador escribe en BACKLOG; solo el custodio cierra
   DECISIONES abiertas.
3. Cero escrituras fuera de `ALCANCE_DIFF` del mundo.
4. Ningún sello sin fuente; citar, no copiar árboles ajenos.
5. El brief + `plan/` bastan: no se asume historial de otros chats.
6. ✅ implica autorización de merge.
7. Commits convencionales (`tipo(alcance): resumen`).
8. Los **cinco ejes** (`../ejes-ca.md`) son CA obligatorios por tipo de WP.

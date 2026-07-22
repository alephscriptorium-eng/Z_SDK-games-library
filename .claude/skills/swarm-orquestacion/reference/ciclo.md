# Ciclo prep → worker → revisión → merge

El aislamiento **worktree + rama por WP** previene el conflicto por
construcción. No lo sustituyas. Lo que sigue son las costuras.

## 1. Preparación (orquestador)

1. Ritual de inicio (`ORQUESTADOR.md`).
2. Si el ecosistema es multi-carril: gate de convivencia
   (`reference/convivencia-multi-orquestador.md` — fuente única): higiene
   pre-despacho §8 + `Rn-<carril>` PASS §3. Sin PASS, no hay lote.
3. Elegir lote paralelizable (dependencias, dirs que no se pisen; un
   territorio por orquestador).
4. En la rama principal del **carril**: BACKLOG ⬜→🔶 por cada WP del lote.
5. Rellenar un BRIEF por WP (eje(s) aplicables, `ALCANCE_DIFF`, worktree).
   REPORTES/BRIEFS bajo el sprint del carril (convivencia §5).

## 2. Ejecución (worker)

1. Checkout / worktree según brief.
2. Lectura obligatoria (PRACTICAS, WP, VISION, zona).
3. Implementar solo el CA (+ ejes).
4. Gates verdes; auto-revisión; reporte en la rama del WP.
5. Parar. Sin BACKLOG. Sin merge. Sin push salvo que el mundo lo autorice
   explícitamente para ese entregable.

## 3. Revisión (orquestador)

1. `REVISION.md` + reporte + diff.
2. Verificar CA y eje(s).
3. ✅ → BACKLOG ✅ + merge + limpiar worktree.
   **Merge solo post-aceptación:** la rama `wp/*` entra a la principal
   **únicamente tras** el ✅. Prohibido merge prematuro (pre-STOP /
   pre-aceptación) aunque el tip «parezca listo» o haya CI parcial.
   **Commit de aceptación solo:** no abrir brief/🔶 de otro WP en el
   mismo commit (V2 — `reference/reglas-metodo-v03.md`).
4. Devuelto → comentarios numerados; mismo worker con `CORRECCION.md`.

## 4. Corrección

Misma rama; solo lo pedido; actualizar reporte a `devuelto-corregido`.

## 5. Cierre de ola (orquestador)

Antes de declarar la ola cerrada, ejecutar el checklist de
`reference/reglas-metodo-v05.md`: stash vacío · `plan/` limpio · ramas
`wp/*` mergeadas borradas o justificadas · `git status` explicado ·
worktrees huérfanos removidos · **carpetas de IDE sin markdowns de info de
sesión (solo config funcional) y memoria interna no citada como fuente
(regla 15)** · **run-id VERDE de CI (+ Release/homólogo) citado por cada
repo tocado (regla 16)** · **si hubo proyección: sync-map post-apply, sin
IDs especulativos (regla 17)**.

## 6. Activación de mundo (regla 13)

La activación la ejecuta un agente **fresco** (solo conoce el skill).
No reutilizar un agente con contexto del marco.

## 7. Ceguera (regla 14)

Antes de merge/publish: `comprobar-ceguera.sh` sobre el árbol **y**
`git log -p` sobre el historial reachable. Medir con `grep -c` /
`grep -q`, nunca `grep | head && echo OK`. Fuga intermedia → squash.

## Anti-patrones de costura

| Patrón | Mitigación |
| ------ | ---------- |
| Relanzar worker «muerto» por falta de commits | Señal = mtime del worktree, no cadencia de commits |
| Merge de `wp/*` a principal antes del ✅ | **Merge solo post-aceptación** (caso fundante C05) |
| Dos workers en el mismo dir de entrega | Dirs/ramas distintos; brief declara conflicto |
| Aceptar extracción sin consumidor | Eje I en el BRIEF |
| Demoler y dejar lógica huérfana | Eje II: destino por símbolo |
| Layout sin dedup | Eje III en auditoría |
| Contrato con un solo cliente | Eje IV programado como gate |
| Ocultar al vigía o revelar el marco | Eje V: asimetría de marco |
| Un commit mezcla ✅ de un WP + brief 🔶 de otro | V2: commits de gobierno atómicos (reglas 2+7) |
| Cerrar ola con ramas `wp/*` mergeadas vivas | Checklist cierre (regla 10) |
| Activación con agente que ya conoce el marco | Regla 13: agente fresco |
| Ceguera solo del árbol; fuga en commit intermedio | Regla 14: `git log -p` + squash |
| `grep | head && echo OK` como evidencia | Regla 14 práctica: `grep -c` / `grep -q` |
| Info de sesión en carpeta de IDE / memoria como verdad | Regla 15: solo config funcional; el plan trazado es la única verdad |
| Cerrar ola sin run-id verde de CI/Release | Regla 16: citar run-id por cada repo tocado |
| Commitear sync-map con IDs de issue inventados | Regla 17: apply → mapa real → commit |
| Despacho multi-carril sin `Rn-<carril>` PASS | Convivencia §3 + §8 |
| E2E vía checkout raíz de territorio ajeno | Convivencia §7 (registry / scratch / post-gate) |
| Push de gobierno con `index.lock` sostenido | Convivencia §9: freeze de **ambos** carriles |

## Señal de worker vivo

Trabajo callado + ráfaga final es normal. Un vigía que grita de más empuja
a relanzar — y el relanzamiento duplicado es el incidente que este ciclo
evita. Preferí mtime del worktree frente a «hace N minutos sin commit».

# Reglas de método v0.5 — costuras del swarm

v0.5 = las 15 reglas de v0.4 **sin cambios**
(`reference/reglas-metodo-v04.md` sobre `reglas-metodo-v03.md`) + las
**reglas 16–17** (cierre con evidencia de runner + mapa de proyección
post-apply). Nacen de clases reincidentes en mundos consumidores: ola
«cerrada» sin run-id verde citado, y `.sync-map.json` commiteado con
números de issue especulativos.

## Regla 16 — Cierre de ola cita run-id verde

**Todo cierre de ola que el orquestador acepte cita run-id VERDE de CI y
de Release** (u homólogo del mundo) del tip de **cada repo tocado** en esa
ola. Sin run-id verde citado = la ola **no** está cerrada: el claim carece
de acta de runner.

- Aplica a cada repositorio que la ola haya modificado (raíz del mundo,
  hermanos, libraries publicables, etc.).
- Compatible con la doctrina C8 del vigía: el pulso ya incluye el último
  run de CI de la rama principal; esta regla lo **exige en el acta de
  cierre**, no solo en el pulso.
- Si el mundo no tiene pipeline de Release, citar el gate de publicación
  que el mundo declare (o marcar `<pendiente>` con justificación — no
  inventar un verde).

**Regla:** cierre = claim + evidencia de runner; sin run-id, no hay cierre.

## Regla 17 — El sync-map se commitea post-apply

El fichero `.sync-map.json` (o el mapa de proyección del sprint/mundo)
**nunca** se commitea con números de issue **antes** de que esos issues
existan en el tracker.

Orden obligatorio:

```text
1. apply   → crear/actualizar issues en el tracker (export real)
2. mapa    → refleja IDs reales devueltos por el adaptador
3. commit  → mapa + acta de proyección juntos
```

Mapa especulativo (números inventados, placeholders, «los issues van a
ser #N») = **devolución**. Pareja de la regla 15: el mapa es artefacto
trazado del plan; no anticipa verdad remota que aún no existe.

**Regla:** primero el remoto real, después el mapa en git.

## Checklist de cierre de ola (v0.5)

Extiende la de v0.4:

```text
[ ] git stash list          → vacío (o deudas registradas)
[ ] git status plan/        → sin diff pendiente
[ ] ramas wp/* mergeadas    → borradas local+remoto, o justificadas
[ ] git status              → explicado línea a línea
[ ] worktrees huérfanos     → removidos
[ ] carpetas de IDE         → sin markdowns/notas de info de sesión
                              (solo config funcional); memoria interna
                              no citada como fuente — verificado el plan
[ ] run-id verde            → CI (+ Release/homólogo) citado por cada
                              repo tocado (regla 16)
[ ] sync-map                → si hubo proyección: mapa post-apply, sin
                              IDs especulativos (regla 17)
```

## Relación con v0.2 / v0.3 / v0.4

`reglas-metodo-v02.md`, `v03.md` y `v04.md` quedan como histórico. Este
fichero (v0.5) es el contrato vigente de reglas 1–17: 1–15 (vía v0.4) +
16–17 + checklist extendido.

**Método v0.6** (badge del skill) añade el contrato de convivencia
multi-orquestador sin nuevas reglas numeradas aquí: fuente única
`reference/convivencia-multi-orquestador.md`.

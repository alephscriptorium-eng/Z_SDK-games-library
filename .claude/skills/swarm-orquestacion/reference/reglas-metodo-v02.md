# Reglas de método v0.2 — costuras del swarm

Doce reglas cosidas al skill tras las primeras olas reales. El aislamiento
(worktree + rama por WP) funciona; estas reglas cierran los **bordes**.

> **Contrato vigente:** v0.3 — ver `reglas-metodo-v03.md` (catorce reglas:
> 1–12 + 13 activación fresco + 14 ceguera sobre historial).

## Las 12 reglas

1. **El gobierno va a git antes que la obra.** El orquestador commitea
   `plan/` a la rama principal **antes** de abrir el primer brief de una
   ola. No dejar BACKLOG/DECISIONES untracked mientras se mergean WPs.
2. **Cada cambio de estado del BACKLOG (🔶/✅/brief) = commit atómico
   inmediato.** Prohibido el patrón «✅ en working copy, ya
   commitearé».
3. **Todo `git stash` de un agente se limpia (pop/drop) en el mismo WP
   que lo creó, o se registra como deuda explícita.** Un stash huérfano
   no es higiene.
4. **El aislamiento 1 WP = 1 worktree aplica a TODO repo tocado,
   incluidos hermanos.** El orquestador provisiona worktrees en repos
   hermanos **antes** de lanzar el lote paralelo.
5. **WPs paralelos que pueden crear el mismo fichero desde cero: el
   brief asigna quién lo crea y quién solo añade.** Evita dobles
   nascimientos (p. ej. `.gitignore` ×2).
6. **Cadencia de merge única y declarada por lote:** «merge cada ✅ al
   llegar» o «espera el lote entero» — se elige en el brief de ola, no
   ad hoc.
7. **Integrador (merge) y planificador (siguiente brief) son pasos
   distintos**; si se fusionan por economía, **commits separados** y el
   protocolo lo autoriza explícitamente.
8. **Canal formal para inyectar ops (secrets, correcciones) a un worker
   vivo:** fichero de tick en `plan/` (trazado en git), no interrupción
   manual del chat.
9. **La cadena de evidencia se audita sin releer transcripts:** el
   reporte de revisión lleva comando+salida literal en `plan/REPORTES/`
   y el commit de aceptación lo referencia.
10. **Checklist de higiene al cierre de cada ola** (ver abajo).
11. **Patrón nuevo = decisión formal en DECISIONES.md al adoptarlo.**
    Los hábitos laterales (briefs en REPORTES/, checkout hermano) deben
    tener rango DE-n.
12. **Las entregas entre mundos viajan SIN rutas de origen.** Se entrega
    CONTENIDO (pegado o adjunto neutro); la cita de procedencia
    permitida es «nota externa recibida (canal, fecha)» — jamás una
    ruta de disco del emisor.

## V2 · Commits de gobierno atómicos

**Práctica explícita:** un commit de gobierno no mezcla roles.

| Rol del commit | Contenido permitido | Prohibido en el mismo commit |
| -------------- | ------------------- | ---------------------------- |
| Aceptación (✅) | BACKLOG ✅ + nota de merge/revisión | Abrir brief / 🔶 de otro WP |
| Brief / 🔶 | Marcar WP en curso + brief | Aceptar otro WP en el mismo árbol |
| Decisión (DE-n) | Solo DECISIONES (+ cita) | Obra de implementación |

Evidencia del anti-patrón: commits que dicen «aceptar WPx + brief WPy»
en un solo SHA. Mitigación = regla 2 + regla 7 + esta tabla. Si por
economía se hacen juntos en la misma sesión, **dos commits** (primero
aceptación, luego brief).

## Checklist de cierre de ola

Al cerrar cada ola, el orquestador ejecuta y deja evidencia en el
reporte de cierre (o en el último commit de gobierno de la ola):

```text
[ ] git stash list          → vacío (o deudas registradas)
[ ] git status plan/        → sin diff pendiente
[ ] ramas wp/* mergeadas    → borradas local+remoto, o justificadas
[ ] git status              → explicado línea a línea
[ ] worktrees huérfanos     → removidos
```

Este checklist **se estrena** con el WP que versiona el skill a v0.2
(cierre residual de la ola que lo produce).

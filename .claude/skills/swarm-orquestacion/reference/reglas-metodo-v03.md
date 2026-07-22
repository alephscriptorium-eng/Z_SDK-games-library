# Reglas de método v0.3 — costuras del swarm

Catorce reglas cosidas al skill tras las primeras olas reales y la
segunda activación (F8). El aislamiento (worktree + rama por WP)
funciona; estas reglas cierran los **bordes** — incluidas la activación
y la ceguera sobre historial.

Las reglas 1–12 son las de v0.2; 13–14 nacen del addendum de activación
(ceguera rota en historial + ejecutor con contexto del marco).

## Las 14 reglas

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
13. **La activación la ejecuta un agente fresco.** Un mundo se activa
    con el skill mediante un agente que **solo conoce el skill**, jamás
    uno con contexto del marco. Un ejecutor que conoce el marco no puede
    *no* filtrarlo (lo lleva en el prompt); la única garantía es la
    ignorancia del ejecutor. Pareja de la regla 12: 12 protege el canal
    entre mundos; 13 protege el acto de activación.
14. **La ceguera se verifica sobre el historial alcanzable, no solo el
    árbol.** El CA de ceguera corre `git log -p` (historia completa
    reachable), no solo `git grep` / árbol de trabajo. Fuga en commit
    intermedio = **squash antes del merge** (nunca un fix-encima que
    deja el original en la historia). En remoto público ya empujado:
    rewrite + force-push solo mientras el repo sea joven y sin forks.

## Práctica de la regla 14 (medida canónica)

Los pipelines de evidencia validan el **exit del comando de medida, no
del filtro** — `grep | head && echo OK` evalúa el exit de `head`
(siempre 0) y canta falsos veredictos en ambos sentidos. Forma canónica:
`grep -c` y leer el conteo, o `grep -q`. Nunca `grep … | head && echo
OK`.

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

## Relación con v0.2

`reference/reglas-metodo-v02.md` conserva las 12 reglas originales.
Este fichero (v0.3) es el contrato vigente: 1–12 + 13–14 + práctica de
medida.

# WATCHER — sesión + whitelist

Watcher de la estación viva: **clase sesión** (muere al cerrar) y
**whitelist** de materialización de skills.

Componer con el skill `vigilancia` (`scripts/watcher.sh`) para pulso
de worktrees/locks. Este skill aporta el filtro que evita la clase de
ruido I71.

## Clase: muere con la sesión

- Arranque: fase 3 del boot (`scripts/watcher-sesion.sh`).
- PID en `$OUT_DIR/watcher.pid`.
- El proceso padre registra `trap` → `kill` del watcher al EXIT /
  INT / TERM.
- No instalar como servicio del OS; no sobrevivir al chat/sesión del
  agente.

## Whitelist de materialización (clase I71)

### Problema

Al materializar el paquete de skills bajo `.claude/skills/`, un barrido
ingenuo de «markdown en carpetas de IDE» trata cada `SKILL.md` /
`README.md` / `reference/*.md` como **residuo de info** (regla 15 del
swarm). Feedback S02: del orden de **~3.110 falsos positivos** si se
barre sin whitelist.

### Regla

| path | tratamiento |
| ---- | ----------- |
| `.claude/skills/**` | **whitelist** — materialización legítima del paquete; NO es residuo |
| `.claude/worktrees/**` | ajeno al swarm de estación (señal distinta; ver vigilancia) |
| otros `*.md` bajo `.claude/`, `.cursor/`, … | residuo de info → elevar |

### Herramienta

`scripts/filtro-whitelist-skills.sh` — dada una lista de paths (stdin o
args), emite solo los que **no** caen bajo `.claude/skills/`.

`scripts/watcher-sesion.sh` aplica el filtro en cada ciclo antes de
logar `!!RESIDUO`.

## Relación con vigilancia

- Pulso de locks / worktrees / CI: citar y, si el consumidor lo desea,
  invocar el watcher de `vigilancia` en paralelo o en modo one-shot.
- No copiar árboles de instancia ni datos de sesión ajenos.
- La whitelist es responsabilidad de **estación viva** porque el dolor
  aparece al materializar skills en el boot de estación.

## Params

| param | rol |
| ----- | --- |
| `WORLD_ROOT` | repo vigilado |
| `OUT_DIR` | `watch.log`, `anomalias.log`, `watcher.pid` |
| `INTERVAL` | segundos (default 45; fixture puede usar 2) |

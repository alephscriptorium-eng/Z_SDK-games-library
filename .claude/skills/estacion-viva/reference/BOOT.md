# BOOT — 7 fases (contrato)

Contrato de arranque de la estación viva. Parametriza `WORLD_ROOT`,
`GAME_MCP`, `OUT_DIR`. Un agente **fresco** que solo conoce este skill
debe poder reproducir el boot completo (eje IV / regla 13).

Herramienta: `scripts/reproduce-boot.sh`. Fixture:
`examples/fixture-tick-cero/`.

## Invariantes

1. **Fuente única del estado = bitácora.** Tras el boot, el estado en
   `OUT_DIR` se deriva solo de la bitácora; no hay segundo almacén que
   pueda divergir (sin drift).
2. **Watcher de clase sesión.** El proceso nace en la fase 3 y **muere
   con la sesión** (trap / kill al salir del boot o al cerrar el shell
   padre). No es un demonio de sistema.
3. **Kits del registry.** La conexión al juego resuelve
   `player-mcp-kit@0.1.3` por canal de registry (C8). Prohibido apuntar
   a un checkout hermano o raíz ajena.
4. **Whitelist de materialización.** El watcher no trata
   `.claude/skills/` como residuo de IDE (clase I71).

## Fases

### 1 · Cargar estación

- Verificar que `WORLD_ROOT` existe y es usable (repo o fixture).
- Crear `OUT_DIR` si falta.
- Registrar en `OUT_DIR/boot.log` el tip de estación (ruta + marca de
  tiempo).

### 2 · REGENERAR ESTADO desde bitácora

- Localizar la bitácora del mundo (default:
  `$WORLD_ROOT/bitacora/linea.mdl` o path de calibración).
- Regenerar `$OUT_DIR/estado.json` **solo** desde esa bitácora.
- Borrar o sobrescribir cualquier estado previo en `OUT_DIR` antes de
  escribir (evita drift con restos de sesión anterior).
- Contrato de línea: `BITACORA.md`.

### 3 · RELANZAR watcher (muere con la sesión)

- Arrancar `scripts/watcher-sesion.sh` con `WORLD_ROOT` + `OUT_DIR`.
- Aplicar whitelist `.claude/skills/` (`WATCHER.md`).
- Guardar PID en `$OUT_DIR/watcher.pid`.
- Registrar trap: al salir del proceso padre → matar el watcher.

### 4 · Pulso del mundo

- Una muestra puntual: `scripts/pulso-mundo.sh`.
- Escribe resumen en `$OUT_DIR/pulso.txt` (conteo worktrees / locks /
  skills materializados whitelisted).
- Puede componer señales del skill `vigilancia` sin copiar datos de
  instancia.

### 5 · Conexión al juego

- Exigir `GAME_MCP` no vacío.
- Exigir peercard firmada en path de calibración o
  `$OUT_DIR/peercard.json` (fixture en tick-cero).
- Resolver kit `player-mcp-kit@0.1.3` vía registry (C8), no sibling.
- Detalle: `GAME-MCP.md`.

### 6 · Modo debug

- Escribir `$OUT_DIR/debug.flag` con marca de sesión.
- Volcar checklist de las 7 fases a `$OUT_DIR/debug-boot.txt`.

### 7 · Salida dual PO/scrum

- Emitir `$OUT_DIR/salida-po.md` y `$OUT_DIR/salida-scrum.md`.
- Formato: `SALIDA-DUAL.md`.

## Criterio de éxito del boot

```text
[ ] OUT_DIR/estado.json existe y hash-deriva de la bitácora
[ ] watcher.pid vivo durante la sesión; muerto al cerrar
[ ] pulso.txt escrito
[ ] peercard + GAME_MCP verificados; kit declarado = registry
[ ] debug.flag + debug-boot.txt
[ ] salida-po.md + salida-scrum.md
[ ] ceguera del skill = 0 (scripts/comprobar-ceguera.sh)
```

## Anti-patrones

| síntoma | mitigación |
| ------- | ---------- |
| estado editado a mano además de bitácora | fase 2 sobrescribe; bitácora = única fuente |
| watcher queda huérfano tras cerrar chat | trap + clase sesión |
| ~3k FP al materializar skills | whitelist `.claude/skills/` |
| E2E vía checkout hermano del kit | registry o fixture copiada (§7 convivencia) |

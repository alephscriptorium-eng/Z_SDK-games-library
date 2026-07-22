---
name: estacion-viva
description: >-
  Boot de estación viva sobre «el mundo»: regenerar estado desde bitácora
  (fuente única), relanzar watcher de sesión con whitelist de skills
  materializados, pulso, conexión al juego (GAME_MCP + peercard firmada +
  kit del registry), modo debug y salida dual PO/scrum. Params:
  WORLD_ROOT, GAME_MCP, OUT_DIR. Sin datos de instancia.
---

# Skill · estacion-viva

Método para **cargar y mantener viva** una estación de trabajo sobre el
mundo (parámetro: raíz del repo + endpoint de juego + carpeta de salida).
Protocolo ≠ datos: bitácoras, peercards y logs reales viven en la
calibración / instancia del consumidor, nunca hardcodeados aquí.

## Cuándo aplicar

Cuando un agente fresco deba:

1. Arrancar la estación desde cero **solo con este skill**.
2. Regenerar estado sin drift (una fuente: la bitácora).
3. Relanzar un watcher que **muere con la sesión** y no dispare miles de
   falsos positivos al materializar skills bajo `.claude/skills/`.
4. Conectar al juego vía `GAME_MCP` con peercard firmada y kits del
   **registry** (no checkout hermano).
5. Dejar salida dual PO/scrum de serie.

## Parámetros (obligatorios)

| param | rol |
| ----- | --- |
| `WORLD_ROOT` | Raíz del repo / estación del mundo |
| `GAME_MCP` | Endpoint o descriptor del servidor MCP de juego |
| `OUT_DIR` | Carpeta de estado, logs y salidas duales de la sesión |

Calibración local opcional: ruta de bitácora, preset del editor MCP de
línea, canal del registry para C8, vocabulario de ceguera del mundo.

## Boot — 7 fases (contrato)

Detalle: `reference/BOOT.md`. Checklist ejecutable:
`scripts/reproduce-boot.sh` (agente fresco = eje IV / regla 13).

```text
1. Cargar estación
2. REGENERAR ESTADO desde bitácora (UNA fuente; sin drift)
3. RELANZAR watcher (clase: muere con la sesión)
4. Pulso del mundo
5. Conexión al juego: GAME_MCP + peercard firmada + kit registry
6. Modo debug
7. Salida dual PO/scrum de serie
```

## Pasos

1. Leer `reference/BOOT.md` y fijar `WORLD_ROOT`, `GAME_MCP`, `OUT_DIR`.
2. Ejecutar `scripts/reproduce-boot.sh` (o seguir el checklist a mano).
3. Bitácora: contrato en `reference/BITACORA.md` — autoría vía editor MCP
   del mundo (linea-editor / preset); este skill **no** reimplementa el
   editor.
4. Watcher: `scripts/watcher-sesion.sh` + whitelist
   `reference/WATCHER.md` (clase I71: sin whitelist ≈ miles de FP).
5. Juego: `reference/GAME-MCP.md` — peercard firmada; kit
   `player-mcp-kit@0.1.3` desde registry (C8); prohibido sibling path.
6. Salidas: `reference/SALIDA-DUAL.md`.
7. Antes de entregar cara pública: `scripts/comprobar-ceguera.sh` →
   `ceguera: 0`.

## Recursos

- `reference/BOOT.md` — contrato de las 7 fases
- `reference/BITACORA.md` — línea publicable + editor MCP del mundo
- `reference/WATCHER.md` — sesión + whitelist `.claude/skills/`
- `reference/GAME-MCP.md` — peercard + registry C8
- `reference/SALIDA-DUAL.md` — PO / scrum
- `scripts/reproduce-boot.sh` — agente fresco reproduce el boot
- `scripts/watcher-sesion.sh` — watcher que muere con la sesión
- `scripts/filtro-whitelist-skills.sh` — filtra materialización
- `scripts/pulso-mundo.sh` — un pulso puntual
- `scripts/comprobar-ceguera.sh` — ceguera del skill
- `examples/fixture-tick-cero/` — fixture mínima (vía b · E2E)

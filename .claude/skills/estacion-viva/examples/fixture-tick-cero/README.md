# Fixture tick-cero — estación sintética mínima

Fixture **vía b** (copia scratch / árbol del skill): sin datos de mundo
real. Sirve para que un agente fresco ejecute `reproduce-boot.sh` y
demuestre las 7 fases.

## Uso

```bash
FIXTURE="$(pwd)/examples/fixture-tick-cero"   # desde la raíz del skill
OUT="$(mktemp -d)"
WORLD_ROOT="$FIXTURE" \
  GAME_MCP="mcp://fixture-tick-cero" \
  OUT_DIR="$OUT" \
  bash scripts/reproduce-boot.sh
```

Esperado: `BOOT_OK`, `estado.json` derivado de `bitacora/linea.mdl`,
`pulso.txt`, `peercard.json`, salidas duales, watcher detenido al cerrar.

## Contenido

| path | rol |
| ---- | --- |
| `bitacora/linea.mdl` | fuente única del estado |
| `peercard.json` | peercard firmada de fixture |
| `.claude/skills/demo-skill/SKILL.md` | materialización sintética (whitelist) |
| `estado/` | vacío a propósito — el boot regenera en OUT_DIR |

No contiene nombres de mundos reales ni del marco.

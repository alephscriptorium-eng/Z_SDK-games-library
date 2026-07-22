# ESTACIÓN · calibración del mundo g-sdk (games-library)

**La estación se activa desde aquí.** Instancia del consumidor. El método
vive en el paquete `@alephscript/skills-scriptorium` (skills `vigilancia` +
`estacion-viva`). **Esta calibración NO va en el skill** — solo aquí en
`plan/`.

## Params

| param | valor |
| ----- | ----- |
| `MUNDO_RAIZ` / `WORLD_ROOT` | `C:\S_LAB\g-sdk` (checkout principal) |
| `WORKTREE_BASE` | `C:\S_LAB\.worktrees\g` |
| `OUT_DIR` | `C:\S_LAB\vigilancia\g` |
| `INTERVAL` | `45` (default del watcher) |

## OUT_DIR

- Ruta canónica: **`C:\S_LAB\vigilancia\g`**
- Contiene: `watch.log`, `anomalias.log`, `watcher.pid` (sesión)
- Fuera del repo público. Crear con `mkdir` al primer arranque del watcher.

## Espejo de skills

| dato | valor |
| ---- | ----- |
| paquete | `@alephscript/skills-scriptorium@0.7.0` |
| registry | `https://npm.scriptorium.escrivivir.co` |
| comando | `npm run skills:sync` → `alephscript-skills-sync --runtime claude` |
| destino | `.claude/skills/` (espejo auditable commiteado) |

Tras `npm install`, regenerar el espejo con `npm run skills:sync`.

## Watcher

```text
WORLD_ROOT=<worktree-o-mundo> OUT_DIR=C:/S_LAB/vigilancia/g ONCE=1 \
  bash .claude/skills/estacion-viva/scripts/watcher-sesion.sh
```

## Relación

Plan mínimo local (VISION / BACKLOG / DECISIONES) + stubs con enlace a
`Z_SDK` en `README.md` / `PRACTICAS.md` (sin rewrite). Estación = layout
operativo del carril g.

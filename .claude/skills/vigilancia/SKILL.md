---
name: vigilancia
description: >-
  Protocolo de vigilancia read-only sobre un swarm en «el mundo»: pulso de
  worktrees/locks/CI, pulso multi-carril (Rn-<carril>, index.lock, higiene
  §8), clases de huérfano, C8/C8-ampliado, CA-por-clase, addenda dos caras
  con prueba de ceguera, y watcher parametrizado (WORLD_ROOT, OUT_DIR,
  INTERVAL; SIBLING_ROOT opcional). Sin datos de instancia.
---

# Vigilancia

Método para vigilar un swarm **en el mundo** (parámetro: raíz del repo
vigilado + directorio de salida). Read-only sobre el mundo. Protocolo ≠
datos: las bitácoras, logs y addendas reales viven en la calibración /
`instancias/` del consumidor, nunca aquí.

## Cuándo aplicar

Cuando un agente deba:

1. Mantener pulso read-only de worktrees, locks y CI del mundo.
2. Pulsar **multi-carril** (etiquetas `Rn-<carril>`, higiene §8,
   freeze por `index.lock`) sin mezclar addendas entre carriles.
3. Clasificar huérfanos y elevar solo anomalías reales.
4. Elevar **residuo de info** en carpetas de IDE (markdowns/notas de
   sesión bajo `.claude`/`.cursor`/…; regla 15 del swarm). La config
   funcional no es residuo.
5. Emitir addendas dos caras (§interna / §WP) con prueba de ceguera.
6. Re-verificar CAs de facto tras merge (nunca fiarse del ✅ del reporte).

## Parámetros («el mundo»)

| param | rol |
| ----- | --- |
| `WORLD_ROOT` | Raíz del repo git vigilado (un root por proceso) |
| `OUT_DIR` | Carpeta de logs/estado del vigía (fuera o dentro del mundo, a elección del consumidor) |
| `INTERVAL` | Segundos entre muestras del watcher (default 45) |
| `SIBLING_ROOT` | (opcional) segundo root hermano solo-lectura; pulso de locks/worktrees con prefijo `sibling:` en el mismo `OUT_DIR` |

Calibración local opcional: rutas de colas del orquestador, vocabulario
prohibido para la cara pública, canal de CI (`gh` u otro), mapa
carril→root.

Doctrina multi-carril y supuestos de convivencia (shape del skill de
orquestación): `reference/ESTACION.md`.

## Pasos

1. Leer `reference/ESTACION.md` (protocolo + pulso multi-carril).
2. Arrancar `scripts/watcher.sh` con `WORLD_ROOT`, `OUT_DIR`, `INTERVAL`
   (y `SIBLING_ROOT` si hay territorio hermano).
3. Ciclo: detectar → verificar → addenda dos caras con `Rn-<carril>`
   (`reference/ADDENDA-DOS-CARAS.md`) → custodio media → orquestador
   decide → WP → merge → **re-verificar CA de facto**.
4. Persistir veredictos en el canal que el mundo declare (no en este skill).
5. Antes de entregar cualquier texto al orquestador del mundo: **prueba de
   ceguera** sobre la cara §WP (`scripts/comprobar-ceguera.sh` o patrón
   local del custodio).

## Recursos

- `reference/ESTACION.md` — protocolo abstraído + multi-carril + supuestos
- `reference/BACKSTAGE-GIT.md` — layout backstage · convención `cantera/` ·
  worktree por rol · migración `fuentes/` → `cantera/`
- `reference/ADDENDA-DOS-CARAS.md` — formato §interna / §WP + carril + ceguera
- `examples/` — fixtures sintéticas mínimas (sin datos de mundo real)
- `../../instancias/ejemplo-M/` — corpus-instancia de-identificado (bitácora /
  revisiones / addendas / handoffs sintéticos; ceguera = 0)
- `scripts/watcher.sh` — muestreo parametrizado (no usa `git status`)
- `scripts/comprobar-ceguera.sh` — ceguera sobre este skill

Sucesión de vigía (estación viva · sin PASS no 🔶): ver también
`swarm-orquestacion` · `reference/lecciones-vnext.md`.

# MAPA-REPO — misión-por-path del repo

| dato | valor |
| ---- | ----- |
| Territorio | repo del mundo (`{{MUNDO_REPO}}`) |
| Canónico | este fichero (`plan/MAPA-REPO.md`) |
| Fecha semilla | {{FECHA}} · generado por `montar-plan` |

Filas semilla del esqueleto que `montar-plan` crea. Completá nivel ≤2.

| path | misión | ¿en git? |
| ---- | ------ | -------- |
| `plan/` | Gobierno del swarm | **Sí** |
| `plan/VISION.md` | Idea / entregable / candados | **Sí** |
| `plan/PRACTICAS.md` | Reglas de devolución | **Sí** |
| `plan/BACKLOG.md` | Cola de WPs | **Sí** |
| `plan/DECISIONES.md` | GO custodio | **Sí** |
| `plan/roles/` | Prompts orquestador/worker | **Sí** |
| `plan/REPORTES/` | Actas / reportes | **Sí** |
| `plan/MAPA-RAIZ.md` | Mapa territorio FS (atlas/carril) | **Sí** |
| `plan/MAPA-REPO.md` | Este mapa | **Sí** |
| `plan/MAPA-TALLER.md` | Mapa taller de obra (si aplica) | **Sí** (si existe) |

## REGLA DEL MAPA-REPO

**Fichero trackeado sin fila, o trackeado contra fila No = FAIL de
ronda; ampliar el mapa = commit de gobierno.**

1. Toda entrada del árbol público (nivel 1–2 + gitlinks) tiene fila.
2. El vigía contrastará **repo == mapa** (`git ls-files` ≤2 niveles vs
   filas + política ¿en git?).
3. Ampliación o corrección de filas = commit de gobierno (este fichero).

# MAPA-RAIZ — territorio FS del carril

| dato | valor |
| ---- | ----- |
| Territorio | `{{MUNDO_RAIZ}}` (raíz FS del carril / atlas) |
| Canónico | este fichero (`plan/MAPA-RAIZ.md`) |
| Fecha semilla | {{FECHA}} · generado por `montar-plan` |

Filas semilla del esqueleto. Ampliá con commit de gobierno.

| path | misión | ¿en git? |
| ---- | ------ | -------- |
| `{{MUNDO_REPO}}/` | Repo / `MUNDO_RAIZ` de gobierno | **Sí** (o declarar) |
| `plan/` | Gobierno del swarm (vive en el repo) | ver MAPA-REPO |

## REGLA DEL MAPA-RAIZ

**Entrada en la raíz sin fila en este mapa = FAIL de ronda del vigía;
ampliar el mapa = commit de gobierno.**

1. Toda entrada de la raíz FS del territorio tiene fila.
2. El vigía contrastará **territorio == mapa** (`ls` raíz vs filas).
3. Ampliación o corrección = commit de gobierno (este fichero).

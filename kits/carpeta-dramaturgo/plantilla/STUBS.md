# STUBS — desacople de skills network-engine

ALEPH_ET_OMEGA y SOLVE_ET_COAGULA asumen skills que viven fuera de esta
carpeta (en `SCRIPTORIUM_V0/network-engine/agents/skills/`). La CARPETA
DRAMATURGO **no las embute**: documenta el contrato y ofrece un modo
degradado para que la instancia sea autocontenida.

## Skills externas (solo lectura / referencia)

| Skill | Rol en los juegos originales | En esta instancia |
|-------|------------------------------|-------------------|
| `disfraz-rude-bot` | Traje reader: cabecera, poderes, loadouts | **Stub** — `reader-traje.hot.md` + checklist abajo |
| `linea-aleph-browser` | Navegador-caché offline (Solve) | **Stub** — declarar ⚪ si no hay corpus local |
| `lineas-poder-browser` / `linea-poder-browser` | Navegador-caché (Aleph) | **Stub** — idem |

Rutas de referencia (no se copian ni se editan desde aquí):

```
network-engine/agents/skills/disfraz-rude-bot/SKILL.md
network-engine/agents/skills/linea-aleph-browser/SKILL.md
network-engine/agents/skills/lineas-poder-browser/SKILL.md
```

## Checklist traje (modo stub)

Cuando `reader-traje.hot.md` diga `traje:puesto`:

1. Cabecera mínima en cada acto reader: `modelo` + `traje:puesto` + fecha.
2. Aplicar marcas [`EPISTEM.md`](EPISTEM.md).
3. No invocar fetch remoto; no asumir MCP de caché.
4. Si el usuario pide un poder no listado en `poderes_disponibles` → ⚪ y
   apuntar a este archivo.

## Checklist browser de caché (modo stub)

1. Buscar artefactos **dentro de la instancia** (`raw/`, `cache/` si el
   dramaturgo los añade).
2. Si no hay caché local → ⚪ «corpus no materializado en esta carpeta».
3. Proponer (no ejecutar) un viaje de datos: qué archivos harían falta y
   dónde vivirían **dentro de la instancia**.

## Cómo reenganchar skills reales (opcional, fuera de CA)

Cuando el dramaturgo tenga `network-engine` en el árbol hermano, puede
poner `traje:puesto` y seguir el SKILL real **sin modificar** esta
plantilla: el hot file solo apunta estado; la skill vive fuera.

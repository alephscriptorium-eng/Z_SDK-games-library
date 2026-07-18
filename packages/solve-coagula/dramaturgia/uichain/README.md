# uichain — plantilla de prompt DevOps

Canal de **especificación UI generativa** para Solve et Coagula. Los `.prompt.md` no son poderes del traje ni verdad forense: son moldes para tramitar layout cuando alguien implemente la interfaz.

**Datos canónicos** viven en JSON de sesión y poderes del traje (`ayuda`, `alineacion-dual`, `cache-nav`). Los prompts uichain apuntan a esas fuentes (DRY) y describen solo cómo podría verse.

## Plantilla (copiar por bloque)

```markdown
# uichain — Block N: <título>

**Bloque origen:** `blockchain/block-N.md` · **Agentchain:** `agentchain/<modelo-slug>/block-N.md`
**Modo:** aleph generativo no determinista — layout no fijado.

## Objetivo

<Qué orienta o visualiza esta UI para el lector del index-reader.>

## Datos (DRY)

- **Canon estático:** `network-engine/data/sessions/<manifest>.json`
- **Runtime / forense:** poder `<id>` — ver `network-engine/agents/skills/disfraz-rude-bot/poderes/<id>/SKILL.md`
- **Caché 🟢:** `network-engine/linea-aleph/cache/*.json` (si aplica)
- No duplicar tablas de oldids, actos o chips aquí; leer JSON o SKILL

## Visualización

<Widgets, carriles, timeline, heatmap, conectores — spec de render, no tablas de datos.>

## Reglas UX

<Vacío explícito, etiquetas de capa, aleph abierto, accesibilidad mínima.>

## DevOps (fase tramitación)

| Paso | Acción |
|------|--------|
| 1 | Rama `uichain/block-N-<slug>` en site build o SPA local |
| 2 | Fetch relativo a JSON estático / activador index-reader |
| 3 | Sin backend obligatorio salvo que el bloque lo exija |
| 4 | Tests con fixture de audit o subset de manifest |

## Criterios de aceptación

- [ ] <criterio verificable sin abrir terminal>
- [ ] <vacío explícito visible, no error>
- [ ] Dos sesiones aleph pueden generar layouts distintos sin perder datos

## No hacer

- Inventar wikitext o oldids no cacheados
- Cerrar paleta / layout único (aleph abierto)
- Mezclar 🟢 wiki con 🟡 agentchain sin etiqueta
- Ejecutar fetch automático desde la UI
```

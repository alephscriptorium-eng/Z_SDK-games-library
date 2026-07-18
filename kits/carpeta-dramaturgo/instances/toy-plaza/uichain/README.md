# uichain — plantilla de prompt DevOps · Plaza de juguete

Canal de **especificación UI generativa**. Los `.prompt.md` no son poderes
del traje ni verdad forense: son moldes para tramitar layout.

**Datos canónicos** viven en `readerapp/story-board.json` y cadenas. Los
prompts apuntan a esas fuentes (DRY).

## Plantilla (copiar por panel)

```markdown
# uichain — Block N: <título>

**Bloque origen:** `blockchain/block-N.md` · **Agentchain:** `agentchain/<modelo-slug>/block-N.md`
**Modo:** aleph generativo no determinista — layout no fijado.

## Objetivo

<Qué orienta o visualiza esta UI.>

## Datos (DRY)

- **Canon:** `readerapp/story-board.json`
- **Cadenas:** blockchain / agentchain
- No duplicar tablas de evidencia aquí

## Visualización

<Widgets, carriles, timeline — spec de render.>

## Reglas UX

<Vacío explícito, etiquetas de capa, aleph abierto.>

## Criterios de aceptación

- [ ] <criterio verificable>
- [ ] vacío explícito visible
- [ ] dos layouts distintos posibles sin perder datos

## No hacer

- Inventar hechos no anclados
- Cerrar paleta / layout único
- Mezclar 🟢 con 🟡 sin etiqueta
- Ejecutar fetch automático desde la UI
```

## Prompts de esta instancia

| Archivo | Widget | Rol |
|---------|--------|-----|
| [`panel-seed.prompt.md`](panel-seed.prompt.md) | `panel-seed` | Semilla / pregunta activa |
| [`panel-reic.prompt.md`](panel-reic.prompt.md) | `panel-reic` | Radiografía 4 ejes |

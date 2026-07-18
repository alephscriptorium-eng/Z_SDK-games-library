# uichain — panel-seed · {{TITLE}}

**Bloque origen:** `blockchain/block-0.md` · **Agentchain:** `agentchain/<modelo-slug>/block-0.md`
**Modo:** aleph generativo no determinista — layout no fijado.

## Objetivo

Mostrar la **pregunta activa** de la semilla y el tema {{THEME}} al lector
del index-reader.

## Datos (DRY)

- **Canon:** `blockchain/block-0.md`
- **Story-board:** `readerapp/story-board.json` → act-0 / `panel-seed`
- **Ayuda:** `readerapp/AYUDA.md`

## Visualización

- Título del juego + tema
- Cita corta del `# User` de block-0
- CTA hacia radiografía REIC (`panel-reic`) o agentchain

## Reglas UX

- 🟡 si glosa el prompt; 🟢 solo si cita archivo en disco
- Vacío ⚪ si block-0 aún es placeholder

## Criterios de aceptación

- [ ] El widget no inventa hechos fuera de block-0
- [ ] Enlace o ruta relativa al blockchain visible

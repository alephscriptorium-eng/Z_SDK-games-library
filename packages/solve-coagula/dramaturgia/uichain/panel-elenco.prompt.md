# uichain — panel-elenco

**Bloque origen:** `blockchain/block-0.md` · **Agentchain:** `agentchain/composer-2.5/block-0.md`
**Modo:** aleph generativo no determinista — layout no fijado.
**Runtime (WP-U113):** `@zeus/view-kit` → `createDefaultWidgetRegistry` /
`renderCastTableWidget` (id `panel-elenco`). Payload hermético:
`readerapp/widgets/panel-elenco.json`. La vista solve monta el widget en
DOM (`#widgets-mount`); este `.prompt.md` sigue siendo molde generativo,
no la única verdad de UI.

## Objetivo

Tabla de roles del elenco Solve et Coagula (REIC) con enlaces clicables a oldids verificados.

## Datos (DRY)

- **Canon:** `agentchain/composer-2.5/block-0.md` (perfil REIC, elenco)
- **Registro talk:** `network-engine/linea-aleph/cache/talk/participant-register.json`
- **Story-board:** `readerapp/story-board.json` → act-0
- **Fixture runtime:** `readerapp/widgets/panel-elenco.json`

## Visualización

- Tabla participante × rol arquetípico × eje × oldid clave
- Clic en fila abre `cache/talk/snapshots/{oldid}.wikitext` o URL Wikipedia
- Badge de cobertura caché por vista
- **Runtime actual:** cast-table de view-kit (columnas + badge cacheado/no cacheado)

## Reglas UX

- Vacío explícito para UT Ignacio 2007 (0 revs)
- No inventar participantes fuera del register

## Criterios de aceptación

- [x] Cada oldid enlazado existe en caché o muestra «no cacheado» (fixture + badge)
- [ ] Roles sin nombres propios en act-6 usan arquetipos
- [x] Widget declarado en story-board se renderiza en la vista (no solo prompt)

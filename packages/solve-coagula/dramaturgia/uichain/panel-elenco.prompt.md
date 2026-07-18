# uichain — panel-elenco

**Bloque origen:** `blockchain/block-0.md` · **Agentchain:** `agentchain/composer-2.5/block-0.md`
**Modo:** aleph generativo no determinista — layout no fijado.

## Objetivo

Tabla de roles del elenco Solve et Coagula (REIC) con enlaces clicables a oldids verificados.

## Datos (DRY)

- **Canon:** `agentchain/composer-2.5/block-0.md` (perfil REIC, elenco)
- **Registro talk:** `network-engine/linea-aleph/cache/talk/participant-register.json`
- **Story-board:** `readerapp/solve-coagula-story-board.json` → act-0

## Visualización

- Tabla participante × rol arquetípico × eje × oldid clave
- Clic en fila abre `cache/talk/snapshots/{oldid}.wikitext` o URL Wikipedia
- Badge de cobertura caché por vista

## Reglas UX

- Vacío explícito para UT Ignacio 2007 (0 revs)
- No inventar participantes fuera del register

## Criterios de aceptación

- [ ] Cada oldid enlazado existe en caché o muestra «no cacheado»
- [ ] Roles sin nombres propios en act-6 usan arquetipos

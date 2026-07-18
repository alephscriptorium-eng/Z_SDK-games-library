# uichain — panel-timeline-dual

**Bloque origen:** `blockchain/block-2.md` · **Agentchain:** `agentchain/composer-2.5/block-2.md`

## Objetivo

Dos carriles sincronizados: milestones artículo (NS0) ↔ talk (UT/sala) con alineación ±24 h.

## Datos (DRY)

- `readerapp/solve-coagula-story-board.json` → `dual_rails` (nov-pseudo, oct-dem)
- `network-engine/linea-aleph/cache/audit-talk.json` → `article_alignment`, `article_alignment_demarcacion`
- `readerapp/AYUDA.md` → timeline nov / timeline oct

## Visualización

- Carril superior: ● milestones con oldid + bytes
- Carril inferior: ○ revisiones talk; aristas punteadas ±24 h
- Selector nov | oct
- Clic arista → entrada en audit-talk

## Reglas UX

- Sala con 0 revs: franja «muda» visible (no ocultar)
- Etiqueta «vestuario» para UT vs «sala» para Discusión:

## Criterios de aceptación

- [ ] Pulso 10 oct dem: fusión en UT, sala vacía
- [ ] Pulso 10 nov pseudo: 15 aristas nov documentadas

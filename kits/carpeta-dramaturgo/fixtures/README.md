# Fixtures — story-boards reales + obra mini (solo lectura)

Copias de los JSON canónicos en `scriptorium-network-games/` para validar
el schema **sin** editar los juegos originales (WP-U86 · demolición n/a).

| Archivo / dir | Origen | Uso |
|---------------|--------|-----|
| `solve-coagula-story-board.json` | `SOLVE_ET_COAGULA/readerapp/` | validate `--fixtures` |
| `aleph-et-omega-story-board.json` | `ALEPH_ET_OMEGA/readerapp/` | validate `--fixtures` |
| `obra-solve-mini/` | subset hermético (U112) | `instantiate --from <path>` en tests |

Si se actualizan los originales, re-copiar los JSON aquí en un WP de higiene.
La mini-obra **no** sustituye a SOLVE real; solo garantiza CA hermético.

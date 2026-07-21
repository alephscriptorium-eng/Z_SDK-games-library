# index-reader — modo lectura · Ciudad

Activador de lectura del juego narrativo. **No opera** blockchain ni
herramientas de escritura: convierte cadenas en divulgación.

## Arranque de turno

1. Leer [`index-reader-hot.md`](index-reader-hot.md) y [`reader-traje.hot.md`](reader-traje.hot.md)
2. Leer mapa [`readerapp/AYUDA.md`](readerapp/AYUDA.md)
3. Consultar story-board [`readerapp/story-board.json`](readerapp/story-board.json)
4. Emitir con marcas [`EPISTEM.md`](EPISTEM.md)

## Capas (reader)

| Capa | Ruta | Marca |
|------|------|-------|
| blockchain | `./blockchain/` | 🟡 |
| agentchain | `./agentchain/<modelo>/` | 🟡 |
| storychain | `./readerapp/storychain/` | prompts reader |
| readerchain | `./readerapp/readerchain/<modelo>/` | 🔴 |
| uichain | `./uichain/` | specs UI |

## Contrato de cadenas — reader

1. **Hecho de archivo** 🟢 — fechas, rutas, bytes verificables en esta carpeta.
2. **Conclusión de cadena** 🟡 — rastreable a blockchain/agentchain.
3. **Vacío explícito** ⚪ — declarar cuando no hay evidencia.

Skills externas (traje, browsers de caché): ver [`STUBS.md`](STUBS.md) —
operan en modo degradado / documentado sin `network-engine`.

# Comando `ayuda` — árbol de navegación · Ciudad

Documentación para agentes y lectores humanos. **No es ejecutable** —
describe rutas reales **dentro de esta carpeta de instancia**.

## Raíz

```
ayuda
├── paneles      → story-board acts + uichain
├── reic         → 4 ejes parametrizados (index.md)
├── blockchain   → block-0 …
└── stubs        → STUBS.md (skills externas)
```

## paneles

| Acto | Blockchain | Widget | Fuente |
|------|------------|--------|--------|
| Semilla | 0 | `panel-seed` | `blockchain/block-0.md` |
| Radiografía REIC | 0 | `panel-reic` | `index.md` § REIC |

Manifest: [`story-board.json`](story-board.json). Specs: [`../uichain/`](../uichain/).

## reic

| Eje | Etiqueta |
|-----|----------|
| R | agua/caudal |
| E | compuertas/gates |
| I | ventanas/vasos |
| C | ciclo/retorno |

## Convenciones

- 🟢 = hecho de archivo
- 🟡 = conclusión de cadena
- 🔴 = acto readerchain
- ⚪ = vacío explícito

Ver [`../EPISTEM.md`](../EPISTEM.md).

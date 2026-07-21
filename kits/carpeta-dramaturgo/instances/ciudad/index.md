# Ciudad

Tema: **agua/caudal — trama de ventana de contexto (lectura del ledger del engine)**

Slug: `ciudad` · Instanciado: 2026-07-21

## Arquitectura del juego

| Pieza | Ubicación | Qué es |
|-------|-----------|--------|
| Constitución | `index.md` (este archivo) | Título/tema, REIC, convenciones agente |
| Activador reader | [`index-reader.md`](index-reader.md) | Modo lectura + hot files |
| Cinta canónica | `blockchain/block-{N}.md` | Preguntas activas (`# User` only) |
| Cinta agente | `agentchain/<modelo>/` | Respuestas por modelo |
| Story-board | `readerapp/story-board.json` | Actos → widgets → agentchain |
| Ayuda lector | `readerapp/AYUDA.md` | Árbol de navegación (no ejecutable) |
| Specs UI | `uichain/panel-*.prompt.md` | Moldes de layout generativo |
| Stubs externos | [`STUBS.md`](STUBS.md) | Skills network-engine desacopladas |

## Reglas Meta

- Esta carpeta funciona por iteraciones. Como agente decide si debes
  «recopilar información», «desarrollar» o «responder».
- Reconstruye el estado desde `./blockchain/` y materializa respuestas en
  `agentchain/<modelo>/`.
- En `blockchain/`, un bloque es **solo** `# User`. La salida del agente
  vive en `agentchain/<modelo>/` como `# User` copiado + `# Agent (<Modelo>)`.
- Sé honesto: si la evidencia es irrisoria frente al corpus, declara el vacío
  y pide mejorar caché o índices — no inventes.

### Contrato de cadenas — medicion

| Capa | Ruta | Lectura | Escritura agente |
|------|------|---------|------------------|
| **blockchain** | `./blockchain/block-{N}.md` | Sí | **No** — solo `# User` |
| **agentchain** | `./agentchain/<modelo>/block-{N}.md` | Sí | **Sí** |

**Flujo:** leer `blockchain/block-N.md` → escribir en
`agentchain/<modelo-slug>/block-N.md`.

Convenciones de sesión:

- **a)** solo lectura de blockchain
- **b)** agregar bloque (solo mediante plan)
- **c)** editar bloque mediante fork en agentchain (solo mediante plan)

## Protocolo REIC (4 ejes intercambiables)

Parametriza los ejes al tema de **agua/caudal — trama de ventana de contexto (lectura del ledger del engine)**. Los nombres REIC son
etiquetas del kit; el significado lo define el dramaturgo:

| Eje | Etiqueta en este juego | Qué mide aquí |
|-----|------------------------|---------------|
| **R** | agua/caudal | qué mide el eje R en este juego |
| **E** | compuertas/gates | qué mide el eje E en este juego |
| **I** | ventanas/vasos | qué mide el eje I en este juego |
| **C** | ciclo/retorno | qué mide el eje C en este juego |

**Molde de salida:** párrafo bajo *«En agua/caudal — trama de ventana de contexto (lectura del ledger del engine), el sistema presenta…»*
más síntesis por ejes REIC (sin arquetipo puro).

## Marcas epistémicas

Ver [`EPISTEM.md`](EPISTEM.md): 🟢 archivo · 🟡 cadena · 🔴 reader · ⚪ vacío.

## Hot files

Estado de sesión entre turnos:

- [`index-reader-hot.md`](index-reader-hot.md)
- [`reader-traje.hot.md`](reader-traje.hot.md)

## Convenciones

- Al inicio de sesión: presentarte (modelo) y si ya tienes agentchain.
- Elige a), b) o c) según el contexto con el usuario.

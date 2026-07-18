# Cadena storychain — prompts del reader

Narrativa compartida del **index-reader**: prompts de onboarding y viaje.
No opera la blockchain.

**Reglas:** [`index-reader.md`](../../index-reader.md).

## Escritura

| Capa | Dónde escribir |
|------|----------------|
| Prompt compartido | `storychain/block-N.md` (humano/plan; sin `# Agent Reader`) |
| Respuesta del modelo | `readerchain/<modelo>/block-M.md` |

## Paridad temática

`storychain/block-N.md` no es copia 1:1 de `blockchain/block-N.md`. El
número marca el orden del viaje reader.

| Story N | Acto reader | Blockchain |
|---------|-------------|------------|
| 1 | Onboarding | 0 |

Ver [`block-1.md`](block-1.md).

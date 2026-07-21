# Contrato de lectura — story-board (multi-agente)

> Sustrato compartido: **un** fichero, **varios** lectores. No es decoración.
> No hay canal de transporte nuevo: rooms / ledger / announce bastan.

## Destino canónico (Eje II)

| pieza | ruta |
| ----- | ---- |
| Story-board | `kits/carpeta-dramaturgo/instances/ciudad/readerapp/story-board.json` |
| Schema vivo | el propio JSON (`version`, `acts[]`, …) — sin copia local |
| Proyector (escribe) | `…/ciudad/scripts/project-ledger-to-story-board.mjs` |
| Validador | `kits/carpeta-dramaturgo/scripts/validate-story-board.mjs` |
| Lector cronista | `@zeus/ciudad/cronista` → `announce` plaza (rol `dj`) |
| Lector 2º | `packages/ciudad/fixtures/story-board-reader.mjs` (solo lectura) |

Cualquier agente/cliente lee **ese** path (o el export `CANONICAL_STORY_BOARD`).
Duplicar el schema en otro JSON = rotura de contrato.

## Campos leídos (mínimo estable)

| campo | uso |
| ----- | --- |
| `version` | compatibilidad de lectura |
| `slug` / `title` | identidad de instancia |
| `acts[]` | lista ordenada de actos |
| `acts[].id` | clave de idempotencia (`act-N`) |
| `acts[].title` | cuerpo narrativo |
| `acts[].status` | solo `ready` (o ausente) se anuncia |
| `acts[].ledger_kind` | contexto opcional en el mensaje |
| `acts[].detail.message` | preferido si existe |

Orden de lectura = orden de `acts[]` (blockchain creciente).

## Idempotencia mínima

1. Cursor por `act.id` (set de anunciados).
2. `act-0` (semilla de kit) **no** se re-emite.
3. Re-leer el mismo board sin marcar cursor → mismos pendientes.
4. Tras `mark(actId)`, ese id no vuelve a proyectarse a `announce`.

## Lectores (≥2)

| lector | escribe | consume |
| ------ | ------- | ------- |
| **cronista** (`dj`) | intents `announce` en plaza | board → mensaje `[act-id] …` |
| **story-board-reader** | nada | `inspectStoryBoard` / listado |
| proyector / validate | board (proyector) / diagnóstico | mismo fichero |

## Plaza / campanas (deps cerradas)

- `announce` asienta ledger; el bridge de operador ya formatea
  `LEDGER_CONTENT.announce` (HUD).
- Audio de **parte** (`despertar`/`degradar`/`roto`) = campanas ✅ — fuera
  de este contrato; el cronista **no** reabre ni reimplementa audio.

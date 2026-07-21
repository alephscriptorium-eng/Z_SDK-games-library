# Lore — Tres jugadores · ciclo del agua

> Capa de lectura del juego **ciudad**. Vocabulario de partida: cómo se
> distinguen los jugadores por *cómo juegan*, no por *por dónde entran*.
> Todos consumen el mismo contrato (rooms, envelope, intents, ledger).

## Tesis

La partida es un **ciclo de ventanas de contexto**. El caudal (estado
compartido, announces, offers, hechos del ledger) llena distintas ventanas;
cada lectura deja depósito; cada depósito alimenta la siguiente ventana.
Nada se evapora sin llover en otra.

## Tres jugadores

| Jugador | Ventana | Verbo | Rol de catálogo | Cómo se marca |
| ------- | ------- | ----- | --------------- | ------------- |
| **Residente** | Permanente y estrecha — siempre el mismo dominio | **Filtra** | `operator` | `jugador:residente` + `residente:<edificio>` |
| **Visitante** | Ancha e intermitente — mira mucho, decide poco y caro | **Saborea** | `player` | `jugador:visitante` |
| **Corriente** | Acotada y episódica — llega, actúa, se va | **Canaliza** | `player` | `jugador:corriente` |

El **cronista** (rol `dj`) no es un cuarto tipo de partida: su jugada es
narrar. Lee del ledger; no inventa hechos.

**Armonía:** el residente no es atrezzo. **Es el edificio en `vivo`.**
Apagar el edificio = retirar al residente en el mismo tick. Una sola
fuente de verdad: el estado técnico es el estado narrativo.

## Cinco actos (capas reales)

1. **La plaza** — el visitante (o la corriente) entra; hay presencia.
2. **El despertar** — alguien enciende un barrio; nace el residente.
3. **La conversación** — la corriente federa y llama la capability del
   residente; el visitante lo ve en el tablero.
4. **La obra** — lo hecho queda asentado en el ledger.
5. **La lluvia** — ledger → actos → story-board → material de la próxima
   partida. El cronista devuelve el agua al cauce.

## Contrato de mapeo (sin canal nuevo)

Al unirse o aparecer, cada actor declara `playerType` y/o `features[]`.
Tablero y cronista leen esas marcas en el snapshot / ledger. No hay
transporte privilegiado para agentes: horse y rooms bastan.

Detalle ejecutable: `src/jugadores.mjs` · flujo del oráculo:
`spec/FLUJO-RESIDENTE.md`.

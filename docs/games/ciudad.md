# ciudad

**La Ciudad** — juego insignia sobre barrios con estados vivos (`vivo` /
`latente` / `muerto` / `roto`): un rabbit entra, camina, anuncia en plaza y
despierta barrios. Los **tres jugadores** (residente / visitante /
corriente) comparten el mismo contrato; el **cronista** narra sin inventar
hechos.

| Pieza | Ruta en el repo |
| ----- | --------------- |
| Dominio + autoridad + vista | `packages/ciudad/` |
| Start pack | `@zeus/startpack-ciudad` |
| Tag de puerta (publicado) | [`startpack-ciudad-v0.1.0`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-ciudad-v0.1.0) |
| Playbook / lore | `packages/ciudad/spec/CASOS.md` · `packages/ciudad/spec/LORE.md` |
| MCP jugador | `packages/ciudad/src/player-mcp/` |

## Estados vivos (pozo → ciudad)

Los barrios del gamemap llevan estado jugable. El loop degrada lo no
visitado (`vivo` → `latente` → `muerto`); `wake` gasta energía; `announce`
en plaza la recarga. El snapshot expone un **objetivo colectivo**
(`objetivo: { vivos, umbral, cumplido }`) — la ciudad gana o decae, sin
ganador individual.

Wake sin acta persistida deja el barrio en `roto`; la reparación pasa por
viaje + reescritura de acta. Misiones eligen origen/destino del censo
(bias decay); sin misión, idle = random-walk. El cronista (rol `dj`) lee
el story-board y re-emite `announce` en plaza. Partes del ledger alimentan
**campanas** (clases como `despertar`) que el operator-ui consume.

Detalle ejecutable: README de
[`@zeus/ciudad`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/README.md).

## Tres jugadores

| Jugador | Rol catálogo | Cómo se marca |
| ------- | ------------ | ------------- |
| Residente | `operator` | `jugador:residente` + `residente:<edificio>` |
| Visitante | `player` | `jugador:visitante` |
| Corriente | `player` | `jugador:corriente` |

El residente **es** el edificio en `vivo`: apagar el edificio = retirar al
residente en el mismo tick. Lore canónico:
[`spec/LORE.md`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/spec/LORE.md).

## Jugar con agentes (MCP + peercard)

Un proceso MCP = un actor. El bootstrap firma peercard (peer-card-seat) y
la reenvía en el join — **mismo carril de identidad** que la puerta humana.
No hay transporte privilegiado para agentes: rooms + peercard bastan
(**ningún jugador privilegiado**).

Tools publicados: `player_join` · `player_walk` · `player_announce` ·
`player_wake` · `player_state` · `player_leer_parte`. Resources:
`ciudad://player/state` · `scene` · `casos`.

Verdad técnica citable (tests CA):
[`packages/ciudad/test/ciudadano-agente.test.mjs`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/test/ciudadano-agente.test.mjs)
— peercard humano-puerta + peercard agente-MCP (dos tipos, seats distintos)
+ campanas desde parte en ledger.

## Cómo instalar tu ciudad

Release real publicado:

- Tag:
  [`startpack-ciudad-v0.1.0`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-ciudad-v0.1.0)
- Assets: `zeus-startpack-ciudad-0.1.0.tgz` + `ACTA-ciudad-v0.1.0.md`
- Catálogo: [Start packs](/startpacks) · mecanismo: [Releases](/releases#ciudad)

```bash
npm install https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-ciudad-v0.1.0/zeus-startpack-ciudad-0.1.0.tgz
# o, tras descargar el asset:
npm install ./zeus-startpack-ciudad-0.1.0.tgz
```

Ese tag es el **default de puerta** (federación / peercard → arranque). Ver
también la fila `ciudad` en [Start packs](/startpacks).

## Cómo levantarlo (repo)

Desde la raíz de `Z_SDK-games-library` (tras `npm install`):

```bash
npm test -w @zeus/ciudad
npm run start:mcp -w @zeus/ciudad
```

Overrides: `ZEUS_CIUDAD_ROOM`, `ZEUS_MCP_CIUDAD` (default `:4133`),
`ZEUS_STARTPACK_CIUDAD`. Smoke de federación: `npm run e2e:ciudad-federation`.

## Spec

- [CASOS.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/spec/CASOS.md)
- [LORE.md](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/spec/LORE.md)
- [README del juego](https://github.com/alephscriptorium-eng/Z_SDK-games-library/blob/main/packages/ciudad/README.md)

## Releases

Ver [Releases · ciudad](/releases#ciudad).

*Una obra de Scriptorium. Bajo animus iocandi.*

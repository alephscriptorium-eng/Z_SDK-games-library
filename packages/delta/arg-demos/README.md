# @zeus/arg-demos

La **Autoridad** de delta y el launcher de la demo de 3 visores.

- `apps/authority/` — único proceso que muta el dominio (gate G-ARG.1):
  recibe `arg:intent` de la room, aplica el reducer de `@zeus/arg-domain` y
  publica `arg:state` (10 Hz), `arg:track` y `arg:ledger`.
- `launch.mjs` — `npm run demo:arg` desde la raíz: reutiliza (o levanta) el
  socket-server :3017, cache-browser :3015, firehose-browser :3016, la
  autoridad y el arg-console :3021. Con `ZEUS_OPEN_BROWSER=1` abre 5 ventanas
  del juego (tablero, dos jugadores, cache y firehose con tracking); por
  defecto no abre navegador.

Env útiles: `ZEUS_ARG_ROOM` (ARG_DELTA), `ZEUS_ARG_FEEDS` (`auto|synthetic|real`),
`ZEUS_ARG_SEED`, `ZEUS_ARG_GOAL_LABELED`, `ZEUS_ARG_GOAL_EXCAVATED`,
`ZEUS_OPEN_BROWSER=1` (opt-in para abrir visores).

Ver [../spec/CONTRATO.md](../spec/CONTRATO.md).

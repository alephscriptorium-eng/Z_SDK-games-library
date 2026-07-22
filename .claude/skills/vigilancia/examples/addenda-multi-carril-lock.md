# ADDENDA-EJEMPLO-LOCK · fixture multi-carril (sintética)

Ejemplo de elevación por `index.lock` sostenido. Sin datos de instancia.

# ADDENDA-lock-demo · Rn-gobierno · freeze por lock

## §interna

Pulso: `index.lock` presente en el root de gobierno durante ≥3 ciclos del
watcher. Shape asumida: freeze pushes de gobierno en ambos carriles +
elevar. No mezclar con hallazgos de obra en esta addenda (otra addenda
si hace falta).

## §WP

### Hallazgo

`index.lock` sostenido ≥3 ciclos en el repo de gobierno. Carril:
`Rn-gobierno`.

### Propuesta

1. Freeze inmediato de pushes de gobierno en todos los carriles activos.
2. No despachar workers nuevos hasta que el lock desaparezca y la higiene
   §8 del carril afectado vuelva a PASS.
3. Inspeccionar procesos git colgados; no matar workers vivos a ciegas.

### CA

- Tras resolución: 0 `index.lock` / `HEAD.lock` en 2 ciclos consecutivos.
- Bitácora del vigía registra el fin del freeze con etiqueta `Rn-gobierno`.

## Prueba de ceguera

```text
# Fixture: patrón local del custodio sobre §WP → 0 matches
```

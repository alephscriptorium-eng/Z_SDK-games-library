# `@zeus/startpack-kit`

Loader compartido de start packs (WP-U110). Una sola implementación de
`loadStartPack` para todos los `@zeus/startpack-*` de la games-library.

## API

```js
import {
  loadStartPack,
  createStartPackLoader,
  readJsonIfExists,
  readTextIfExists
} from '@zeus/startpack-kit';

// Núcleo (tests / tooling)
const pack = loadStartPack({
  root,
  packageName: '@zeus/startpack-sketch',
  game: 'sketch',
  enrich(base) {
    return { env: { ZEUS_VOLUMES_ROOT: base.volumesRoot } };
  }
});

// Thin wrapper en un startpack-*
const { loadStartPack: load, resolveStartPackRoot } = createStartPackLoader({
  packageRoot: PKG_ROOT,
  packageName: '@zeus/startpack-delta',
  game: 'delta',
  enrich(/* game-specific */) {}
});
```

El núcleo **no** nombra conceptos exclusivos de un juego. Enrichs
(delta/pozo/sketch/solve) viven en cada `@zeus/startpack-*`.

## Consumidores

| paquete | rol |
| ------- | --- |
| `@zeus/startpack-delta` | thin + enrich ARG |
| `@zeus/startpack-pozo` | thin + enrich pozo |
| `@zeus/startpack-sketch` | thin + enrich sketch |
| `@zeus/startpack-solve-coagula` | thin + enrich SOLVE |

Notario / `resolve-startpack` siguen importando `loadStartPack` desde cada
pack (API pública estable).

## Tests

```bash
npm test -w @zeus/startpack-kit
```

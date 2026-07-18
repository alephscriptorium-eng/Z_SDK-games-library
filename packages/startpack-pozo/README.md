# `@zeus/startpack-pozo`

Start pack de ronda para **pozo** (WP-U62 / regla de los dos juegos).

Misma forma que `@zeus/startpack-delta`: manifest, semillas, volumes
sintéticos, acta. Pipeline parametrizado por `--game pozo`.

```js
import { loadStartPack } from '@zeus/startpack-pozo';
const pack = loadStartPack();
process.env.ZEUS_VOLUMES_ROOT = pack.volumesRoot;
```

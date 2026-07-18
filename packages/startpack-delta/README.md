# `@zeus/startpack-delta`

Start pack de ronda para **delta** (WP-U62 / ARQUITECTURA §6).

Contiene: `manifest.json`, semillas (`seeds/`), volumes sintéticos
(`volumes/`) y `acta/ACTA.md`. Canal primario: registry `@zeus`. Espejo:
GitHub Release en este repo (tarball + acta).

## Consumo

```bash
# tras publish (ops / NPM_TOKEN):
npm install @zeus/startpack-delta

# equivalente local (file: / tarball):
npm install ./path/to/zeus-startpack-delta-0.1.0.tgz
```

```js
import { loadStartPack } from '@zeus/startpack-delta';
const pack = loadStartPack();
process.env.ZEUS_VOLUMES_ROOT = pack.volumesRoot;
// autoridad delta usa pack.gamemap + pack.env
```

Env útiles: `ZEUS_STARTPACK_ROOT` (árbol descomprimido) o resolución npm
del paquete. Ver `docs/startpacks.md` en la raíz de la library.

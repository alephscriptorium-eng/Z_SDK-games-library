# @zeus/startpack-solve-coagula

Start pack del tercer juego **SOLVE ET COAGULA** (WP-U87).

Incluye:

- `seeds/gamemap.json` + `seeds/story-board.json` + playbook `casos.md`
- `volumes/DISK_02/LINEAS/solve-coagula/` — fixture del corpus **linea-aleph**
  (historial Wikipedia SolveCoagula; subset para release; corpus vivo en
  `network-engine/linea-aleph`)

```js
import { loadStartPack } from '@zeus/startpack-solve-coagula';
const pack = loadStartPack();
```

Release: `node scripts/notario-release.mjs --game solve-coagula`

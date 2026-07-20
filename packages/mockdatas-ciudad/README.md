# `@zeus/mockdatas-ciudad`

Mockdatas pack that models the city as **two browser volumes**:

| Volume | Browser | Meaning |
|--------|---------|---------|
| `DISK_01/FIREHOSE` | `@zeus/firehose-browser` | City **pulse** — handoff edges → microposts |
| `DISK_02/LINEAS/ciudad` | `@zeus/cache-browser` | City as **filesystem** — distrito → barrio → `ficha.md` |

Census states (`vivo` / `latente` / `muerto` / `roto`) live in `data/censo.json` and appear in both views (cadence in firehose text; `meta.json` in cache).

## Generate (build-time)

The generator reads a **cantera** tree (CIUDAD with `MAPA.md`, `01-BARRIOS/`, `GRAFO/handoffs.tsv`). Runtime never opens that path.

```bash
node tools/generate-ciudad-volumes.mjs --cantera /absolute/path/to/CIUDAD
```

Idempotent: same cantera + censo → same volume bytes.

## Start browsers

Requires a local mesh monorepo checkout (`ZEUS_SDK_ROOT`, sibling `../zeus-sdk`, or `.deps/zeus-sdk`) with workspace deps installed.

```bash
npm run start:firehose   # ZEUS_VOLUMES_ROOT=./volumes → firehose-browser :3016
npm run start:cache      # same → cache-browser :3015  (open /?linea=ciudad)
```

## Habitual flows

1. **Pulse of a district** — firehose → corpus `candidate` → preview posts tagged `[pulso:vivo/…]`; filter visually by handle / text for barrio names in that district.
2. **Open a barrio ficha from cache** — cache → linea `ciudad` → `distritos/<distrito>/<Barrio>/ficha.md` (markdown preview).
3. **Cross micropost → ficha** — from a post `src → dst`, note `src`/`dst` in the text; in cache open `distritos/…/<Barrio>/` matching that id.
4. **Census visibility** — muerto barrios do not emit pulse posts; latente emit every 3rd edge; cache `meta.json` shows `"estado"` for every barrio.

## Layout

```text
volumes/
  volumes.json
  DISK_01/FIREHOSE/{candidate,raw,discarded,labeled}/pulso/*.json
  DISK_02/LINEAS/registry.yaml
  DISK_02/LINEAS/ciudad/{MAPA.md,censo.json,distritos/…,manifest.json,nodos/}
```

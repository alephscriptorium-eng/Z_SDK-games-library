# Releases — start packs

Estado **real** de GitHub Releases en
[`alephscriptorium-eng/Z_SDK-games-library`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases)
(consultado 2026-07-18). Publish npm al registry propio puede estar ⏳
(`NPM_TOKEN`); el espejo GitHub Release + tarball cubre el consumo.

Canal: `@zeus/startpack-<game>` · acta Notario · tag
`startpack-<game>-v<version>`.

---

## delta

| Campo | Valor |
| ----- | ----- |
| Paquete | `@zeus/startpack-delta@0.1.0` |
| Tag / Release | [`startpack-delta-v0.1.0`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-delta-v0.1.0) |
| Acta | [`ACTA-delta-v0.1.0.md`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-delta-v0.1.0/ACTA-delta-v0.1.0.md) |
| Tarball | [`zeus-startpack-delta-0.1.0.tgz`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-delta-v0.1.0/zeus-startpack-delta-0.1.0.tgz) |

```bash
npm install @zeus/startpack-delta
# o, sin registry:
npm install https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-delta-v0.1.0/zeus-startpack-delta-0.1.0.tgz
```

---

## pozo

| Campo | Valor |
| ----- | ----- |
| Paquete | `@zeus/startpack-pozo@0.1.0` |
| Tag / Release | [`startpack-pozo-v0.1.0`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-pozo-v0.1.0) |
| Acta | [`ACTA-pozo-v0.1.0.md`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-pozo-v0.1.0/ACTA-pozo-v0.1.0.md) |
| Tarball | [`zeus-startpack-pozo-0.1.0.tgz`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-pozo-v0.1.0/zeus-startpack-pozo-0.1.0.tgz) |

```bash
npm install @zeus/startpack-pozo
# o, sin registry:
npm install https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-pozo-v0.1.0/zeus-startpack-pozo-0.1.0.tgz
```

---

## sketch

⏳ **sin releases** en GitHub (2026-07-18).

El paquete `@zeus/startpack-sketch@0.1.0` existe en el árbol
(`packages/startpack-sketch/`, WP-U70) y se puede empaquetar localmente con
Notario, pero **no hay** tag `startpack-sketch-v*` ni assets publicados.

```bash
# cuando exista Release:
# npm install @zeus/startpack-sketch
npm run release:startpack -- --game sketch   # local / prep
```

---

## Futuros (SOLVE, …)

⏳ **sin releases** — no hay start packs publicados para títulos futuros.

Ver [Futuros](/games/futuros).

---

## Cómo publicar (Notario)

```bash
npm run release:startpack -- --game delta --publish-github
```

Detalle de consumo y pipeline: [Start packs](/startpacks).

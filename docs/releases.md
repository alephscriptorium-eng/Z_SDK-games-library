# Releases — start packs

Cada release de datos es un paquete `@zeus/startpack-<game>` + acta Notario +
tarball. Canal: tag `startpack-<game>-v<version>` con assets (acta + `.tgz`).

**Verdad viva** de qué hay publicado (versiones, tags, assets):

[GitHub Releases · Z_SDK-games-library](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases)

Esta página describe el mecanismo. No duplica tablas de versión ni fechas a
mano: si falta un tag o un asset, aún no está publicado.

---

## Instalar un start pack

### Registry npm (`@zeus`)

```bash
npm install @zeus/startpack-delta
npm install @zeus/startpack-pozo
```

Sustituí el sufijo por el juego (`sketch`, `solve-coagula`, `plaza`, …) cuando
exista el paquete en el registry.

### Tarball desde GitHub Release

En la página de Releases del juego, tomá la URL del asset `.tgz` (o descargalo
y instalalo por path):

```bash
npm install https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/download/startpack-<game>-v<version>/zeus-startpack-<game>-<version>.tgz
# o, tras descargar:
npm install ./zeus-startpack-<game>-<version>.tgz
```

---

## Juegos con canal de release

| game | paquete | ancla |
| ---- | ------- | ----- |
| `delta` | `@zeus/startpack-delta` | [#delta](#delta) |
| `pozo` | `@zeus/startpack-pozo` | [#pozo](#pozo) |
| `sketch` | `@zeus/startpack-sketch` | [#sketch](#sketch) |

### delta {#delta}

Buscá en Releases el tag `startpack-delta-v*` y sus assets (acta + tarball).

### pozo {#pozo}

Buscá en Releases el tag `startpack-pozo-v*` y sus assets.

### sketch {#sketch}

El paquete vive en `packages/startpack-sketch/`. Aparece en Releases solo
cuando Notario publica tag `startpack-sketch-v*` + assets.

### Futuros (SOLVE, …)

Sin start packs publicados hasta que exista tag/Release. Ver
[Futuros](/games/futuros) (página de estado).

---

## Cómo publicar (Notario)

```bash
npm run release:startpack -- --game delta --publish-github
```

Detalle de consumo y pipeline: [Start packs](/startpacks).

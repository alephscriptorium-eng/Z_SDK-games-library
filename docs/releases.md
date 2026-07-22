# Releases — start packs

Cada release de datos es un paquete `@zeus/startpack-<game>` + acta Notario +
tarball. Canal: tag `startpack-<game>-v<version>` con assets (acta + `.tgz`).

**Verdad viva** de qué hay publicado (versiones, tags, assets):

[GitHub Releases · Z_SDK-games-library](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases)

Esta página describe el mecanismo. No duplica tablas de versión ni fechas a
mano: si falta un tag o un asset, aún no está publicado.

---

## Instalar un start pack

### Registry npm (@zeus)

Canal previsto para instalar por nombre (`npm install @zeus/startpack-<game>`).
Estado del publish npm: ver [Futuros](/games/futuros). Mientras esté
pendiente, usá el tarball del Release (arriba).

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

Los juegos con canal se ven en la propia página de
[Releases](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases):
un tag `startpack-<game>-v*` por juego publicado.

### delta {#delta}

Buscá en Releases el tag `startpack-delta-v*` y sus assets (acta + tarball).

### pozo {#pozo}

Buscá en Releases el tag `startpack-pozo-v*` y sus assets.

### ciudad {#ciudad}

Tag publicado:
[`startpack-ciudad-v0.1.0`](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-ciudad-v0.1.0)
(acta + tarball). Ficha del juego: [ciudad](/games/ciudad). Catálogo:
[Start packs](/startpacks). Default de puerta federada.

### sketch {#sketch}

El paquete vive en `packages/startpack-sketch/`. Aparece en Releases solo
cuando Notario publica tag `startpack-sketch-v*` + assets.

### Otros títulos

Sin start packs publicados hasta que exista tag/Release. Estado y candidatos
en [Futuros](/games/futuros). **ciudad** ya tiene Release — ver ancla
arriba.

---

## Cómo publicar (Notario)

```bash
npm run release:startpack -- --game delta --publish-github
```

Detalle de consumo y pipeline: [Start packs](/startpacks).

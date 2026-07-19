# Futuros

> **Página de estado** (no doctrina). Aquí se declara qué títulos están en
> curso o sin Release publicado. Las páginas doctrinales apuntan a
> [GitHub Releases](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases)
> como verdad viva; no inventan start packs ni versiones a mano.

| Título | Estado | Notas |
| ------ | ------ | ----- |
| sketch (startpack) | paquete en repo | `@zeus/startpack-sketch` en árbol; aparece en Releases solo con tag `startpack-sketch-v*` → [Releases · sketch](/releases#sketch) |
| Publish registry npm | gated (ops) | Canal primario documentado en [Start packs](/startpacks); espejo GitHub Release cubre consumo mientras tanto |

## CARPETA DRAMATURGO

Plantilla de experiencia del mundo A (dramaturgo), no un juego de producto
por sí sola:

```bash
npm run instantiate:carpeta-dramaturgo -- --slug mi-juego --title "…"
npm run instantiate:carpeta-dramaturgo -- --slug from-solve --from SOLVE_ET_COAGULA --force
npm run test:carpeta-dramaturgo
```

→ [kits/carpeta-dramaturgo](https://github.com/alephscriptorium-eng/Z_SDK-games-library/tree/main/kits/carpeta-dramaturgo)

## call4makers

El catálogo está abierto. Cauces de contribución:

- **Dramaturgia** — obras y líneas nuevas: el método vive en el kit de
  carpeta del dramaturgo y los casos se escriben en markdown llano.
- **Código** — issues y PRs en el
  [repo](https://github.com/alephscriptorium-eng/Z_SDK-games-library);
  el aparato, en el monorepo hermano
  [`Z_SDK`](https://github.com/alephscriptorium-eng/Z_SDK).
- **Datos y traducción** — corpus, etiquetado y versiones de los start
  packs existentes.

Sin inventar releases: lo publicado, y solo eso, vive en Releases.

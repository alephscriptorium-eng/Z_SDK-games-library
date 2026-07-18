# Futuros

> **Página de estado** (no doctrina). Aquí se declara qué títulos están en
> curso o sin Release publicado. Las páginas doctrinales apuntan a
> [GitHub Releases](https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases)
> como verdad viva; no inventan start packs ni versiones a mano.

| Título | Estado | Notas |
| ------ | ------ | ----- |
| SOLVE ET COAGULA | en curso | Tercer juego; kit [CARPETA DRAMATURGO](https://github.com/alephscriptorium-eng/Z_SDK-games-library/tree/main/kits/carpeta-dramaturgo) |
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

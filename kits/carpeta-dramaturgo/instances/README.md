# Instances — juegos instanciados desde la carpeta

Cada subcarpeta es un juego narrativo creado con
`scripts/instantiate.mjs`. **Solo se edita dentro de la instancia.**

| Slug | Título | Fuente | Notas |
|------|--------|--------|-------|
| `toy-plaza` | Plaza de juguete | plantilla | CA WP-U86 |
| `from-solve-mini` | From Solve Mini | obra (fixture) | CA WP-U112 (hermético) |
| `from-solve-live` | (local) | obra SOLVE | generado por test si hay sibling; no commitear si es enorme |

```bash
# plantilla vacía
npm run instantiate:carpeta-dramaturgo -- --slug mi-juego --title "…" --theme "…"

# desde obra (slug documentado o path)
npm run instantiate:carpeta-dramaturgo -- --slug from-solve --from SOLVE_ET_COAGULA --force
```

# Marcas epistémicas — SOLVE ET COAGULA

Convención destilada de ALEPH_ET_OMEGA / SOLVE_ET_COAGULA. Obligatoria en
modo reader y recomendada en agentchain.

| Marca | Significado | Ejemplo |
|-------|-------------|---------|
| 🟢 | Hecho de archivo verificable en esta carpeta o corpus citado | oldid, bytes, `estado.json`, bloque en disco |
| 🟡 | Conclusión de cadena (blockchain / agentchain) | inferencia con ancla a `block-N.md` |
| 🔴 | Acto readerchain del modelo (sesión reader) | persistido en `readerapp/readerchain/<modelo>/` |
| ⚪ | Vacío explícito — no hay evidencia | `fetched: false`, corpus ausente, stub |

## Reglas

- No mezclar 🟢 y 🟡 sin etiqueta.
- Ante duda: ⚪ + qué faltaría para pasar a 🟢.
- El traje stub (`reader-traje.hot.md`) no inventa poderes: solo marca.

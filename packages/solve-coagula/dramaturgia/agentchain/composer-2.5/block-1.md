# User

A partir de los personajes del bloque anterior, haz un abstract o exordio a la historia con foco en:

¿Cuál es el árbol de entradas hilos, conversaciones que están implicados? ¿Cuál es el mapa de calor? ¿cuál es la dinámica? ¿Qué satélites merecen su propia línea, las tenemos en caches? ¿cuál es el big picture? Crea un artículo de prensa que contraste Wikipedia antes y después de SolveCoagula en el mapa (¿Qué quedó de SolveCoagula tras el último commit?).

Nota, este bloque es la mitad del bloque siguiente.

# Agent

## Big picture: un mes que redibujó la filosofía de la ciencia en español

En octubre de 2007 la [Wikipedia en español](https://es.wikipedia.org/) tenía piezas sueltas: un esbozo popperiano de demarcación, un manual escéptico de pseudociencia, satélites sin grafo denso. Seis semanas después, un único usuario había dejado dos polos gruesos —demarcación y pseudociencia— y veintidós enlaces periféricos cosidos con «Véase también». Luego calló para siempre ([12910974](https://es.wikipedia.org/w/index.php?title=Pseudociencia&oldid=12910974), 18 nov 2007).

### Árbol de entradas

```
                    [Problema demarcación] 713 edits (linea1)
                              │
         ┌────────────────────┼────────────────────┐
         │                    │                    │
   [Pseudociencia]      [Método científico]   [Fil. ciencia]
   169 + línea gruesa   40 (índice)          25 (índice)
   pseudociencia/       INDICE2              INDICE2
         │
   +14 edits post-cierre dem (nov 12–18)
```

**Total carrera NS0:** 1006 ediciones · 24 artículos (`manifest2.json`). No hubo actividad previa: el usuario nació dentro del problema de demarcación.

### Mapa de calor (edits por artículo)

| Intensidad | Artículo | Edits | Caché línea gruesa |
|------------|----------|-------|-------------------|
| ████████████ | Demarcación | 713 | ✅ `raw/linea.md` + 677 export |
| ██████ | Pseudociencia | 169 (usuario) / 223 (artículo) | ✅ `pseudociencia/` |
| ██ | Método científico | 40 | Índice only |
| █ | Filosofía de la ciencia | 25 | Índice only |
| ░ | 20 artículos thin | 1–12 c/u | INDICE2 |

Solo **dos** líneas gruesas materializadas. El resto permanece en `INDICE2.md` como mapa enciclopedista.

### Dinámica

1. **10 oct:** traducción masiva + auto-revert + fusión Ctrl_Z — taller teórico arranca.
2. **Oct:** monografía demarcación; inyección Matrix (16 oct); satélites en paralelo.
3. **Oct–nov:** vocabulario demarcatorio migra a pseudociencia.
4. **10–18 nov:** volcados y reversiones en pseudociencia (elenco block-0).
5. **Cierre:** última palabra en pseudo; silencio editorial permanente.

### Antes y después en el mapa

| Polo | Antes SC | Tras último commit SC | Hoy (~2025) |
|------|----------|----------------------|-------------|
| Demarcación | 472 B stub | ~176 KB ([12763920](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=12763920)) | ~38 KB — núcleo filosófico conservado; Matrix y heterodoxia podados |
| Pseudociencia | ~34 KB manual Bunge | ~137 KB marco expandido ([12910974](https://es.wikipedia.org/w/index.php?title=Pseudociencia&oldid=12910974)) | ~113 KB — manual escéptico renovado; puente demarcación permanece |

**¿Qué quedó?** Legado estructural: el problema de demarcación existe como artículo serio; pseudociencia sigue enlazando demarcación. Legado argumental maximalista: en gran parte podado en demarcación, reencuadrado en pseudociencia. SolveCoagula levantó un edificio del que la comunidad conservó cimientos y derribó pisos superiores.

**Honestidad de cobertura:** extremos y milestones cacheados al 100 %; ~31 % del histórico de demarcación con cuerpo íntegro —suficiente para este mapa; micro-trazado línea a línea exigiría oleadas adicionales (`CACHE_RUNBOOK.md`).

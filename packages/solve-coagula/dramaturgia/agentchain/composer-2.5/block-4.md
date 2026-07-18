# User

Análisis y cacheo del delta desde la última edición de solvecoagula hasta la actualidad en las principales entradas implicadas. ¿Cuál es el mapa de evolución? ¿Cuánto hay cacheado y cómo podemos cachear selectivamente para trazar mapa de calor por temas/usuarios que se van editando? ¿Cuál es la conclusión periodística de esta evolución?

# Agent

## Diecisiete años después del silencio

SolveCoagula cerró demarcación el **12 de noviembre de 2007** ([12763920](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=12763920)) y pseudociencia el **18 de noviembre** ([12910974](https://es.wikipedia.org/w/index.php?title=Pseudociencia&oldid=12910974)). El delta hacia la Wikipedia viva es la historia de una comunidad que **conservó el problema y podó la provocación**.

### Mapa de evolución (polos principales)

| Entrada | Bytes SC cierre | Bytes actual (~2025) | Δ | Revisiones post-SC |
|---------|-----------------|----------------------|---|-------------------|
| Demarcación | ~176 000 | ~38 000 ([166864369](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=166864369)) | −~78 % | 400+ |
| Pseudociencia | ~137 000 | ~113 000 | −~18 % | sustancial |

**Podados en demarcación:** sección paranormal/Matrix, cientifismo, causalidad extendida, Occam, cuerdas como caso límite.

**Conservados:** Historia, Popper, Kuhn, Feyerabend, positivismo, bibliografía; en pseudo — puente demarcación, medicina alternativa, taxonomías renovadas (Laudan, Thagard añadidos post-SC).

### Estado de caché

| Artefacto | Estado |
|-----------|--------|
| Extremos previo/final SC | ✅ `11663303`, `12370021`, `12763920`, `12910974` |
| Snapshot actual dem/pseudo | ✅ `fetched: true` — dem [166864369](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=166864369), pseudo [173863282](https://es.wikipedia.org/w/index.php?title=Pseudociencia&oldid=173863282) |
| Marco `delta-sc-actual.md` | ✅ curated 2026-06-22 |
| Marco `delta-extremo.md` | ✅ curated (dem + pseudo) |
| Talk UT nov/oct | ✅ audit-talk 2026-06-22 |
| Talk `actual` meta | ⚠️ `fetched: false` en vistas talk (solo artículos dem/pseudo actual cacheados) |

### Cacheo selectivo propuesto (mapa de calor post-2007)

**Objetivo:** trazar quién editó qué tema tras SC sin fetch masivo.

| Prioridad | Viaje | Qué cachear | Para qué |
|-----------|-------|-------------|----------|
| **A** | `delta-sc-actual` | `--latest` dem + pseudo + 5 satélites top (Método, Fil. ciencia, Falsacionismo) | Extremos vivos |
| **B** | `post-sc-milestones` | Top 20 revisiones por Δbytes post-12763920 en dem (API meta + fetch cuerpo de podas Matrix) | Heat map de poda |
| **C** | `post-sc-editors` | `list=users` + contribs en dem/pseudo 2008–2025 (meta only) | Mapa usuarios sin 400 diffs |
| **D** | dumps | Si >200 oldids — `ingest_dump_revisions.py` | Completar >80 % cuerpos |

Comandos: `CACHE_RUNBOOK.md` § Runbook estándar; `fetch_snapshot.py --latest`; `build_fetch_manifest.py --viaje-id delta-sc-actual`.

### Conclusión periodística

La intervención de SolveCoagula **maduró hacia la media enciclopédica**: menos provocación filosófica, más síntesis didáctica. En demarcación, la tesis maximalista fue silenciada por consenso editorial; en pseudociencia, el volumen y el enlace al problema de demarcación **perduran**, pero el tono manifiesto de 2007 fue reencuadrado en manual escéptico.

No fue un usuario que borró algo: fue un usuario que levantó un edificio del que otros conservaron cimientos y derribaron pisos superiores. Para narrar **quién** derribó qué, hace falta completar oleada B —honestamente no cacheado aún al detalle de cada poda temática.

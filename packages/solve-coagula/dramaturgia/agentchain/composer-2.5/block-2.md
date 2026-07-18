# User

Lo mismo que el bloque anterior pero desde el punto de vista de las conversaciones. Podemos basarnos en el artículo anterior para agregar encima esta capa conversacional/debate. Mismas indicaciones que para el contenido pero para el talk.

# Agent

## La conversación que no estaba en la sala

El mapa del bloque anterior contó bytes en artículos. Esta capa cuenta **dónde hablaron** cuando esos bytes chocaron —y descubre un patrón: la negociación ocurrió en el **vestuario** (páginas `Usuario discusión:`), no donde los resúmenes de edición remitían.

### Dos arcos talk paralelos

| Arco | Ventana | Artículo en disputa | Talk con cuerpo | Sala del artículo |
|------|---------|---------------------|-----------------|-------------------|
| **Oct / demarcación** | oct 2007 | Volcado 10 oct ([11951034](https://es.wikipedia.org/w/index.php?title=Problema_de_la_demarcación&oldid=11951034)) | **136** revs | 3 revs (solo 14 oct) |
| **Nov / pseudociencia** | 10–18 nov | Reverts ([12719652](https://es.wikipedia.org/w/index.php?title=Pseudociencia&oldid=12719652), etc.) | **48** revs | **0** revs en 2007 |

### Noviembre: dual-rail

**Carril artículo:** Analiza revierte 10 nov 19:18 → SolveCoagula restaura 19:45 → Ignacio revierte 18 nov → SolveCoagula cierra 19:55.

**Carril talk (±24 h, 15 aristas en `audit-talk.json`):** misma tarde del 10 nov, Analiza advierte vandalismo en su UT ([12719797](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:Analiza&oldid=12719797)); SolveCoagula responde ([12720101](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:Analiza&oldid=12720101)); Analiza explica en la UT de SolveCoagula ([12719917](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:SolveCoagula&oldid=12719917)).

**Qué se pierde sin talk:** «vandalismo» deja de ser etiqueta y pasa a argumento; «¿vamos a dialogar?» del resumen de edición encuentra desarrollo en bandeja ajena; Retama medía citando [Discusión:Pseudociencia](https://es.wikipedia.org/wiki/Discusión:Pseudociencia) —**cero** revisiones en 2007 (probe `talk-sala-probe`).

### Octubre: voces del vestuario

El 10 de octubre la sala de demarcación **calló** mientras Ctrl_Z confirmaba la fusión en UT SolveCoagula ([11958157](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:SolveCoagula&oldid=11958157)). Cuatro días después, Pabloallo felicitaba al constructor y enlazaba `Discusión:Criterio_de_demarcación` —página que **no existía** ([12052572](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:SolveCoagula&oldid=12052572)). Fernando Estel, semanas después, criticaba la coherencia con pseudociencia en la misma UT ([12474528](https://es.wikipedia.org/w/index.php?title=Usuario_discusión:SolveCoagula&oldid=12474528)), no en su bandeja propia.

**54** aristas talk↔artículo en ±24 h para demarcación oct (`article_alignment_demarcacion`).

### Síntesis conversacional

| Capa | Mecanismo |
|------|-----------|
| **Roca** (ontología) | Volcados pluralistas vs manual escéptico / stub |
| **Engranaje** (procedimiento) | Fusión, endesarrollo, bloqueos, reverts |
| **Desacople** | Enlaces «ver discusión» → salas mudas o inexistentes |

SolveCoagula ganó la partitura en el diff final de noviembre; perdió el compás del consenso visible —diálogo en vestuarios que los enlaces oficiales no registraron. El mapa de calor del bloque anterior se lee distinto cuando se superpone esta capa: el calor no estaba solo en los artículos, estaba en las bandejas cruzadas de Analiza, SolveCoagula, Pabloallo y Ctrl_Z.

**Caché:** UT Analiza y SolveCoagula 100 % en ventana nov; vistas dem oct en `audit-talk.json` (generado 2026-06-22). Ignacio UT: 0 en 2007 — no inferir diálogo no cacheado.

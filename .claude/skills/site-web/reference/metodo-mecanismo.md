# Método · mecanismo (BASE-3 abstraída)

Reglas ejecutables. Con argumento + sistema, genera cualquier superficie
sin re-aprender errores.

## A · Mapa

```
FUNDACIÓN (manda)     CANTERA (datos)        SALIDA
BASE-1 argumento      inventarios locales    superficie → paquete
BASE-2 sistema        snapshot de código     ANTES→DESPUÉS + CA
BASE-3 mecanismo      (se consultan)         formato §E
```

La cantera no dirige. Entregas anteriores quedan superadas donde la
fundación las reemplaza; interiores válidos siguen si no chocan.

## B · Reglas de generación

1. Elegir superficie → dosis en BASE-1 §5.
2. Denotación primero (indicativo, sin adjetivos).
3. Cada frase: referencia o muerte. Refs en cara interna; copy pública
   limpia.
4. Política legible, jamás declarada: solo hechos de diseño.
5. Keywords estructuran; adjetivos sobran.
6. Aspiración jamás como hecho (camino con piezas reales).
7. Una idea fuerte por bloque; sello cierra.
8. Heros en registro FOSS puro; golpes en fichas/cuerpos.
9. Conector entre portales = categoría pública (si existe).
10. Cards de obra = mecánica en términos del sistema; catálogo cierra con
    vía de contribución.
11. **Enlaces al back (DevOps).** Los enlaces al back (repo en la forja,
    registry del canal C8, CI/Actions, Pages, CHANGELOG, vía de
    contribución) se declaran **una vez** como **config de tema** +
    placeholders (variables del sitio) y se renderizan vía **footer/nav**;
    nunca un bloque repetido por página (drift). Una página dedicada
    «aparato/proyecto» explica el flujo devops; no re-lista las URLs. Los
    enlaces contextuales a «parte tec» (p. ej. ruta de un skill) se
    **derivan** de la base `{{REPO}}` del tema, sin redeclarar la tabla.
    Corrección de generador defectuoso = regenerar la pipeline con fuente
    única, no parchear página a página. El navegante FOSS llega al back
    desde cualquier superficie. Complementa B9 y B10.

## C · Filtros (grep / revisión antes de entregar)

- **C1 léxico NO:** patrón `mundo.lexico_no` → 0 en superficie pública.
- **C2 negación estructural:** definiciones tipo «no es / no somos / X, no
  Y» → 0 en heros y páginas doctrinales (frontera técnica real se permite
  en docs de aparato).
- **C3 aspiración-como-hecho:** `cualquiera|todo el mundo|sin esfuerzo|
  automáticamente` → revisión manual de cada hit.
- **C4 literales de conversación:** muletillas de chat no entran en copy.
- **C5 contadores:** cifras paramétricas o leídas de fuente viva.
- **C6 ceguera:** patrón `mundo.ceguera` → 0 en el paquete que viaja.
- **C7 decisiones vivas:** cotejar BASE-2 «decisiones tomadas» antes de
  salir.
- **C8 canal real:** todo comando copiable se **ejecuta** contra su canal
  antes de entregarse. Nombrar el canal que funciona hoy (Release ≠
  registry ≠ tarball). Canales gated → página de estado, no hero.
- **C9 listas manuales** dependientes de eventos futuros = rot: generar de
  fuente, link a fuente viva, o caducidad explícita.

## D · Procedimiento

1. Brief de superficie (≤5 líneas): superficie, golpes, elementos, dudas
   de marketing (preguntar antes de redactar).
2. Borrador (§B) saqueando cantera para datos.
3. Pasada §C.
4. Cara interna con `⟨ref⟩`; pública limpia.
5. Paquete §E si destino = swarm; si pieza nueva = maqueta + copy.
6. Revisión de marketing → patrón nuevo vuelve a esta base.

## E · Formato de entrega al swarm

- Reemplazos **verbatim** con ancla ANTES literal; el worker no redacta;
  conflicto texto↔repo = reporte.
- CA por paquete: `docs:build` verde · greps §C = 0 · `git diff --stat`
  solo ficheros listados · spot-check de comandos (C8).
- Slugs, scripts y nombres de paquete intactos; títulos de obra = capa
  editorial.
- Declarar qué decisiones vivas (C7) incorpora el paquete.

## F · Cola de superficies

Tabla del mundo: superficie existente → estado → bloqueo. Por defecto:
sin piezas nuevas; mutar portales reales.

## Backtracking (bucle acordado)

1. Marketing edita el paquete (canónico verbatim).
2. Agente → regla en BASE-2/3.
3. Re-pipeline del resto; cero toque a bloques canónicos.

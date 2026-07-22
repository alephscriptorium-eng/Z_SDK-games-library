# RE-PLAN del protocolo swarm — lecciones de vigilancia

Doctrina del método (no es dato de una sesión). Síntesis de una vigilancia
read-only sobre un swarm: mejora el protocolo **antes** de reusarlo en el
siguiente mundo. Evidencia de una sesión de ~25 WPs en varias olas. Nace
como propuesta; la autoridad que lo acepta es el custodio y quien diseña
el protocolo del próximo mundo.

El checklist operativo de CA por tipo vive en `ejes-ca.md` (mismo
directorio). Este documento es la **fuente narrativa** de esos ejes.

---

## 0. Veredicto de base: el núcleo funciona — no tocarlo

En ~25 WPs no ocurrió **ni una vez** el incidente que motivó la vigilancia
(orquestador pierde contacto con un worker vivo → lo relanza → conflicto).
El ciclo prep→worker→revisión→merge se repitió sin timeouts, sin
relanzamientos, sin workers duplicados, sin un solo conflicto de merge
real. Los únicos roces fueron fricciones de sistema de ficheros (EBUSY al
borrar worktrees) y housekeeping (un stash residual, un puerto colgado) —
nada del protocolo.

**El aislamiento worktree+rama por WP previene el conflicto por
construcción.** Es la pieza que funciona; el re-plan NO la toca. Todo lo
que sigue son mejoras en las COSTURAS, no en el núcleo.

## 1. La tesis: sólido en el aislamiento, ciego en los bordes

Las addendas de una sesión de vigilancia comparten una raíz: **ninguna es
un fallo dentro de un WP; todas nacen en la costura entre WPs o entre
capas.** El swarm hace bien cada pieza aislada y no ve lo que pasa en los
bordes. Tres formas recurrentes (§2–§4). Dos ejes más de gobierno y
sensado cierran el cuadro (§5–§6).

## 2. Eje I — Extracción con cableado

- **Patrón:** un WP crea un contrato/API y se acepta con **cero
  consumidores reales**. Dos olas después sigue sin usarse.
- **Fallo del protocolo:** se acepta cuando la librería **compila y pasa
  tests unitarios** — no cuando alguien la usa.
- **Mejora:** CA obligatorio en toda extracción — **≥1 consumidor de
  producción usando la API nueva, verificado por un test que capture el
  comportamiento** (payload real, no solo `import`). Regla: *una librería
  no está hecha hasta que un consumidor real la usa de verdad.*

## 3. Eje II — Demolición con destino canónico

- **Patrón:** al demoler un paquete, su lógica se queda sin sitio y **cada
  consumidor la reescribe a mano** (2–3 copias, ya divergiendo).
- **Corolario:** una extracción que mira un solo runtime consolida solo
  ese borde; los demás quedan duplicados.
- **Mejora:** todo WP de demolición/extracción declara el **destino
  único** de cada símbolo que sobrevive y **enumera todos los
  runtimes/consumidores**. CA: `grep` del símbolo absorbido → **una sola
  definición**. *Demoler sin destino es multiplicar.*

## 4. Eje III — Gate de dedup en layout y auditoría

- **Patrón:** el layout mueve carpetas; la auditoría busca código
  **muerto**; el código **vivo** duplicado pasa y se propaga a features
  nuevas.
- **Mejora:** el WP de auditoría incluye un **gate de dedup por
  símbolo/patrón**, no solo de vías muertas. Falla si un one-liner de
  infraestructura o una constante de contrato aparece definido en >1
  sitio. *Ordenar el árbol no es consolidar el código.*

## 5. Eje IV — El segundo consumidor como sensor

- **Patrón:** lo que más funciona es forzar un **segundo cliente
  independiente** como gate. Sin él, una capa «funciona» por convención
  de su único cliente, no por contrato.
- **Mejora:** no se da por cerrada ninguna capa/contrato hasta que un
  segundo cliente la ejercita. El plan programa ese segundo cliente como
  **gate**, no como feature tardía. *Un solo cliente prueba que
  compila; el segundo prueba que es contrato.*

## 6. Eje V — Mediación transparente (gobierno vigía↔swarm)

- **Patrón:** revelar al orquestador que «hay revisión externa» (sin
  nombrar el marco contenedor) y pasarle la propuesta funciona sin
  trauma.
- **Mejora:** el modelo robusto no es el secreto sino la **asimetría de
  marco** — el orquestador PUEDE saber que existe revisión externa;
  **nunca conoce el marco que la contiene**. La mediación la hace el
  custodio, abierta. *No escondas al vigía; esconde la capa.*

## 7. Sub-producto reusable — doctrina de vigilancia calibrada

Detalle operativo en el skill `vigilancia` (`reference/ESTACION.md`):

- **Señal de worker muerto = mtime del worktree, no cadencia de
  commits.** Trabajo callado + ráfaga final es el patrón normal.
- **El falso positivo no es inocuo:** un vigía ruidoso empuja al
  orquestador a relanzar — que es el mecanismo del incidente.
- **Clases de huérfano** (carpeta en `.worktrees/` sin registro): solo
  eleva la clase con contenido + `.git` + mtime vivo + WP relanzado.
- **Locks:** `index.lock` de un ciclo = git trabajando; persistente
  ≥2–3 ciclos = anomalía.

## 8. Entrega — dos caminos que no se cruzan

- **(A) Addendas → BACKLOG** vía orquestador, en quietud, en el idioma
  del mundo vigilado (cara pública ciega al marco).
- **(B) Este re-plan → NO va al mundo vigilado.** Es doctrina del método;
  vive en el skill como fuente.

## 9. Cómo usar este documento

1. Al montar o auditar un swarm: leer `ejes-ca.md` y exigir los ejes
   aplicables en cada BRIEF.
2. Al diseñar el vigía del próximo mundo: skill `vigilancia` + fixture
   `instancias/ejemplo-M/` (dato de-identificado), no el histórico real
   de ninguna sesión.

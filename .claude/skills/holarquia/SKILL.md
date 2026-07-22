---
name: holarquia
description: >-
  Método de cadena de holones: dos leyes (ceguera ascendente, acceso
  descendente), crecimiento solo por junturas, plantilla de holón, DS-5
  (apuntar no contener) y acuerdo de agente (memoria→codebase, no inventar
  observaciones, notaría describir-no-prescribir). Parametriza «el mundo»;
  no nombra mundos reales ni el marco.
---

# Skill · holarquia

Método para sostener **fragmentos sin metarrelato**: una cadena de
holones regida por dos leyes, que crece solo por junturas. El skill es
protocolo; los holones concretos, anclas y dossiers viven en la
calibración del mundo consumidor.

## Cuándo aplicar

- Registrar o releer la cadena de holones de un mundo.
- Destilar un holón nuevo solo cuando hay juntura (grieta) real.
- Anclar piezas técnicas por ruta absoluta (DS-5) sin copiar árboles.
- Operar como agente bajo el acuerdo de memoria y notaría (abajo).

## Las dos leyes

1. **Ceguera ascendente.** Un holón no puede concebir a su sucesor.
   Desde dentro se vive como «el fin del mundo».
2. **Acceso descendente.** El sucesor sí relee a sus antecesores y los
   reinterpreta.

Consecuencia: nadie audita su propio techo; la lente que lo audita es
la del sucesor (o queda `<pendiente>`).

## Crecimiento por junturas

La cadena **no** se alarga por deseo ni por checklist. Crece cuando la
**grieta interna** de un holón hace posible al siguiente. Esa grieta se
documenta como **juntura** (material excedente entre dos holones).

Reglas:

- Sin juntura verificable → no se inventa el holón siguiente.
- La juntura describe lo que hay (notaría); no prescribe el producto
  futuro (spec).
- Lo no visto se marca `⏳ sin verificar` / `<pendiente>`.

Plantilla de holón: `reference/plantilla-holon.md`.
Guía de junturas: `reference/junturas.md`.

## DS-5 — apuntar, no contener

- Anclar codebases y evidencias por **ruta absoluta verificada** (o
  puntero git), no copiando árboles ajenos al mundo.
- Componer desde el **registry** del ecosistema cuando haya paquete;
  submodule = puntero, no almacén.
- Prohibido inflar el mundo con copias «por si acaso».

## Acuerdo de agente (cara método)

Destilado para cualquier runner (el mundo puede tener además su propio
`LLM.md` local):

1. **Memoria → codebase.** La memoria interna del agente es arena, no
   piedra. Todo hecho, decisión o ancla durable se encarna en la
   codebase o en el `plan/` del holón. Si memoria y repo discrepan,
   **gana el repo**.
2. **No inventes observaciones.** Lo no verificado se escribe
   `⏳ sin verificar` o `<pendiente>`; la evidencia se cita literal
   (ruta o fragmento). Copista fiel, no oráculo.
3. **Notaría: describir, no prescribir.** Cartografiar lo que hay ≠
   especificar lo que será. Ontología y semántica futuras van como
   secciones descriptivas pendientes, no como grammar/roadmap inventado.

## Parámetros del mundo

| parámetro | significado |
| --------- | ----------- |
| `MUNDO_RAIZ` | raíz del repo / mundo consumidor |
| `REGISTRO_HOLONES` | ruta local del registro (p. ej. bajo `plan/` o `DEVOPS/`) |
| `ANCLAS` | tabla holón → ruta absoluta verificada (DS-5) |

## Pasos

1. Leer el registro local del mundo (`REGISTRO_HOLONES`).
2. Aplicar las dos leyes al leer cada holón (ceguera / acceso).
3. Si hay material nuevo: ¿existe juntura? Si no → no crear holón.
4. Rellenar plantilla; anclar con DS-5; marcar pendientes con honestidad.
5. Antes de cara pública: `scripts/comprobar-ceguera.sh` → `ceguera: 0`.

## Recursos

| ruta | contenido |
| ---- | --------- |
| `reference/plantilla-holon.md` | plantilla de ficha de holón |
| `reference/junturas.md` | protocolo de junturas / notaría |
| `reference/acuerdo-agente.md` | acuerdo memoria · observaciones · notaría |
| `scripts/comprobar-ceguera.sh` | ceguera de este skill (marcas de marco) |
| `examples/registro-minimo.md` | registro sintético (sin mundos reales) |

## Ceguera de este skill

Este skill **nombra** su vocabulario de método (holón, juntura,
holarquía). La prueba de ceguera aquí veta **marcas de marco** y nombres
de mundos reales — no el vocabulario propio. Otros skills del paquete
siguen ciegos a ese vocabulario hasta activar este skill.

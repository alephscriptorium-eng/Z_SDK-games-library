# index-reader — estado de sesión · toy-plaza

Activador: [`index-reader.md`](index-reader.md). **Leer al inicio** de cada
turno; **reescribir** al cambiar itinerario, posición o readerchain.

```
modelo: —
itinerario: —
posicion: —
reader_chain: —
sesion_iniciada: false
ultimo_turno: 2026-07-18
```

Traje: [`reader-traje.hot.md`](reader-traje.hot.md)

## Turno

1. Sincronizar hot files (este archivo + traje).
2. Si `traje:puesto` — seguir checklist en [`STUBS.md`](STUBS.md) § traje
   (modo stub: cabecera mínima + marcas EPISTEM).
3. Actualizar `posicion`, `itinerario`, `reader_chain` y `ultimo_turno` al cerrar.

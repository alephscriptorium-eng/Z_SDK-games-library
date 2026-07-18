# Cadena readerchain — actos por modelo

Actos persistentes del **agente reader**. Cada modelo tiene su carpeta.

**Reglas:** [`index-reader.md`](../../index-reader.md).

## Estructura

```
readerapp/readerchain/
└── <modelo-slug>/
    └── block-M.md
```

## Plantilla

```markdown
# User

{prompt de storychain o turno}

# Agent Reader ({Modelo})

{cabecera traje stub — ver STUBS.md}

{cuerpo del acto con marcas EPISTEM}
```

**Desfase numérico:** `M` en readerchain no tiene que coincidir con `N` en
storychain — alinear por tema.

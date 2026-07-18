# Cadena agentchain — ramas por modelo

Respuestas escribibles al ledger [`blockchain/`](../blockchain/README.md).

**Reglas:** [`index.md`](../index.md) § Contrato de cadenas — medicion.

## Estructura

```
agentchain/
└── <modelo-slug>/     # ej. composer
    └── block-N.md
```

Slug = nombre runtime en minúsculas.

## Plantilla de bloque

```markdown
# User

{copiar de blockchain/block-N.md}

# Agent ({Modelo})

{respuesta}
```

## Flujo

1. Leer `blockchain/block-N.md`.
2. Crear `agentchain/<modelo-slug>/` si no existe.
3. Persistir `# User` + `# Agent (<Modelo>)` en `block-N.md`.

# ADDENDA-EJEMPLO · fixture sintética (no es dato real)

Fixture mínima para ejercitar el formato. No proviene de ninguna sesión.

## §interna

Hallazgo de laboratorio: un worktree bajo `.worktrees/demo-orphan` aparece
en disco sin registro en `git worktree list` durante ≥3 ciclos, con
contenido y `.git`, mtime vivo, mientras el orquestador relanzó el mismo
WP. Clasificación **(c)** — elevar al custodio. No hablar con el swarm.
Carril de laboratorio: `Rn-obra`.

## §WP

### Hallazgo

Carpeta `.worktrees/demo-orphan` sin entrada en `git worktree list`, con
`.git` y mtime reciente, tras relanzo del mismo WP. Carril: `Rn-obra`.

### Propuesta

1. No relanzar de nuevo el WP mientras exista esa carpeta.
2. En quietud: inspeccionar HEAD del huérfano; si coincide con trabajo
   útil, recuperar; si no, `git worktree remove` / limpieza de residuo.
3. Añadir al pulso: exigir ≥2 ciclos antes de logar huérfano no vacío.
4. No mezclar este hallazgo con señales de otro carril en la misma addenda.

### CA

- Tras limpieza: `git worktree list` y `ls .worktrees/` coinciden.
- El watcher no registra `!!HUERFANO` para `demo-orphan` en 2 ciclos.
- Higiene §8 del carril `Rn-obra` en PASS antes del próximo despacho.

## Prueba de ceguera

```text
# Sobre solo §WP (fixture): vocabulario prohibido del marco = 0
# (el consumidor sustituye el patrón por el de su PRACTICAS)
rg -n 'MARCO_PROHIBIDO_PLACEHOLDER' examples/addenda-sintetica.md
→ 0 matches en §WP tras redacción
```

Nota: este ejemplo usa un placeholder a propósito; la prueba real la corre
el vigía con el patrón local del custodio antes de mediar.

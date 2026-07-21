# Acta OPS · H2.4 · fix notario Release-startpack — 2026-07-22

| dato | valor |
| ---- | ----- |
| rol | debug/fix Release-startpack GL |
| claim | pipeline VERDE · artefacto sube · Release `ciudad` cierra deuda regla 16 |
| tip GL (claim) | `6004450` (`60044501a782e8f97f3611ca55e8f9546dc7d01e`) |
| rama fix | `wp/gc-fix-notario-release` → FF `main` · poda post-merge |
| force-push | **no** |
| gates | **sin** desactivar · **sin** `continue-on-error` nuevo |

## Diagnóstico

| hallazgo | detalle |
| -------- | ------- |
| Histórico 20/20 failure | Runs `push` de rama (no tag) · duración **0s** · `jobs: []` · logs expirados. Spurious post-cambio de filtros (U126: solo `workflow_dispatch` + tag `startpack-*-v*`). |
| Triggers actuales | Confirmados: dispatch + tag. No hay trigger en push de branch. |
| Log fresco delta | Dispatch `game=delta` `publish_npm=false` → **VERDE** en tip pre-fix. Notario + GitHub Release OK. |
| Bug real (blando) | `upload-artifact@v4` **no** subía `.release-startpack/` (dir oculto; default `include-hidden-files: false`). Warning «No files were found» mientras el job seguía verde (`if-no-files-found: warn`). |
| Fix | `include-hidden-files: true` + `if-no-files-found: error` (fortalece gate, no lo afloja). |

## Claim → SHA

| repo | tip claim | veredicto |
| ---- | --------- | --------- |
| GL `main` | `60044501a782e8f97f3611ca55e8f9546dc7d01e` | **PASS** FF `406000f..6004450` + push |

## Run-ids VERDES

| rol | run-id | headSha | conclusión | URL |
| --- | ------ | ------- | ---------- | --- |
| Diagnóstico fresco (delta, pre-fix) | [29873268970](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873268970) | `406000f` | **success** | notario OK; artifact miss (bug) |
| Verificación fix (delta) | [29873496360](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873496360) | `6004450` | **success** | 4 files uploaded · artifact ID 8512071044 |
| Release real ciudad | [29873546001](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873546001) | `6004450` | **success** | meta estirada / regla 16 |
| CI tip fix | [29873546141](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873546141) | `6004450` | **success** | push `main` |

## Release (meta estirada · regla 16)

| dato | valor |
| ---- | ----- |
| tag | `startpack-ciudad-v0.1.0` |
| package | `@zeus/startpack-ciudad@0.1.0` |
| URL | https://github.com/alephscriptorium-eng/Z_SDK-games-library/releases/tag/startpack-ciudad-v0.1.0 |
| assets | `zeus-startpack-ciudad-0.1.0.tgz` · `ACTA-ciudad-v0.1.0.md` |
| npm | **no** (`publish_npm=false`) |

## CA H2.4

| id | criterio | veredicto | evidencia |
| -- | -------- | --------- | --------- |
| CA1 | run-id Release VERDE citado | **PASS** | [29873496360](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873496360) (fix) · [29873546001](https://github.com/alephscriptorium-eng/Z_SDK-games-library/actions/runs/29873546001) (ciudad) |
| CA2 | sin desactivar gates / sin `continue-on-error` nuevo | **PASS** | diff solo `include-hidden-files` + `if-no-files-found: error` |
| CA3 | artifact upload real | **PASS** | log «4 files uploaded» en 29873496360 |
| CA4 | Release ciudad URL + tag | **PASS** | tag + URL arriba |
| CA5 | merge FF main + push · claim→SHA | **PASS** | tip `6004450` |

## NO hechos

- No force-push
- No npm publish
- No tocar `continue-on-error` preexistente de `setup:zeus-sdk`
- No reabrir histórico 0s (arqueología: filtro U126)

# Flujo residente — oráculo (`prolog-editor`)

Patrón: **edificio despierto = capability ofertada + presencia en tablero**.
Candidato real del startpack: barrio `prolog-editor` (oráculo).

## Secuencia (mismo contrato rooms/protocol)

1. **Visitante** (o corriente) hace `join` con `playerType` / features.
2. Camina al ancla `ancla-prolog-editor`.
3. Emite `wake` con `tool` (p. ej. `oraculo.consultar`) y `barrioId:
   "prolog-editor"`.
4. Dominio, **mismo tick**:
   - barrio `prolog-editor` → `vivo`
   - nace actor `residente:prolog-editor` con features
     `jugador:residente`, `residente:prolog-editor`, `capability:<tool>`
   - ledger `kind:"wake"` incluye `residenteId` + `residenteFeatures`
   - track `horse-offer` (capability visible al tablero / horse)
5. Snapshot muestra ≥2 tipos (p. ej. corriente + residente; o los tres).
6. `sleep` sobre el mismo barrio → barrio `latente` y **el residente
   desaparece del snapshot en el mismo apply** (cero doble contabilidad).

## Qué no hace este flujo

- No abre un tercer canal de transporte.
- No registra al residente con `join` (`residente_solo_por_wake`).
- No deja residente huérfano si el edificio está apagado.

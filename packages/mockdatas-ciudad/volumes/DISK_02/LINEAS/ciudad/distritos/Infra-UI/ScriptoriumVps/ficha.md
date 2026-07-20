# Barrio 24 — `ScriptoriumVps` (extramuros)

> Distrito: **Infra remota** · 🔒 Nave nativa `scriptorium-vps`  
> **Vecino**: [`05-BlockchainComPort.md`](05-BlockchainComPort.md) — rampa de aterrizaje en la codebase (Oasis/pub/red).

| Campo | Valor |
|-------|-------|
| Path | `ScriptoriumVps/` |
| Submodule git | `scriptorium-vps` |
| Branch | `integration/beta/scriptorium` |
| Runtime | VPS remoto: Caddy, Node-RED, Verdaccio, MCP DevOps |
| Locales/naves | `scriptorium-vps` ✅ registry + bridge `plugin_ox_scriptoriumvps` (**sin secrets**) |
| README-SCRIPTORIUM | `ScriptoriumVps/README-SCRIPTORIUM.md` |
| Agentes / skills / prompts | 0 en path barrio / (8 en plugin plaza) |
| Chatmodes | 0 |

## Qué es

Barrio **en sí mismo**, pero **remoto**: el suelo real es el VPS público; el submodule es espejo operativo.  
No es un barrio hijo de Blockchain — es **vecino**: BlockchainComPort (network/Oasis) es cómo esa infra **aterriza** hábitos, pub y red en el monorepo.

## Puertos

- Ops en VPS (documentar solo puertos/servicios públicos; nunca credenciales en índices)

## Zonificación

- Tipología edificable: solo nave `scriptorium-vps` (ops, verdaccio, nodered pedagógico, stubs anfitrión/BOE…).
- Datos runtime: `ARCHIVO/PLUGINS/SCRIPTORIUM_VPS/` — sin secrets en git.
- Sync 7.1: registry + bridge activos; secrets fuera de git.

## Edificios agénticos

En plaza: `.github_V1/plugins/scriptorium-vps/agents/`  
(vps-ops, nodered-curator, verdaccio-keeper + stubs). Bridge previsto: `plugin_ox_scriptoriumvps`.

## Enlaces ciudad

- Vecino red: [`05-BlockchainComPort.md`](05-BlockchainComPort.md)
- Plan sync: [`../07.1-PLAN-SYNC-DRY.md`](../07.1-PLAN-SYNC-DRY.md)
- Locales: [`../02-LOCALES-Y-NAVES/_INDICE.md`](../02-LOCALES-Y-NAVES/_INDICE.md)

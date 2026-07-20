# Mapa de la Ciudad Scriptorium

```
                         ┌──────────────────────────────┐
                         │   🏛️ PLAZA CENTRAL             │
                         │   .github_V1                   │
                         │   @ox · @indice · @aleph …     │
                         └──────────────┬───────────────┘
                                        │ run_vscode_command
                         ┌──────────────▼───────────────┐
                         │   🏛️ ZIGURAT                    │
                         │   VsCodeExtension              │
                         │   Arrakis Theater · demos      │
                         └──────────────┬───────────────┘
                                        │ terminals / tasks / UIs
     ┌──────────────┬───────────────────┼───────────────────┬──────────────┐
     ▼              ▼                   ▼                   ▼              ▼
┌──────────┐ ┌────────────┐ ┌──────────────────┐ ┌─────────────┐ ┌─────────────┐
│ Barrios  │ │ Barrios    │ │ Barrios          │ │ Barrios     │ │ Barrios     │
│ EDITORES │ │ RED/STREAM │ │ RUNTIME/MCP      │ │ LORE/VOZ    │ │ INFRA/UI    │
└──────────┘ └────────────┘ └──────────────────┘ └─────────────┘ └─────────────┘
```

## Plaza Central (gobierno)

| Edificio | Ruta | Rol |
|----------|------|-----|
| Ayuntamiento Meta | `.github_V1/agents/ox.agent.md` | Oráculo / índice de agentes |
| Portero | `.github_V1/agents/indice.agent.md` | Navegación DRY |
| Productor | `.github_V1/agents/aleph.agent.md` | UI producción |
| Gestor de locales | `.github_V1/agents/plugin-manager.agent.md` | Ciclo de plugins |
| Registro mercantil | `.github_V1/plugins/registry.json` | Catálogo de locales/naves |
| Almacén municipal | plugin `scriptorium-pack` | Instructions core |

→ Detalle: `03-EDIFICIOS/plaza-central.md`

## Zigurat (host IDE)

| | |
|--|--|
| Path | `VsCodeExtension/` |
| Índice | [`00-ZIGURAT/_INDICE.md`](00-ZIGURAT/_INDICE.md) |
| Rol | Opera activity bar, `alephscript.*`, Teatro theatrical, tasks → barrios |

**Criterio**: Plaza gobierna · Zigurat opera · Barrios ejecutan.

## Distritos (agrupación de barrios)

| Distrito | Barrios (path) | Naves/locales típicos |
|----------|----------------|----------------------|
| **🏛️ Zigurat** | `VsCodeExtension` *(ancla gitmodules; ver capa Z)* | — |
| **Editores visuales** | `BlocklyEditor`, `WiringEditor`, `PrologEditor`, `TypedPromptsEditor`, `WorkflowEditor`, `WiringAppHypergraphEditor` | blockly, wire, prolog, typed-prompting, n8n, wiring-app, hypergraph, arg-board-app, escribiente |
| **Red / stream** | `BlockchainComPort`, `StreamDesktop`, `StreamDesktopAppCronos`, `BotHubSDK` | network, bot-hub-sdk |
| **Runtime / MCP** | `AAIAGallery`, `MCPGallery`, `StateMachine`, `NovelistEditor`, `CopilotEngine` | aaia-editor, mcp-presets, novelist |
| **Lore / voz** | `DocumentMachineSDK`, `onfalo-asesor-sdk`, `AgentLoreSDK`, `VectorMachineSDK`, `VectorMachineUI` | lore-sdk, consejo-asesor, vector-machine |
| **Infra / UI** | `ScriptoriumVps` *(remoto/extramuros)*, `UISDKThreejs`, `VibeCodingSuite` | scriptorium-vps · vecino Red: BlockchainComPort |

## Calles principales (fuentes DRY)

| Calle | Destino |
|-------|---------|
| Funcional | `ARCHIVO/DEVOPS/Funcional.md` |
| Técnico | `ARCHIVO/DEVOPS/Tecnico.md` |
| Plugins protocol | `.github_V1/PLUGINS.md` |
| MCP vivos | `.vscode/mcp.json` |
| Esta ciudad | `ARCHIVO/DEVOPS/CIUDAD/` |
| Fichas barrio | `ARCHIVO/DEVOPS/CIUDAD/01-BARRIOS/_FICHAS.md` |
| Zigurat | `ARCHIVO/DEVOPS/CIUDAD/00-ZIGURAT/` |
| DRY gaps | `ARCHIVO/DEVOPS/CIUDAD/07-DRY-VALIDACION.md` |

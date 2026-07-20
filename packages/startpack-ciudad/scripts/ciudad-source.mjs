/**
 * Topology + census + tree catalog — build-time source for seeds.
 * Transformed from city map / barrio sheets / census at authoring time.
 * Runtime never reads external cantera paths.
 */

/** @typedef {'vivo'|'latente'|'muerto'|'roto'} BarrioEstado */

/**
 * @typedef {{
 *   id: string,
 *   slug: string,
 *   displayName: string,
 *   distrito: string,
 *   estado: BarrioEstado,
 *   edificios: Array<{ id: string, tipo: 'local'|'nave' }>,
 *   maquinarias: Record<string, {
 *     cmd: string,
 *     puerto: number|null,
 *     health: string,
 *     autoRestart: boolean,
 *     deps: string[],
 *     barrio: string,
 *     edificio: string
 *   }>
 * }} BarrioSource
 */

/** District hubs (zones) — ids used as map nodes. */
export const DISTRITOS = [
  { id: 'zigurat', displayName: 'Zigurat', role: 'opera' },
  { id: 'editores', displayName: 'Editores visuales', role: 'ejecuta' },
  { id: 'red-stream', displayName: 'Red / stream', role: 'ejecuta' },
  { id: 'runtime-mcp', displayName: 'Runtime / MCP', role: 'ejecuta' },
  { id: 'lore-voz', displayName: 'Lore / voz', role: 'ejecuta' },
  { id: 'infra-ui', displayName: 'Infra / UI', role: 'ejecuta' }
];

/** Government nodes (not districts). */
export const GOBIERNO = [
  { id: 'plaza', displayName: 'Plaza central', role: 'gobierna' },
  { id: 'zigurat', displayName: 'Zigurat', role: 'opera' }
];

/**
 * DRY streets as walk links (flat graph — star from plaza→zigurat→districts).
 * Names mirror the city map’s DRY avenues; topology is explicit ids.
 */
export const CALLES = [
  {
    id: 'calle-plaza-zigurat',
    displayName: 'Calle gobierno',
    from: 'plaza',
    to: 'zigurat',
    dry: 'gobierno'
  },
  {
    id: 'calle-funcional',
    displayName: 'Calle funcional',
    from: 'zigurat',
    to: 'editores',
    dry: 'funcional'
  },
  {
    id: 'calle-tecnico',
    displayName: 'Calle técnico',
    from: 'zigurat',
    to: 'red-stream',
    dry: 'tecnico'
  },
  {
    id: 'calle-plugins',
    displayName: 'Calle plugins',
    from: 'zigurat',
    to: 'runtime-mcp',
    dry: 'plugins'
  },
  {
    id: 'calle-mcp-vivos',
    displayName: 'Calle MCP vivos',
    from: 'zigurat',
    to: 'lore-voz',
    dry: 'mcp-vivos'
  },
  {
    id: 'calle-infra',
    displayName: 'Calle infra',
    from: 'zigurat',
    to: 'infra-ui',
    dry: 'infra'
  }
];

/**
 * 24 barrios — census estado + edificios/maquinarias from barrio sheets.
 * @type {BarrioSource[]}
 */
export const BARRIOS = [
  {
    id: 'vscode-extension',
    slug: 'vscode-extension',
    displayName: 'VsCodeExtension',
    distrito: 'zigurat',
    estado: 'vivo',
    edificios: [{ id: 'host-ide', tipo: 'nave' }],
    maquinarias: {
      'host-ide-extension': {
        cmd: 'code --extensionDevelopmentPath=.',
        puerto: null,
        health: 'extension-host',
        autoRestart: false,
        deps: [],
        barrio: 'vscode-extension',
        edificio: 'host-ide'
      }
    }
  },
  {
    id: 'blockly-editor',
    slug: 'blockly-editor',
    displayName: 'BlocklyEditor',
    distrito: 'editores',
    estado: 'latente',
    edificios: [{ id: 'blockly-editor', tipo: 'local' }],
    maquinarias: {
      'blockly-editor-ui': {
        cmd: 'npm run start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'blockly-editor',
        edificio: 'blockly-editor'
      }
    }
  },
  {
    id: 'wiring-editor',
    slug: 'wiring-editor',
    displayName: 'WiringEditor',
    distrito: 'editores',
    estado: 'vivo',
    edificios: [
      { id: 'wire-editor', tipo: 'local' },
      { id: 'escribiente', tipo: 'local' }
    ],
    maquinarias: {
      'wire-editor-nodered': {
        cmd: 'npm start',
        puerto: 1880,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'wiring-editor',
        edificio: 'wire-editor'
      }
    }
  },
  {
    id: 'prolog-editor',
    slug: 'prolog-editor',
    displayName: 'PrologEditor',
    distrito: 'editores',
    estado: 'latente',
    edificios: [{ id: 'prolog-editor', tipo: 'local' }],
    maquinarias: {
      'prolog-ui': {
        cmd: 'npm run start:ui',
        puerto: 5001,
        health: '/',
        autoRestart: true,
        deps: ['prolog-backend'],
        barrio: 'prolog-editor',
        edificio: 'prolog-editor'
      },
      'prolog-backend': {
        cmd: 'npm run start:backend',
        puerto: 8000,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'prolog-editor',
        edificio: 'prolog-editor'
      },
      'prolog-mcp': {
        cmd: 'npm run start:mcp',
        puerto: 3006,
        health: '/health',
        autoRestart: true,
        deps: ['prolog-backend'],
        barrio: 'prolog-editor',
        edificio: 'prolog-editor'
      }
    }
  },
  {
    id: 'typed-prompts-editor',
    slug: 'typed-prompts-editor',
    displayName: 'TypedPromptsEditor',
    distrito: 'editores',
    estado: 'latente',
    edificios: [{ id: 'typed-prompting', tipo: 'local' }],
    maquinarias: {
      'typed-prompt-ui': {
        cmd: 'npm run dev',
        puerto: 3019,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'typed-prompts-editor',
        edificio: 'typed-prompting'
      },
      'typed-prompt-mcp': {
        cmd: 'npm run start:mcp',
        puerto: 3020,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'typed-prompts-editor',
        edificio: 'typed-prompting'
      }
    }
  },
  {
    id: 'workflow-editor',
    slug: 'workflow-editor',
    displayName: 'WorkflowEditor',
    distrito: 'editores',
    estado: 'muerto',
    edificios: [{ id: 'n8n-editor', tipo: 'local' }],
    maquinarias: {
      'n8n-angular-dev': {
        cmd: 'npm run start',
        puerto: 4200,
        health: '/',
        autoRestart: false,
        deps: [],
        barrio: 'workflow-editor',
        edificio: 'n8n-editor'
      }
    }
  },
  {
    id: 'wiring-app-hypergraph-editor',
    slug: 'wiring-app-hypergraph-editor',
    displayName: 'WiringAppHypergraphEditor',
    distrito: 'editores',
    estado: 'latente',
    edificios: [
      { id: 'wiring-app', tipo: 'local' },
      { id: 'arg-board-app', tipo: 'local' },
      { id: 'hypergraph-editor', tipo: 'local' }
    ],
    maquinarias: {
      'wiring-app-ui': {
        cmd: 'npm run start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'wiring-app-hypergraph-editor',
        edificio: 'wiring-app'
      }
    }
  },
  {
    id: 'blockchain-com-port',
    slug: 'blockchain-com-port',
    displayName: 'BlockchainComPort',
    distrito: 'red-stream',
    estado: 'vivo',
    edificios: [{ id: 'network', tipo: 'local' }],
    maquinarias: {
      'network-stack': {
        cmd: 'docker compose up',
        puerto: null,
        health: 'compose',
        autoRestart: true,
        deps: [],
        barrio: 'blockchain-com-port',
        edificio: 'network'
      }
    }
  },
  {
    id: 'stream-desktop',
    slug: 'stream-desktop',
    displayName: 'StreamDesktop',
    distrito: 'red-stream',
    estado: 'muerto',
    edificios: [],
    maquinarias: {}
  },
  {
    id: 'stream-desktop-app-cronos',
    slug: 'stream-desktop-app-cronos',
    displayName: 'StreamDesktopAppCronos',
    distrito: 'red-stream',
    estado: 'muerto',
    edificios: [],
    maquinarias: {}
  },
  {
    id: 'bot-hub-sdk',
    slug: 'bot-hub-sdk',
    displayName: 'BotHubSDK',
    distrito: 'red-stream',
    estado: 'vivo',
    edificios: [{ id: 'bot-hub-sdk', tipo: 'local' }],
    maquinarias: {
      'bot-hub-runtime': {
        cmd: 'npm start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'bot-hub-sdk',
        edificio: 'bot-hub-sdk'
      }
    }
  },
  {
    id: 'aaia-gallery',
    slug: 'aaia-gallery',
    displayName: 'AAIAGallery',
    distrito: 'runtime-mcp',
    estado: 'latente',
    edificios: [{ id: 'aaia-editor', tipo: 'local' }],
    maquinarias: {
      'aaia-mcp-server': {
        cmd: 'npm run start:mcp',
        puerto: 3007,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'aaia-gallery',
        edificio: 'aaia-editor'
      }
    }
  },
  {
    id: 'mcp-gallery',
    slug: 'mcp-gallery',
    displayName: 'MCPGallery',
    distrito: 'runtime-mcp',
    estado: 'vivo',
    edificios: [{ id: 'mcp-presets', tipo: 'local' }],
    maquinarias: {
      'mcp-launcher': {
        cmd: 'npm run start:launcher',
        puerto: 3050,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'mcp-gallery',
        edificio: 'mcp-presets'
      },
      'socket-io-mesh': {
        cmd: 'npm run start:mesh',
        puerto: 3010,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'mcp-gallery',
        edificio: 'mcp-presets'
      }
    }
  },
  {
    id: 'state-machine',
    slug: 'state-machine',
    displayName: 'StateMachine',
    distrito: 'runtime-mcp',
    estado: 'latente',
    edificios: [{ id: 'state-machine-server', tipo: 'local' }],
    maquinarias: {
      'state-machine-server': {
        cmd: 'npm run start',
        puerto: 3004,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'state-machine',
        edificio: 'state-machine-server'
      }
    }
  },
  {
    id: 'novelist-editor',
    slug: 'novelist-editor',
    displayName: 'NovelistEditor',
    distrito: 'runtime-mcp',
    estado: 'vivo',
    edificios: [{ id: 'novelist', tipo: 'local' }],
    maquinarias: {
      'novelist-mcp': {
        cmd: 'npm run start:mcp',
        puerto: 3066,
        health: '/health',
        autoRestart: true,
        deps: [],
        barrio: 'novelist-editor',
        edificio: 'novelist'
      }
    }
  },
  {
    id: 'copilot-engine',
    slug: 'copilot-engine',
    displayName: 'CopilotEngine',
    distrito: 'runtime-mcp',
    estado: 'vivo',
    edificios: [],
    maquinarias: {}
  },
  {
    id: 'document-machine-sdk',
    slug: 'document-machine-sdk',
    displayName: 'DocumentMachineSDK',
    distrito: 'lore-voz',
    estado: 'vivo',
    edificios: [{ id: 'lore-sdk', tipo: 'nave' }],
    maquinarias: {
      'lore-sdk-runtime': {
        cmd: 'npm start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'document-machine-sdk',
        edificio: 'lore-sdk'
      }
    }
  },
  {
    id: 'onfalo-asesor-sdk',
    slug: 'onfalo-asesor-sdk',
    displayName: 'onfalo-asesor-sdk',
    distrito: 'lore-voz',
    estado: 'vivo',
    edificios: [{ id: 'consejo-asesor', tipo: 'nave' }],
    maquinarias: {
      'consejo-asesor-runtime': {
        cmd: 'npm start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'onfalo-asesor-sdk',
        edificio: 'consejo-asesor'
      }
    }
  },
  {
    id: 'agent-lore-sdk',
    slug: 'agent-lore-sdk',
    displayName: 'AgentLoreSDK',
    distrito: 'lore-voz',
    estado: 'vivo',
    edificios: [],
    maquinarias: {}
  },
  {
    id: 'vector-machine-sdk',
    slug: 'vector-machine-sdk',
    displayName: 'VectorMachineSDK',
    distrito: 'lore-voz',
    estado: 'vivo',
    edificios: [{ id: 'vector-machine', tipo: 'local' }],
    maquinarias: {
      'vector-machine-runtime': {
        cmd: 'npm start',
        puerto: null,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'vector-machine-sdk',
        edificio: 'vector-machine'
      }
    }
  },
  {
    id: 'vector-machine-ui',
    slug: 'vector-machine-ui',
    displayName: 'VectorMachineUI',
    distrito: 'lore-voz',
    estado: 'vivo',
    edificios: [{ id: 'vector-machine-ui', tipo: 'local' }],
    maquinarias: {
      'vector-machine-admin': {
        cmd: 'npm run dev',
        puerto: 3001,
        health: '/',
        autoRestart: true,
        deps: [],
        barrio: 'vector-machine-ui',
        edificio: 'vector-machine-ui'
      }
    }
  },
  {
    id: 'scriptorium-vps',
    slug: 'scriptorium-vps',
    displayName: 'ScriptoriumVps',
    distrito: 'infra-ui',
    estado: 'vivo',
    edificios: [{ id: 'scriptorium-vps', tipo: 'nave' }],
    maquinarias: {
      'vps-deploy': {
        cmd: 'npm run deploy:status',
        puerto: null,
        health: 'deploy',
        autoRestart: false,
        deps: [],
        barrio: 'scriptorium-vps',
        edificio: 'scriptorium-vps'
      }
    }
  },
  {
    id: 'ui-sdk-threejs',
    slug: 'ui-sdk-threejs',
    displayName: 'UISDKThreejs',
    distrito: 'infra-ui',
    estado: 'vivo',
    edificios: [],
    maquinarias: {}
  },
  {
    id: 'vibe-coding-suite',
    slug: 'vibe-coding-suite',
    displayName: 'VibeCodingSuite',
    distrito: 'infra-ui',
    estado: 'latente',
    edificios: [],
    maquinarias: {}
  }
];

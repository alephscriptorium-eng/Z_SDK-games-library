/**
 * E2E SOLVE ET COAGULA: socket + autoridad + MCP; casos C-01..C-03.
 * Puertos aislados. NO setea ZEUS_OPEN_BROWSER.
 *
 *   npm run e2e:solve-coagula-mcp
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkPlaybookCoherence,
  createMcpHttpClient,
  runMcpCases
} from '@zeus/playbook-kit';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';

const CASOS_PATH = paths.solveCasos;
const HOST = 'localhost';
const SOCKET_PORT = 13048;
const MCP_PORT = 14142;
const VIEW_PORT = 13056;
const ROOM = 'SOLVE_MCP_E2E';
const SECRET = 'dev-secret';
const CA_IDS = ['C-01', 'C-02', 'C-03'];
const STARTPACK_ROOT = join(root, 'packages/startpack-solve-coagula');

const children = [];
let failures = 0;

function startApp(label, appPath, extraEnv = {}) {
  const child = spawn(process.execPath, [appPath], {
    cwd: sdkRoot,
    env: {
      ...process.env,
      ZEUS_HOST: HOST,
      ZEUS_PORT_SCRIPTORIUM: String(SOCKET_PORT),
      ZEUS_SCRIPTORIUM_URL: `http://${HOST}:${SOCKET_PORT}`,
      ZEUS_SCRIPTORIUM_SECRET: SECRET,
      ZEUS_SOLVE_ROOM: ROOM,
      ZEUS_MCP_SOLVE: String(MCP_PORT),
      ZEUS_PORT_SOLVE_VIEW: String(VIEW_PORT),
      ZEUS_SOLVE_PLAYER_ACTOR: 'uno',
      ZEUS_STARTPACK_SOLVE_COAGULA: STARTPACK_ROOT,
      ZEUS_VOLUMES_ROOT: join(STARTPACK_ROOT, 'volumes'),
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (c) =>
    process.env.SOLVE_E2E_VERBOSE ? process.stdout.write(`[${label}] ${c}`) : null
  );
  child.stderr.on('data', (c) => process.stderr.write(`[${label}!] ${c}`));
  children.push(child);
  return child;
}

function gate(id, ok, detail = '') {
  const mark = ok ? '✅' : '❌';
  console.log(`${mark} ${id}${detail ? ` · ${detail}` : ''}`);
  if (!ok) failures += 1;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function waitForHttp(url, timeoutMs = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return res;
    } catch {
      /* retry */
    }
    await sleep(200);
  }
  throw new Error(`timeout esperando HTTP ${url}`);
}

function walkJs(dir, acc = []) {
  for (const name of fs.readdirSync(dir)) {
    const p = join(dir, name);
    const st = fs.statSync(p);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dramaturgia') continue;
      walkJs(p, acc);
    } else if (/\.(mjs|js)$/.test(name)) acc.push(p);
  }
  return acc;
}

console.log('\n🜃 e2e solve-coagula MCP ·', { SOCKET_PORT, MCP_PORT, ROOM, CA_IDS }, '\n');

const markdown = fs.readFileSync(CASOS_PATH, 'utf8');
const coherence = checkPlaybookCoherence(markdown, {
  expectedIds: CA_IDS,
  toolPattern: /`player_\w+\s*\{/
});
gate(
  'G-SOLVE.0 coherencia CASOS.md',
  coherence.ok,
  coherence.ok ? coherence.ids.join(',') : coherence.errors[0]
);

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.solveAuthority);
await sleep(2500);
startApp('mcp-uno', paths.solveMcp);

try {
  const client = createMcpHttpClient({ host: HOST, port: MCP_PORT });
  await client.waitConnected();
  await client.initialize();

  const tools = await client.listTools();
  const names = (tools.tools || []).map((t) => t.name);
  gate(
    'G-SOLVE.1 tools',
    names.includes('player_join') &&
      names.includes('player_open_act') &&
      names.includes('player_consult_linea') &&
      names.includes('player_state'),
    names.filter((n) => String(n).startsWith('player_')).join(',')
  );

  const { ok, results } = await runMcpCases({
    markdown,
    casoIds: CA_IDS,
    callTool: (tool, args) => client.callTool(tool, args),
    game: 'solve-coagula',
    comando: 'npm run e2e:solve-coagula-mcp',
    agente: 'e2e solve-coagula-mcp',
    commit: process.env.ZEUS_PLAYBOOK_COMMIT || 'local',
    resolveDeps: true
  });

  for (const id of CA_IDS) {
    const row = results.find((r) => r.id === id && r.role === 'case');
    gate(`G-SOLVE.2 ${id}`, row?.ok === true, row ? summarize(row) : 'sin resultado');
  }
  gate('G-SOLVE.3 runner ok', ok === true, `${results.length} filas`);

  const offenders = [];
  for (const rel of walkJs(paths.solveRoot)) {
    const text = fs.readFileSync(rel, 'utf8');
    if (/@zeus\/arg(?:-|\/)|packages\/arg\/|games\/delta/.test(text)) {
      offenders.push(rel);
    }
  }
  gate('G-SOLVE.4 sin imports arg/delta', offenders.length === 0, offenders[0] || 'limpio');
} catch (err) {
  gate('E2E solve-coagula-mcp', false, err.message);
}

for (const child of children) child.kill('SIGTERM');
await sleep(500);

console.log(
  failures === 0
    ? '\n🟢 e2e solve-coagula-mcp: C-01/C-02/C-03 + gates en verde\n'
    : `\n🔴 e2e solve-coagula-mcp: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

function summarize(row) {
  const last = row.steps?.[row.steps.length - 1]?.result;
  if (!last) return row.error || 'sin steps';
  if (last.ok === false) return `error=${last.error}`;
  return `ok evidencia=${last.evidencia ? 'sí' : '—'}`;
}

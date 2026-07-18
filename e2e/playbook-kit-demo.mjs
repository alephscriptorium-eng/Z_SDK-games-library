/**
 * E2E playbook-kit: mitad MCP de C-01 / C-03 / C-04b / C-05 contra stack
 * equivalente a demo:arg (socket + autoridad + MCP uno), produce acta.
 *
 * Puertos aislados vía env (PRACTICAS §1.1). No abre navegadores
 * (ZEUS_OPEN_BROWSER no se setea).
 *
 * Uso: npm run e2e:playbook-kit
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  checkPlaybookCoherence,
  createMcpHttpClient,
  runMcpCases
} from '@zeus/playbook-kit';

import { libraryRoot as root, sdkRoot, paths } from './roots.mjs';
// root = library; sdkRoot = Z_SDK monorepo
const CASOS_PATH = paths.deltaCasos;
const ACTA_OUT = join(os.tmpdir(), `zeus-playbook-kit-acta-${process.pid}.md`);

const HOST = 'localhost';
const SOCKET_PORT = 13037;
const MCP_UNO_PORT = 14131;
const ROOM = 'ARG_PLAYBOOK_E2E';
const SECRET = 'dev-secret';

const CA_IDS = ['C-01', 'C-03', 'C-04b', 'C-05'];
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
      ZEUS_ARG_ROOM: ROOM,
      ZEUS_ARG_FEEDS: 'synthetic',
      ZEUS_ARG_SEED: '5',
      ZEUS_MCP_ARG_UNO: String(MCP_UNO_PORT),
      ...extraEnv
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });
  child.stdout.on('data', (c) => process.env.ARG_E2E_VERBOSE && process.stdout.write(`[${label}] ${c}`));
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

console.log('\n📒 e2e playbook-kit ·', { SOCKET_PORT, MCP_UNO_PORT, ROOM, CA_IDS }, '\n');

const markdown = fs.readFileSync(CASOS_PATH, 'utf8');
const coherence = checkPlaybookCoherence(markdown, {
  toolPattern: /`player_\w+\s*\{/
});
gate('G-PB.0 coherencia CASOS.md', coherence.ok, coherence.ok ? `${coherence.ids.length} casos` : coherence.errors[0]);

startApp('socket', paths.socketServer);
await waitForHttp(`http://${HOST}:${SOCKET_PORT}/health`);
startApp('authority', paths.deltaAuthority);
startApp('mcp-uno', paths.deltaPlayerMcp, {
  ZEUS_ARG_PLAYER_ACTOR: 'uno'
});

try {
  const client = createMcpHttpClient({ host: HOST, port: MCP_UNO_PORT });
  await client.waitConnected();
  await client.initialize();

  const { ok, results, acta } = await runMcpCases({
    markdown,
    casoIds: CA_IDS,
    callTool: (tool, args) => client.callTool(tool, args),
    game: 'delta',
    comando: 'npm run e2e:playbook-kit (stack demo:arg aislado; sin browser)',
    agente: 'e2e playbook-kit',
    commit: process.env.ZEUS_PLAYBOOK_COMMIT || 'local',
    resolveDeps: true
  });

  fs.writeFileSync(ACTA_OUT, acta, 'utf8');
  gate('G-PB.1 acta escrita', fs.existsSync(ACTA_OUT) && acta.includes('Evidencia MCP'), ACTA_OUT);

  for (const id of CA_IDS) {
    const row = results.find((r) => r.id === id && r.role === 'case');
    gate(`G-PB.2 ${id}`, row?.ok === true, row ? summarize(row) : 'sin resultado');
  }

  const setup04 = results.find((r) => r.id === 'C-04' && r.role === 'setup');
  gate('G-PB.3 C-04 setup para C-05', setup04?.ok === true, setup04 ? 'contacto open' : 'faltó dep');

  gate('G-PB.4 runner ok', ok === true, `${results.length} filas en acta`);
} catch (err) {
  gate('E2E playbook-kit', false, err.message);
}

for (const child of children) child.kill('SIGTERM');
await sleep(500);

console.log(
  failures === 0
    ? '\n🟢 e2e playbook-kit: CA C-01/03/04b/05 + acta en verde\n'
    : `\n🔴 e2e playbook-kit: ${failures} gate(s) en rojo\n`
);
process.exit(failures === 0 ? 0 : 1);

function summarize(row) {
  const last = row.steps?.[row.steps.length - 1]?.result;
  if (!last) return row.error || 'sin steps';
  if (last.ok === false) return `error=${last.error}`;
  return `ok evidencia=${last.evidencia ? 'sí' : '—'}`;
}

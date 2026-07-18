#!/usr/bin/env node

/**
 * @zeus/arg-console server — portal de vistas 3D de delta (:3021).
 *
 * Express server-rendered sin bundler (patrón server.mjs del 3d-monitor,
 * evolucionado). Las vistas viven en src/views/registry.mjs sobre
 * `@zeus/app-shell/ssr-view-registry`; la lógica de cada vista es un entry
 * de navegador bajo /assets/js/views/. Sirve:
 *   /assets            → assets del ui-kit shell + propios
 *   /assets/room-client→ cliente de room de navegador
 *   /vendor/three      → node_modules/three
 *   /vendor/socket.io  → dist ESM de socket.io-client
 *   /kit               → src/ browser-safe de @zeus/ui-3d-kit (crudo)
 *   /view-kit          → src/ browser-safe de @zeus/view-kit (crudo)
 *   /game-engine       → src/ browser-safe de @zeus/game-engine (crudo)
 *   /arg-domain        → src/ browser-safe de @zeus/arg-domain (crudo:
 *                        las vistas importan contrato y escena, jamás
 *                        instancian motores como autoridad — G-ARG.1)
 *   /protocol          → src/ browser-safe de @zeus/protocol (crudo)
 *   /models            → GLBs canónicos (puppets tier 'puppet')
 *   /api/mcp/*         → PresetStore read-only (WP-11/WP-12)
 *   /health            → { status: ok, views }
 *   /                  → portal (galería de vistas)
 *   /views/:id         → una vista registrada
 */

import path from 'node:path';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import express from 'express';
import cors from 'cors';
import { ServerRegistry, PresetStore, countPresetItems } from '@zeus/presets-sdk';
import { assetsDir as uiKitAssetsDir } from '@zeus/ui-kit';
import { browserAssetsDir as roomClientAssetsDir } from '@zeus/room-client-browser';
import { srcDir as uiKitSrcDir, modelsDir, getThreeDir } from '@zeus/ui-3d-kit/node';
import { srcDir as viewKitSrcDir } from '@zeus/view-kit/node';
import { srcDir as gameEngineSrcDir } from '@zeus/game-engine/node';
import { srcDir as argDomainSrcDir } from '@zeus/arg-domain/node';
import { srcDir as protocolSrcDir } from '@zeus/protocol/node';

import { getConfig, packageDir } from './config.mjs';
import { resolveViewerConfig } from './viewer-config.mjs';
import { viewRegistry, renderView } from './views/registry.mjs';
import { portalView } from './views/portal.mjs';

const require = createRequire(import.meta.url);

const libraryRoot = path.resolve(packageDir, '../../..');
const { resolveZeusSdkRoot } = require(path.join(libraryRoot, 'scripts/zeus-sdk-root.cjs'));
const monorepoRoot = resolveZeusSdkRoot();

/** Browser-safe sources of @zeus/webrtc-viewer (game-actions for contact buttons). */
const webrtcViewerSrcDir = path.join(monorepoRoot, 'packages/mesh/webrtc-viewer/src');

const defaultDataDir = path.join(monorepoRoot, 'data');
const alephSeedsPath = path.join(defaultDataDir, 'seeds', 'aleph-presets.json');

function seedAlephPresets(store) {
  if (!fs.existsSync(alephSeedsPath)) {
    console.warn(`[arg-console] seeds no encontrados: ${alephSeedsPath}`);
    return;
  }
  const seeds = JSON.parse(fs.readFileSync(alephSeedsPath, 'utf8'));
  for (const preset of seeds) {
    const existing = store.getByName(preset.name);
    if (existing) {
      store.update(existing.id, {
        description: preset.description,
        category: preset.category,
        prompt: preset.prompt,
        items: preset.items
      });
    } else {
      store.create(preset);
    }
  }
}

function mountReadOnlyPresetRoutes(app, { registry, store }) {
  app.get('/api/mcp/list', async (_req, res) => {
    try {
      const catalog = await registry.buildCatalog();
      res.json({
        success: true,
        timestamp: new Date().toISOString(),
        catalog,
        serversCount: catalog.length,
        totalTools: catalog.reduce((sum, s) => sum + (s.tools?.length ?? 0), 0),
        totalResources: catalog.reduce((sum, s) => sum + (s.resources?.length ?? 0), 0),
        totalResourceTemplates: catalog.reduce((sum, s) => sum + (s.resourceTemplates?.length ?? 0), 0),
        totalPrompts: catalog.reduce((sum, s) => sum + (s.prompts?.length ?? 0), 0)
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/mcp/presets', (_req, res) => {
    try {
      const presets = store.getAll().map((preset) => ({
        id: preset.id,
        name: preset.name,
        description: preset.description,
        category: preset.category,
        itemsCount: countPresetItems(preset.items),
        createdAt: preset.createdAt,
        updatedAt: preset.updatedAt
      }));
      res.json({
        success: true,
        presets,
        totalPresets: presets.length,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });

  app.get('/api/mcp/preset/:name', (req, res) => {
    try {
      const preset = store.getByName(req.params.name);
      if (!preset) {
        res.status(404).json({ success: false, error: `Preset '${req.params.name}' not found` });
        return;
      }
      res.json({ success: true, preset, timestamp: new Date().toISOString() });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message });
    }
  });
}

function socketIoDistDir() {
  return path.dirname(require.resolve('socket.io-client/package.json')) + path.sep + 'dist';
}

/**
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {string} [options.host]
 * @param {string} [options.dataDir]
 */
export async function createArgConsoleServer(options = {}) {
  const config = getConfig();
  const port = options.port ?? config.server.port;
  const host = options.host ?? config.server.host;
  const dataDir = options.dataDir ?? defaultDataDir;

  const registry = new ServerRegistry();
  const store = new PresetStore({ dataDir });
  seedAlephPresets(store);

  const app = express();
  app.use(cors({ origin: true, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/assets', express.static(uiKitAssetsDir));
  app.use('/assets/room-client', express.static(roomClientAssetsDir));
  app.use('/assets', express.static(path.join(packageDir, 'assets')));

  let threeMounted = false;
  try {
    app.use('/vendor/three', express.static(getThreeDir()));
    threeMounted = true;
  } catch (err) {
    console.warn(`[arg-console] three no resoluble, /vendor/three deshabilitado: ${err.message}`);
  }
  app.use('/vendor/socket.io', express.static(socketIoDistDir()));

  app.use('/kit', express.static(uiKitSrcDir));
  app.use('/view-kit', express.static(viewKitSrcDir));
  app.use('/game-engine', express.static(gameEngineSrcDir));
  app.use('/arg-domain', express.static(argDomainSrcDir));
  app.use('/protocol', express.static(protocolSrcDir));
  app.use('/webrtc-viewer', express.static(webrtcViewerSrcDir));
  app.use('/models', express.static(modelsDir));

  mountReadOnlyPresetRoutes(app, { registry, store });

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'arg-console',
      three: threeMounted,
      presets: store.count(),
      views: viewRegistry.list().map((view) => view.id),
      timestamp: new Date().toISOString()
    });
  });

  function pageContext(req) {
    const room = req.query.room ? String(req.query.room) : undefined;
    const actor = req.query.actor ? String(req.query.actor) : undefined;
    return { viewerConfig: resolveViewerConfig({ room, actor }) };
  }

  app.get('/', (req, res) => {
    try {
      const html = portalView({ registry: viewRegistry, ...pageContext(req) });
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (err) {
      console.error('Error renderizando el portal de arg-console:', err);
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  app.get('/views/:id', (req, res) => {
    try {
      const view = viewRegistry.get(req.params.id);
      if (!view) {
        res.status(404).send(`<h1>404</h1><p>Vista desconocida: ${req.params.id}</p>`);
        return;
      }
      const html = renderView(req.params.id, pageContext(req));
      res.setHeader('Content-Type', 'text/html');
      res.send(html.outerHTML);
    } catch (err) {
      console.error(`Error renderizando la vista "${req.params.id}" de arg-console:`, err);
      res.status(500).send(`<h1>Error</h1><p>${err.message}</p>`);
    }
  });

  app.use((err, _req, res, _next) => {
    console.error('arg-console error:', err);
    res.status(500).json({ error: err.message });
  });

  const server = await new Promise((resolve) => {
    const s = app.listen(port, host, () => resolve(s));
  });
  const boundPort = server.address()?.port ?? port;

  async function close() {
    await new Promise((resolve) => server.close(resolve));
  }

  return { app, server, close, port: boundPort, host, store, registry };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMain) {
  const handle = await createArgConsoleServer();
  console.log(`arg-console corriendo en http://${handle.host}:${handle.port}`);
  console.log(`  presets: ${handle.store.count()} en ${defaultDataDir}`);
  console.log(`  tablero → http://${handle.host}:${handle.port}/views/tablero`);
  console.log(`  jugador → http://${handle.host}:${handle.port}/views/jugador?actor=uno`);

  const shutdown = async () => {
    await handle.close();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

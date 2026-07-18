#!/usr/bin/env node
/**
 * Servidor de vista pozo: express + view-kit + ui-3d-kit.
 */

import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import express from 'express';
import cors from 'cors';
import { srcDir as viewKitSrcDir } from '@zeus/view-kit/node';
import { srcDir as ui3dSrcDir, getThreeDir } from '@zeus/ui-3d-kit/node';
import { browserAssetsDir as roomClientAssetsDir } from '@zeus/room-client-browser';
import { loadZeusEnv } from '@zeus/presets-sdk/env';
import { GAME_ID } from '../contract.mjs';
import { resolvePozoEndpoints } from '../endpoints.mjs';
import { renderPozoView } from './render.mjs';

const require = createRequire(import.meta.url);
const packageDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

function socketIoDistDir() {
  return path.dirname(require.resolve('socket.io-client/package.json')) + path.sep + 'dist';
}

loadZeusEnv();

/**
 * @param {object} [options]
 * @param {number} [options.port]
 * @param {string} [options.host]
 */
export async function createPozoViewServer(options = {}) {
  const endpoints = resolvePozoEndpoints();
  const port = options.port ?? endpoints.viewPort;
  const host = options.host ?? endpoints.host;
  const token = process.env.ZEUS_SCRIPTORIUM_SECRET || 'dev-secret';

  const app = express();
  app.use(cors({ origin: true, credentials: true }));

  app.use('/assets', express.static(path.join(packageDir, 'assets')));
  app.use('/assets/room-client', express.static(roomClientAssetsDir));
  app.use('/view-kit', express.static(viewKitSrcDir));
  app.use('/kit', express.static(ui3dSrcDir));

  try {
    app.use('/vendor/three', express.static(getThreeDir()));
  } catch (err) {
    console.warn(`[pozo-view] three no resoluble: ${err.message}`);
  }
  app.use('/vendor/socket.io', express.static(socketIoDistDir()));

  app.get('/health', (_req, res) => {
    res.json({
      status: 'ok',
      service: 'pozo-view',
      game: GAME_ID,
      timestamp: new Date().toISOString()
    });
  });

  app.get(['/', '/views/pozo'], (req, res) => {
    const actor = req.query.actor ? String(req.query.actor) : 'view-pozo';
    const html = renderPozoView({
      scriptoriumUrl: endpoints.scriptoriumBrowserUrl,
      room: endpoints.room,
      sessionId: 'pozo',
      token,
      actor,
      game: GAME_ID
    });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  });

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(port, host, () => resolve(s));
    s.on('error', reject);
  });

  console.log(`[pozo-view] http://${host}:${port}/views/pozo · room=${endpoints.room}`);

  return {
    app,
    server,
    port,
    host,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}

const isMain =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  await createPozoViewServer();
}

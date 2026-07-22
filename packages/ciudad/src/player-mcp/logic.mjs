/**
 * Tools / resources MCP de ciudad (join, walk, announce, wake, state).
 */

import fs from 'node:fs';
import { z } from 'zod';
import { jsonContent } from '@zeus/presets-sdk/mcp';
import {
  confirmIntent,
  buildStandardPlayerResources,
  fail
} from '@zeus/player-mcp-kit';
import { listCasoIds } from '@zeus/playbook-kit';
import { GAME_ID } from '../contract.mjs';
import { CASOS_PATH } from './config.mjs';

function compactActor(state, actorId) {
  const a = state?.actors?.[actorId];
  if (!a) return null;
  return {
    id: a.id,
    nodeId: a.nodeId,
    anchorId: a.anchorId,
    kind: a.kind,
    announced: a.announced,
    wakes: a.wakes
  };
}

function summarizeState(state, actorId) {
  if (!state) return { ok: false, error: 'sin_estado' };
  return {
    ok: true,
    evidencia: {
      actor: compactActor(state, actorId),
      lastWake: state.lastWake,
      lastAnnounce: state.lastAnnounce,
      sceneId: state.sceneId,
      actors: Object.keys(state.actors || {}),
      barriosLatentes: Object.values(state.barrios || {})
        .filter((b) => b.estado === 'latente')
        .map((b) => b.id),
      barriosVivos: Object.values(state.barrios || {})
        .filter((b) => b.estado === 'vivo')
        .map((b) => b.id)
    }
  };
}

function readCasosMarkdown() {
  return fs.readFileSync(CASOS_PATH, 'utf8');
}

/**
 * @param {import('@modelcontextprotocol/sdk/server/mcp.js').McpServer} server
 * @param {object} bridge
 * @param {{ confirmTimeoutMs: number, noopMs: number }} cfg
 */
export function buildMcp(server, bridge, cfg) {
  const actor = bridge.actor;

  server.registerTool(
    'player_join',
    {
      title: `Unir rabbit "${actor}" a la ciudad`,
      description: `Emite intent join como "${actor}" (spawn plaza). Idempotente.`,
      inputSchema: {
        timeoutMs: z.number().optional()
      }
    },
    async ({ timeoutMs }) =>
      jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'join',
          args: { kind: 'player' },
          timeoutMs,
          done: (state) => state.actors?.[actor] ?? null,
          evidence: (state) => ({ actor: compactActor(state, actor) })
        })
      )
  );

  server.registerTool(
    'player_state',
    {
      title: `Snapshot de "${actor}"`,
      description: 'Actor, barrios latentes/vivos, último wake/announce. Solo lectura.',
      inputSchema: {}
    },
    async () => jsonContent(summarizeState(bridge.lastState(), actor))
  );

  server.registerTool(
    'player_walk',
    {
      title: 'Caminar a nodo o ancla',
      description:
        'Walk por calles (snap, sin pathfinding). Pasá anchorId de barrio o nodeId.',
      inputSchema: {
        anchorId: z.string().optional(),
        nodeId: z.string().optional(),
        timeoutMs: z.number().optional()
      }
    },
    async ({ anchorId, nodeId, timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      if (!anchorId && !nodeId) {
        return jsonContent(fail('destino_requerido'));
      }
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'walk',
          args: { ...(anchorId ? { anchorId } : {}), ...(nodeId ? { nodeId } : {}) },
          timeoutMs,
          done: (state) => {
            const a = state.actors?.[actor];
            if (!a) return null;
            if (anchorId && a.anchorId !== anchorId) return null;
            if (nodeId && !anchorId && a.nodeId !== nodeId) return null;
            return a;
          },
          evidence: (state, a) => ({
            actor: compactActor(state, actor) ?? a,
            barrio:
              a?.anchorId && state.anclas?.[a.anchorId]
                ? {
                    id: state.anclas[a.anchorId].barrioId,
                    estado: state.barrios?.[state.anclas[a.anchorId].barrioId]?.estado
                  }
                : null
          }),
          timeoutHint: '¿destino inalcanzable o ancla desconocida?'
        })
      );
    }
  );

  server.registerTool(
    'player_announce',
    {
      title: 'Anunciar presencia en plaza',
      description: 'Solo desde el nodo plaza (operator = plaza).',
      inputSchema: {
        message: z.string().max(128).optional(),
        timeoutMs: z.number().optional()
      }
    },
    async ({ message, timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const beforeTs = bridge.lastState()?.lastAnnounce?.ts ?? 0;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'announce',
          args: message ? { message } : {},
          timeoutMs,
          done: (state) => {
            const ann = state.lastAnnounce;
            if (!ann || ann.actorId !== actor) return null;
            if (ann.ts <= beforeTs) return null;
            return ann;
          },
          evidence: (state, ann) => ({
            announce: ann ?? state.lastAnnounce,
            actor: compactActor(state, actor)
          }),
          timeoutHint: '¿fuera de plaza?'
        })
      );
    }
  );

  server.registerTool(
    'player_wake',
    {
      title: 'Despertar barrio latente',
      description:
        'Ofrece un tool (horse stub hasta Z06). Requiere estar en el ancla del barrio latente. ' +
        'Wake sobre muerto → barrio_muerto.',
      inputSchema: {
        tool: z.string().min(1).max(96),
        barrioId: z.string().optional(),
        timeoutMs: z.number().optional()
      }
    },
    async ({ tool, barrioId, timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const beforeTs = bridge.lastState()?.lastWake?.ts ?? 0;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'wake',
          args: { tool, ...(barrioId ? { barrioId } : {}), horseMode: 'stub' },
          timeoutMs,
          done: (state) => {
            const w = state.lastWake;
            if (!w || w.actorId !== actor) return null;
            if (w.ts <= beforeTs) return null;
            if (w.tool !== tool) return null;
            const bId = barrioId || w.barrioId;
            if (state.barrios?.[bId]?.estado !== 'vivo') return null;
            return w;
          },
          evidence: (state, w) => ({
            wake: w ?? state.lastWake,
            barrio: state.barrios?.[w?.barrioId || barrioId] ?? null,
            actor: compactActor(state, actor)
          }),
          timeoutHint: '¿barrio muerto / fuera de ancla / tool vacío?'
        })
      );
    }
  );

  server.registerTool(
    'player_leer_parte',
    {
      title: 'Leer último parte del ledger',
      description:
        'Solo lectura: última entrada kind=parte del ledger (titulares + clases de campana). ' +
        'Si hay campanas, el operator-ui del humano las toca al recibir el mismo ledger.',
      inputSchema: {
        n: z.number().int().min(1).max(50).optional()
      }
    },
    async ({ n }) => jsonContent(readLatestParte(bridge, n))
  );
}

/** Marcas de campana (espejo parte-kit; sin dep dura en el pack). */
const CAMPANA_MARCAS = Object.freeze([
  { clase: 'roto', marca: 'queda roto' },
  { clase: 'despertar', marca: 'gana pulso' },
  { clase: 'degradar', marca: 'pierde pulso' },
  { clase: 'degradar', marca: 'espera relevo' },
  { clase: 'degradar', marca: 'sin pulso' }
]);

/**
 * @param {object} bridge
 * @param {number} [n]
 */
export function readLatestParte(bridge, n = 20) {
  const tail = typeof bridge.ledgerTail === 'function' ? bridge.ledgerTail(n) : [];
  for (let i = tail.length - 1; i >= 0; i--) {
    const entry = tail[i];
    const kind = entry?.kind ?? entry?.entryKind;
    if (kind !== 'parte') continue;
    const parte = entry.detail?.parte ?? null;
    const titulares = Array.isArray(parte?.titulares) ? parte.titulares : [];
    const campanas = [];
    const seen = new Set();
    for (const t of titulares) {
      if (typeof t !== 'string') continue;
      for (const { clase, marca } of CAMPANA_MARCAS) {
        if (t.includes(marca) && !seen.has(clase)) {
          seen.add(clase);
          campanas.push({ clase, titular: t });
        }
      }
    }
    return {
      ok: true,
      evidencia: {
        seq: entry.seq ?? null,
        parte,
        campanas,
        nota:
          campanas.length > 0
            ? 'campanas listas — operator-ui toca al consumir este ledger'
            : 'parte sin clase de campana (silencio)'
      }
    };
  }
  return { ok: false, error: 'sin_parte', nota: 'ledger sin kind=parte aún' };
}

/**
 * @param {object} bridge
 */
export function getResourceRegistry(bridge) {
  return buildStandardPlayerResources({
    game: GAME_ID,
    bridge,
    readPlayerState: () => summarizeState(bridge.lastState(), bridge.actor),
    readScene: () => ({
      sceneId: bridge.lastState()?.sceneId ?? null,
      live: bridge.lastState()
        ? {
            actors: bridge.lastState().actors,
            barrios: bridge.lastState().barrios,
            lastWake: bridge.lastState().lastWake
          }
        : null
    }),
    readCasos: () => {
      const markdown = readCasosMarkdown();
      return { markdown, ids: listCasoIds(markdown) };
    }
  });
}

export function getPromptRegistry() {
  return [];
}

export function buildCardExamples(bridge) {
  return {
    actor: bridge.actor,
    ssbId: bridge.ssbId ?? null,
    peercard: Boolean(bridge.peerCard?.seatSignature),
    tools: [
      'player_join',
      'player_walk',
      'player_announce',
      'player_wake',
      'player_state',
      'player_leer_parte'
    ]
  };
}

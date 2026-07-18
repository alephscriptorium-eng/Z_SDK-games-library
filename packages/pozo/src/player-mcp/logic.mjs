/**
 * Tools / resources MCP de pozo (mínimo: join, draw_drop, state).
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
import { GAME_ID, POZO_SCENE } from '../contract.mjs';
import { CASOS_PATH } from './config.mjs';

function compactActor(state, actorId) {
  const a = state?.actors?.[actorId];
  if (!a) return null;
  return {
    id: a.id,
    nodeId: a.nodeId,
    kind: a.kind,
    score: a.score ?? { labeled: 0, emptied: 0 }
  };
}

function summarizeState(state, actorId) {
  if (!state) return { ok: false, error: 'sin_estado' };
  return {
    ok: true,
    evidencia: {
      actor: compactActor(state, actorId),
      well: state.well,
      feed: { id: state.feed?.id, lines: state.feed?.lines },
      sceneId: state.sceneId,
      actors: Object.keys(state.actors || {})
    }
  };
}

function readCasosMarkdown() {
  return fs.readFileSync(CASOS_PATH, 'utf8');
}

/** Regla probable sin mutar (espejo del reducer). */
function explainDraw(state, actorId, label) {
  if (!state?.actors?.[actorId]) return { ok: false, error: 'actor_desconocido' };
  if (typeof label !== 'string' || !label.trim()) {
    return { ok: false, error: 'label_requerido' };
  }
  if ((state.well?.level ?? 0) < 1) return { ok: false, error: 'pozo_seco' };
  return { ok: true, error: null };
}

function explainEmpty(state, actorId) {
  if (!state?.actors?.[actorId]) return { ok: false, error: 'actor_desconocido' };
  if ((state.well?.level ?? 0) < 1) return { ok: false, error: 'pozo_ya_vacio' };
  return { ok: true, error: null };
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
      title: `Unir al actor "${actor}" al pozo`,
      description:
        `Emite intent join como "${actor}" y espera a que aparezca en state (orilla). Idempotente.`,
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
      description: 'Actor, nivel del pozo, última gota y feed. Solo lectura.',
      inputSchema: {}
    },
    async () => jsonContent(summarizeState(bridge.lastState(), actor))
  );

  server.registerTool(
    'player_draw_drop',
    {
      title: 'Sacar gota y etiquetarla',
      description:
        'Único intent con ledger: decrementa el pozo, asienta label en ledger y publica track.',
      inputSchema: {
        label: z.string().min(1).max(64).describe('Etiqueta de la gota'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ label, timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const beforeTs = bridge.lastState()?.well?.lastDrop?.ts ?? 0;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'draw_drop',
          args: { label },
          timeoutMs,
          done: (state) => {
            const drop = state.well?.lastDrop;
            if (!drop || drop.actorId !== actor) return null;
            if (drop.label !== label.trim()) return null;
            if (drop.ts <= beforeTs) return null;
            return drop;
          },
          unchanged: (state) => {
            const drop = state.well?.lastDrop;
            return !drop || drop.ts <= beforeTs;
          },
          evidence: (state, drop) => ({
            drop: drop ?? state?.well?.lastDrop ?? null,
            well: state?.well ?? null,
            actor: compactActor(state, actor)
          }),
          explain: (state) => explainDraw(state, actor, label),
          timeoutHint: '¿pozo seco o label vacío?'
        })
      );
    }
  );

  server.registerTool(
    'player_empty',
    {
      title: 'Vaciar el pozo',
      description:
        'Derrama todo el nivel del pozo (ciclo vaciar). Coste narrativo: pierdes el agua ' +
        'que podrías haber etiquetado. Ledger kind "empty" + score.emptied.',
      inputSchema: {
        timeoutMs: z.number().optional()
      }
    },
    async ({ timeoutMs }) => {
      if (!bridge.myActor()) {
        return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      }
      const levelBefore = bridge.lastState()?.well?.level ?? 0;
      const emptiedBefore = bridge.myActor()?.score?.emptied ?? 0;
      return jsonContent(
        await confirmIntent(bridge, cfg, {
          intent: 'empty',
          args: {},
          timeoutMs,
          done: (state) => {
            const a = state.actors?.[actor];
            if (!a) return null;
            if ((a.score?.emptied ?? 0) <= emptiedBefore) return null;
            if ((state.well?.level ?? 1) !== 0) return null;
            return { drained: levelBefore, well: state.well, score: a.score };
          },
          unchanged: (state) => (state.well?.level ?? 0) === levelBefore,
          evidence: (state, value) => ({
            ...(value ?? {}),
            well: state?.well ?? null,
            actor: compactActor(state, actor)
          }),
          explain: (state) => explainEmpty(state, actor),
          timeoutHint: '¿pozo ya vacío?'
        })
      );
    }
  );
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
      scene: POZO_SCENE,
      live: bridge.lastState()
        ? {
            well: bridge.lastState().well,
            actors: bridge.lastState().actors
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
    tools: ['player_join', 'player_draw_drop', 'player_empty', 'player_state']
  };
}

/**
 * Tools/resources/prompts MCP del arg-player-mcp.
 *
 * Instancia @zeus/player-mcp-kit: confirmIntent, resources estándar,
 * health. Aquí solo vive lo específico de delta (tools, proyección, nav).
 */

import { z } from 'zod';
import { jsonContent, resolveMcpApprovalToken } from '@zeus/presets-sdk';
import { mcpApprovalGateLine } from '@zeus/presets-sdk/mcp';
import { EMOTES, deltaV0, makeIntent, cloakModFor, CLOAK_MODS } from '@zeus/arg-domain';
import {
  confirmIntent,
  buildStandardPlayerResources,
  fail,
  sleep,
  DEFAULT_POLL_MS
} from '@zeus/player-mcp-kit';
import {
  staticNav,
  corridorsFrom,
  explainIntent,
  compactActor,
  contactsOf,
  summarizeState,
  projectSea
} from './projection.mjs';
import { findPath } from './nav.mjs';
import { readCasosMarkdown, listCasoIds, extractCaso } from './casos.mjs';

/** Esquema de resources estándar (histórico `arg://…`). */
const RESOURCE_SCHEME = 'arg';

function contactIdFor(actorId, targetId) {
  const [x, y] = [actorId, targetId].sort();
  return `c-${x}--${y}`;
}

/**
 * confirmIntent del kit + dry-run delta (explainIntent / maze).
 * @param {object} bridge
 * @param {{ confirmTimeoutMs: number, noopMs: number }} cfg
 * @param {object} spec
 */
async function confirm(bridge, cfg, spec) {
  const { intent, args = {} } = spec;
  return confirmIntent(bridge, cfg, {
    ...spec,
    explain:
      spec.explain ??
      ((state) => explainIntent(state, bridge.maze(), makeIntent(bridge.actor, intent, args))),
    evidence:
      spec.evidence ??
      ((state, value) => (value != null ? value : { actor: compactActor(state, bridge.actor) }))
  });
}

/** Un salto del nav-graph con confirmación de salida/llegada. */
async function moveOneHop(bridge, cfg, nodeId, { waitArrival = true, timeoutMs } = {}) {
  const pre = bridge.myActor();
  if (!pre) return fail('actor_desconocido', { nota: 'llama antes a player_join' });
  const originNodeId = pre.nodeId;
  return confirm(bridge, cfg, {
    intent: 'move',
    args: { nodeId },
    timeoutMs,
    done: (state) => {
      const actor = state.actors?.[bridge.actor];
      if (!actor) return null;
      if (actor.nodeId === nodeId) return { llegada: true };
      if (!waitArrival && actor.linkId) return { llegada: false, enCamino: actor.linkId };
      return null;
    },
    unchanged: (state) => {
      const actor = state.actors?.[bridge.actor];
      return Boolean(actor && !actor.linkId && !actor.riding && actor.nodeId === originNodeId);
    },
    evidence: (state, value) => ({
      destino: nodeId,
      ...(value ?? {}),
      actor: compactActor(state, bridge.actor)
    })
  });
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
      title: `Unir al actor "${actor}" al delta`,
      description:
        `Emite arg:intent join como "${actor}" y espera a que el actor aparezca en arg:state ` +
        '(spawn en la plaza). Idempotente: si ya existe, confirma con su estado actual.',
      inputSchema: {
        tier: z.enum(['stick', 'puppet']).optional().describe('Render hint del monigote (default stick).'),
        timeoutMs: z.number().optional().describe('Timeout de confirmación (default 15000).')
      }
    },
    async ({ tier, timeoutMs }) =>
      jsonContent(
        await confirm(bridge, cfg, {
          intent: 'join',
          args: { kind: 'player', ...(tier ? { tier } : {}) },
          timeoutMs,
          done: (state) => state.actors?.[actor] ?? null,
          evidence: (state) => ({ actor: compactActor(state, actor) })
        })
      )
  );

  server.registerTool(
    'player_state',
    {
      title: `Snapshot compacto de "${actor}"`,
      description:
        'MI actor (zone, nodeId, pose, riding, score, cloak, position) más grifos, mar y objetivo resumidos. Solo lectura.',
      inputSchema: {}
    },
    async () => jsonContent(summarizeState(bridge.lastState(), actor))
  );

  server.registerTool(
    'player_move',
    {
      title: 'Un salto del nav-graph',
      description:
        'Emite move hacia un nodo ADYACENTE y espera la llegada (nodeId === destino en arg:state). ' +
        'Rechazos probables: sin_enlace, nadar_no_permitido (agua sin cloak), pasillo_cerrado, ya_caminando, montado_en_rio.',
      inputSchema: {
        nodeId: z.string().describe('Nodo destino adyacente (p.ej. "terraza-a").'),
        waitArrival: z.boolean().optional().describe('Esperar llegada (default true); false = confirmar solo la salida.'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ nodeId, waitArrival = true, timeoutMs }) =>
      jsonContent(await moveOneHop(bridge, cfg, nodeId, { waitArrival, timeoutMs }))
  );

  server.registerTool(
    'player_goto',
    {
      title: 'Ruta multi-salto (BFS)',
      description:
        'Planifica con BFS sobre el nav-graph (solo enlaces cruzables: pasillos de cantera open; ' +
        'agua solo si el cloak equipado permite nadar) y ejecuta moves secuenciales esperando cada llegada.',
      inputSchema: {
        nodeId: z.string().describe('Nodo destino (p.ej. "cima-a" o "camara-0-2").'),
        hopTimeoutMs: z.number().optional().describe('Timeout por salto (default 15000).')
      }
    },
    async ({ nodeId, hopTimeoutMs }) => {
      const me = bridge.myActor();
      if (!me) return jsonContent(fail('actor_desconocido', { nota: 'llama antes a player_join' }));
      if (me.riding) return jsonContent(fail('montado_en_rio', { nota: 'usa player_dismount primero' }));
      if (me.linkId) {
        const settled = await bridge.waitState(
          (state) => state?.actors?.[actor]?.nodeId ?? null,
          cfg.confirmTimeoutMs
        );
        if (!settled) return jsonContent(fail('ya_caminando'));
      }
      const from = bridge.myActor().nodeId;
      const path = findPath(staticNav(), from, nodeId, {
        corridors: corridorsFrom(bridge.maze()),
        cloakPresetId: bridge.myActor().cloak?.presetId ?? null
      });
      if (path === null) {
        return jsonContent(
          fail('sin_ruta', {
            evidencia: {
              desde: from,
              hasta: nodeId,
              cloak: bridge.myActor().cloak ?? null,
              nota: 'sin camino cruzable: ¿pasillo ghost sin excavar o agua sin cloak nadador?'
            }
          })
        );
      }
      const visitados = [];
      for (const hop of path) {
        const result = await moveOneHop(bridge, cfg, hop, { waitArrival: true, timeoutMs: hopTimeoutMs });
        if (!result.ok) {
          return jsonContent({ ...result, evidencia: { ...result.evidencia, ruta: path, visitados, saltoFallido: hop } });
        }
        visitados.push(hop);
      }
      return jsonContent({
        ok: true,
        evidencia: { ruta: path, actor: compactActor(bridge.lastState(), actor) }
      });
    }
  );

  server.registerTool(
    'player_ride',
    {
      title: 'Montar un río',
      description:
        'Emite ride y espera riding.riverId en arg:state. Requiere estar en el embarcadero del río ' +
        '(rio-a: embarcadero-a · rio-b: embarcadero-b). Rechazos: fuera_de_embarcadero, ya_montado, rio_invalido.',
      inputSchema: {
        riverId: z.string().describe('Río a montar ("rio-a" | "rio-b").'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ riverId, timeoutMs }) =>
      jsonContent(
        await confirm(bridge, cfg, {
          intent: 'ride',
          args: { riverId },
          timeoutMs,
          done: (state) => (state.actors?.[actor]?.riding?.riverId === riverId ? state.actors[actor].riding : null),
          unchanged: (state) => !state.actors?.[actor]?.riding,
          evidence: (state, value) => ({ riding: value ?? null, actor: compactActor(state, actor) })
        })
      )
  );

  server.registerTool(
    'player_dismount',
    {
      title: 'Bajar del río',
      description:
        'Emite dismount y espera riding = null (baja en el embarcadero si progress < 0.75, en la desembocadura si no). ' +
        'Nota: al llegar a la desembocadura la autoridad desmonta sola (C-09).',
      inputSchema: { timeoutMs: z.number().optional() }
    },
    async ({ timeoutMs }) => {
      const me = bridge.myActor();
      if (!me) return jsonContent(fail('actor_desconocido'));
      if (!me.riding) {
        return jsonContent(fail('no_montado', { evidencia: { actor: me } }));
      }
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'dismount',
          args: {},
          timeoutMs,
          done: (state) => {
            const a = state.actors?.[actor];
            return a && !a.riding && a.nodeId ? a : null;
          },
          evidence: (state) => ({ actor: compactActor(state, actor) })
        })
      );
    }
  );

  server.registerTool(
    'player_label',
    {
      title: 'Etiquetar la gota bajo los pies (montado)',
      description:
        'Reintenta label:cast cada 400 ms hasta ver una entrada arg:ledger kind "label" con MI actorId, ' +
        `o agotar los intentos. Labelset del gamemap: ${deltaV0.labelset.join(', ')}. Requiere ir montado en un río con gotas cerca.`,
      inputSchema: {
        label: z.string().describe(`Etiqueta a lanzar (${deltaV0.labelset.join(' | ')}).`),
        tries: z.number().optional().describe('Reintentos cada 400 ms (default 10).')
      }
    },
    async ({ label, tries = 10 }) => {
      if (!bridge.connected) return jsonContent(fail('room_desconectada'));
      const me = bridge.myActor();
      if (!me) return jsonContent(fail('actor_desconocido'));
      if (!me.riding) return jsonContent(fail('no_montado', { evidencia: { actor: me } }));
      const sinceSeq = bridge.maxLedgerSeq();
      for (let attempt = 1; attempt <= tries; attempt++) {
        bridge.emitIntent('label:cast', { label });
        await sleep(400);
        const hit = bridge
          .ledgerTail()
          .find((e) => e.kind === 'label' && e.actorId === actor && e.seq > sinceSeq);
        if (hit) {
          return jsonContent({
            ok: true,
            evidencia: {
              ledger: hit,
              intentos: attempt,
              score: compactActor(bridge.lastState(), actor)?.score ?? null
            }
          });
        }
        if (!bridge.myActor()?.riding) break; // llegó al mar y desmontó
      }
      const verdict = explainIntent(
        bridge.lastState(),
        bridge.maze(),
        makeIntent(actor, 'label:cast', { label })
      );
      return jsonContent(
        fail(verdict.error ?? 'sin_gota', {
          reglaProbable: verdict.error ?? 'sin_gota',
          evidencia: { actor: compactActor(bridge.lastState(), actor) }
        })
      );
    }
  );

  server.registerTool(
    'player_salvage',
    {
      title: 'Rescatar gota hundida del mar',
      description:
        'Emite salvage y espera ledger kind "label" con detail.salvage === true. ' +
        `Requiere proximidad (zona mar u orilla/boya). Labelset: ${deltaV0.labelset.join(', ')}.`,
      inputSchema: {
        dropletId: z.string().describe('Id de la gota hundida (player_observe what:sea).'),
        label: z.string().describe(`Etiqueta de rescate (${deltaV0.labelset.join(' | ')}).`),
        timeoutMs: z.number().optional()
      }
    },
    async ({ dropletId, label, timeoutMs }) => {
      const sinceSeq = bridge.maxLedgerSeq();
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'salvage',
          args: { dropletId, label },
          timeoutMs,
          done: () => {
            const hit = bridge
              .ledgerTail()
              .find((e) => e.kind === 'label' && e.actorId === actor && e.seq > sinceSeq && e.detail?.salvage);
            return hit ?? null;
          },
          evidence: (state, hit) => ({
            ledger: hit ?? null,
            score: compactActor(state, actor)?.score ?? null
          })
        })
      );
    }
  );

  server.registerTool(
    'player_empty',
    {
      title: 'Vaciar vertido blando del mar',
      description:
        'Purga gotas hundidas (ciclo vaciar DATOS §4). Coste narrativo: ya no se pueden ' +
        'rescatar. Ledger kind "empty" + score.emptied. Requiere orilla/boya/mar con hundidas.',
      inputSchema: {
        timeoutMs: z.number().optional()
      }
    },
    async ({ timeoutMs }) => {
      const sinceSeq = bridge.maxLedgerSeq();
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'empty',
          args: {},
          timeoutMs,
          done: () => {
            const hit = bridge
              .ledgerTail()
              .find((e) => e.kind === 'empty' && e.actorId === actor && e.seq > sinceSeq);
            return hit ?? null;
          },
          evidence: (state, hit) => ({
            ledger: hit ?? null,
            score: compactActor(state, actor)?.score ?? null,
            sea: projectSea(state)
          }),
          timeoutHint: '¿fuera del mar o nada_que_vaciar?'
        })
      );
    }
  );

  server.registerTool(
    'player_track',
    {
      title: 'Lanzar gota del mar al firehose-browser',
      description:
        'Emite track:cast y espera un arg:track propio con hint firehose-browser (sin mutar dominio).',
      inputSchema: {
        dropletId: z.string().describe('Id de gota en el mar.'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ dropletId, timeoutMs }) => {
      const sinceTs = Date.now();
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'track:cast',
          args: { dropletId },
          timeoutMs,
          done: () => {
            const hit = bridge
              .tracksTail()
              .find((t) => t.actorId === actor && t.ts >= sinceTs - 500 && t.hint === 'firehose-browser');
            return hit ?? null;
          },
          evidence: (state, track) => ({ track: track ?? null, actor: compactActor(state, actor) })
        })
      );
    }
  );

  server.registerTool(
    'player_contact',
    {
      title: 'Abrir contacto con un sujeto o grifo',
      description:
        'Emite contact:request y espera el contacto "open" en arg:state. Requiere proximidad ' +
        `(radio ${deltaV0.contactRadius}). Objetivos: grifos (grifo-a/grifo-b desde su cima) u otros actores. ` +
        'Rechazos: fuera_de_alcance, objetivo_desconocido, contacto_consigo.',
      inputSchema: {
        targetId: z.string().describe('Id del objetivo ("grifo-a", "dos", …).'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ targetId, timeoutMs }) => {
      const contactId = contactIdFor(actor, targetId);
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'contact:request',
          args: { targetId },
          timeoutMs,
          done: (state) => (state.contacts?.[contactId]?.state === 'open' ? state.contacts[contactId] : null),
          unchanged: (state) => !state.contacts?.[contactId],
          evidence: (state, value) => ({
            contactId,
            contacto: value ?? state?.contacts?.[contactId] ?? null,
            actor: compactActor(state, actor)
          })
        })
      );
    }
  );

  server.registerTool(
    'player_contact_close',
    {
      title: 'Cerrar mi contacto abierto',
      description: 'Cierra el contacto abierto en el que participo y espera a que desaparezca de arg:state.',
      inputSchema: { timeoutMs: z.number().optional() }
    },
    async ({ timeoutMs }) => {
      const mine = Object.entries(contactsOf(bridge.lastState(), actor)).find(
        ([, c]) => c.state === 'open'
      );
      if (!mine) return jsonContent(fail('sin_contacto_abierto'));
      const [contactId] = mine;
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'contact:close',
          args: { contactId },
          timeoutMs,
          done: (state) => (!state.contacts?.[contactId] ? { cerrado: contactId } : null),
          evidence: (state, value) => ({ ...(value ?? { contactId }), contactos: contactsOf(state, actor) })
        })
      );
    }
  );

  server.registerTool(
    'player_tap_set',
    {
      title: 'Fijar apertura de un grifo',
      description:
        'Emite tap:set y espera la apertura en arg:state. REGLA REAL del reducer: exige contacto abierto ' +
        'conmigo (player_contact al grifo primero). Rechazo típico: sin_contacto.',
      inputSchema: {
        tapId: z.string().describe('Grifo ("grifo-a" | "grifo-b").'),
        aperture: z.number().min(0).max(1).describe('Apertura 0..1.'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ tapId, aperture, timeoutMs }) => {
      const target = Math.round(aperture * 100) / 100;
      const pre = bridge.lastState()?.taps?.[tapId]?.aperture;
      if (pre === target) {
        // Sin cambio observable posible: valida la regla con el dry-run.
        const verdict = explainIntent(
          bridge.lastState(),
          bridge.maze(),
          makeIntent(actor, 'tap:set', { tapId, aperture })
        );
        bridge.emitIntent('tap:set', { tapId, aperture });
        const payload = verdict.ok
          ? { ok: true, evidencia: { grifo: bridge.lastState()?.taps?.[tapId], nota: 'apertura ya era la pedida' } }
          : fail(verdict.error, { reglaProbable: verdict.error, evidencia: { grifo: bridge.lastState()?.taps?.[tapId] } });
        return jsonContent(payload);
      }
      return jsonContent(
        await confirm(bridge, cfg, {
          intent: 'tap:set',
          args: { tapId, aperture },
          timeoutMs,
          done: (state) => {
            const tap = state.taps?.[tapId];
            return tap && Math.abs(tap.aperture - target) < 0.005 ? tap : null;
          },
          unchanged: (state) => {
            const tap = state.taps?.[tapId];
            return !tap || Math.abs(tap.aperture - target) >= 0.005;
          },
          evidence: (state, value) => ({
            grifo: value ?? state?.taps?.[tapId] ?? null,
            contactos: contactsOf(state, actor)
          })
        })
      );
    }
  );

  server.registerTool(
    'player_excavate',
    {
      title: 'Excavar un pasillo fantasma de la cantera',
      description:
        'Emite excavate y espera el pasillo en "digging" (y con waitOpen=true, en "open"). Requiere estar en ' +
        'una cámara adyacente y que el pasillo sea ghost. En feeds reales exige approval (gate humano). ' +
        `${mcpApprovalGateLine('player_excavate (con approval, feeds reales)')}`,
      inputSchema: {
        corridorId: z.string().describe('Pasillo (p.ej. "pasillo-camara-0-2--camara-1-2").'),
        approval: z.string().optional().describe('Token de aprobación humana (feeds reales).'),
        waitOpen: z.boolean().optional().describe('Esperar hasta open/ghost (default false: basta digging).'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ corridorId, approval, waitOpen = false, timeoutMs }) => {
      const corridorState = () => corridorsFrom(bridge.maze())[corridorId]?.state ?? null;
      const phase1 = await confirm(bridge, cfg, {
        intent: 'excavate',
        args: { corridorId, ...(approval ? { approval } : {}) },
        timeoutMs,
        timeoutHint:
          'sin eco: en feeds reales excavate exige approval (aprobacion_requerida no es visible en el dry-run)',
        done: () => {
          const state = corridorState();
          return state === 'digging' || state === 'open' ? { corridorId, state } : null;
        },
        unchanged: () => corridorState() === 'ghost',
        evidence: (state, value) => ({
          pasillo: value ?? { corridorId, state: corridorState() },
          actor: compactActor(state, actor)
        })
      });
      if (!phase1.ok || !waitOpen) return jsonContent(phase1);

      const openTimeout = timeoutMs ?? Math.max(cfg.confirmTimeoutMs, 25000);
      const start = Date.now();
      while (Date.now() - start < openTimeout) {
        const state = corridorState();
        if (state === 'open') {
          const entry = bridge
            .ledgerTail()
            .find((e) => e.kind === 'excavate' && e.detail?.corridorId === corridorId);
          return jsonContent({
            ok: true,
            evidencia: { pasillo: { corridorId, state }, ledger: entry ?? null }
          });
        }
        if (state === 'ghost') {
          const errorEntry = bridge
            .ledgerTail()
            .find((e) => e.kind === 'error' && e.detail?.corridorId === corridorId);
          return jsonContent(
            fail('excavacion_fallida', { evidencia: { pasillo: { corridorId, state }, ledger: errorEntry ?? null } })
          );
        }
        await sleep(DEFAULT_POLL_MS);
      }
      return jsonContent(fail('timeout_confirmacion', { evidencia: { pasillo: { corridorId, state: corridorState() } } }));
    }
  );

  server.registerTool(
    'player_cloak_equip',
    {
      title: 'Equipar un preset de cloak',
      description:
        'Emite cloak:equip y espera cloak.presetId en arg:state. Presets con física conocida: ' +
        `${Object.entries(CLOAK_MODS)
          .map(([id, mod]) => `${id} (walk×${mod.walkSpeed ?? 1}${mod.swimAllowed === false ? ', NO nada' : ', nada'})`)
          .join(' · ')}. Sin cloak, nadar está permitido por defecto.`,
      inputSchema: {
        presetId: z.string().describe('Id del preset (p.ej. "aleph-firehose-browse").'),
        label: z.string().optional().describe('Etiqueta visible (default presetId).'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ presetId, label, timeoutMs }) =>
      jsonContent(
        await confirm(bridge, cfg, {
          intent: 'cloak:equip',
          args: { presetId, ...(label ? { label } : {}) },
          timeoutMs,
          done: (state) => (state.actors?.[actor]?.cloak?.presetId === presetId ? state.actors[actor].cloak : null),
          unchanged: (state) => state.actors?.[actor]?.cloak?.presetId !== presetId,
          evidence: (state, value) => ({
            cloak: value ?? compactActor(state, actor)?.cloak ?? null,
            fisica: cloakModFor(presetId)
          })
        })
      )
  );

  server.registerTool(
    'player_emote',
    {
      title: 'Emote del monigote',
      description: `Emite emote y espera verlo en arg:state (TTL ~2.5 s). Válidos: ${EMOTES.join(', ')}.`,
      inputSchema: {
        name: z.enum(EMOTES).describe('Emote a ejecutar.'),
        timeoutMs: z.number().optional()
      }
    },
    async ({ name, timeoutMs }) =>
      jsonContent(
        await confirm(bridge, cfg, {
          intent: 'emote',
          args: { name },
          timeoutMs: timeoutMs ?? 5000,
          done: (state) => (state.actors?.[actor]?.emote === name ? { emote: name } : null),
          unchanged: (state) => state.actors?.[actor]?.emote !== name,
          evidence: (state, value) => ({ ...(value ?? {}), actor: compactActor(state, actor) })
        })
      )
  );

  server.registerTool(
    'player_observe',
    {
      title: 'Observar colas y estado',
      description:
        'Lecturas de las colas del bridge y del último arg:state: ledger (cola 50), tracks (mis últimas 20), taps, sea, objetivo, actors.',
      inputSchema: {
        what: z.enum(['ledger', 'tracks', 'taps', 'sea', 'objetivo', 'actors']).describe('Qué observar.'),
        n: z.number().optional().describe('Cuántas entradas (colas; default 10).')
      }
    },
    async ({ what, n = 10 }) => {
      const state = bridge.lastState();
      const data = {
        ledger: () => bridge.ledgerTail(n),
        tracks: () => bridge.tracksTail(n),
        taps: () => state?.taps ?? null,
        sea: () => projectSea(state),
        objetivo: () => state?.objetivo ?? null,
        actors: () => state?.actors ?? null
      }[what]();
      return jsonContent({ what, ts: state?.ts ?? null, data });
    }
  );
}

/**
 * @param {object} bridge
 */
export function getResourceRegistry(bridge) {
  const standard = buildStandardPlayerResources({
    game: RESOURCE_SCHEME,
    bridge,
    titles: {
      playerState: `Actor "${bridge.actor}" en vivo`,
      scene: 'Escena delta-v0 con estados en vivo',
      casos: 'Playbook de casos de validación (CASOS.md)'
    },
    descriptions: {
      playerState:
        'Snapshot compacto de MI actor + grifos/mar/objetivo resumidos (mismo payload que player_state).',
      scene:
        'Nodos/enlaces del nav-graph, ríos, grifos y cantera (cámaras+pasillos con estados) para planificar rutas.',
      casos:
        'packages/delta/spec/CASOS.md completo + índice de ids. Usa el prompt validar-caso para un caso concreto.'
    },
    readPlayerState: () => summarizeState(bridge.lastState(), bridge.actor),
    readScene: () => {
      const nav = staticNav();
      const state = bridge.lastState();
      const maze = bridge.maze();
      return {
        sceneId: deltaV0.id,
        spawnNodeId: deltaV0.spawnNodeId,
        labelset: deltaV0.labelset,
        contactRadius: deltaV0.contactRadius,
        nodos: Object.fromEntries(
          Object.entries(nav.nodos).map(([id, n]) => [id, { nombre: n.nombre, zone: n.zone, position: n.position }])
        ),
        enlaces: Object.fromEntries(
          Object.entries(nav.enlaces).map(([id, l]) => [
            id,
            {
              from: l.from,
              to: l.to,
              medium: l.medium,
              ...(l.corridorId ? { corridorId: l.corridorId } : {})
            }
          ])
        ),
        rios: Object.fromEntries(
          Object.entries(deltaV0.rios).map(([id, r]) => [
            id,
            { tapId: r.tapId, embarkNodeId: r.embarkNodeId, mouthNodeId: r.mouthNodeId }
          ])
        ),
        grifos: Object.fromEntries(
          Object.entries(deltaV0.taps).map(([id, t]) => [
            id,
            { summitNodeId: t.summitNodeId, riverId: t.riverId, vivo: state?.taps?.[id] ?? null }
          ])
        ),
        cantera: {
          entryNodeId: deltaV0.cantera.entryNodeId,
          entryChamberId: deltaV0.cantera.entryChamberId,
          mazeRev: maze?.rev ?? null,
          camaras: maze?.chambers ?? null,
          pasillos: corridorsFrom(maze)
        },
        mar: state?.sea ?? { murkCapacity: deltaV0.mar.murkCapacity }
      };
    },
    readCasos: () => {
      const markdown = readCasosMarkdown();
      return { casos: listCasoIds(markdown), markdown };
    }
  });

  return [
    ...standard,
    {
      name: 'arg-sea',
      uri: 'arg://sea',
      title: 'Mar vivo — clusters y gotas',
      mimeType: 'application/json',
      description: 'Contadores del mar + clusters seaLayout + gotas flotantes/hundidas.',
      read: () => projectSea(bridge.lastState())
    },
    {
      name: 'arg-ledger-tail',
      uri: 'arg://ledger/tail',
      title: 'Cola del ledger (últimas 50)',
      mimeType: 'application/json',
      description:
        'Últimas entradas arg:ledger vistas por este wrapper (label/excavate/burst/collapse/objetivo/error).',
      read: () => ({ entries: bridge.ledgerTail() })
    },
    {
      name: 'arg-tracks-tail',
      uri: 'arg://tracks/tail',
      title: `Tracks de "${bridge.actor}" (últimos 20)`,
      mimeType: 'application/json',
      description: 'Últimos arg:track de MI actor (recurso pisado + hint de navegador real).',
      read: () => ({ actor: bridge.actor, entries: bridge.tracksTail() })
    }
  ];
}

export function getPromptRegistry(bridge) {
  return [
    {
      name: 'validar-caso',
      title: 'Validar un caso del playbook delta',
      description:
        'Devuelve los pasos de un caso de CASOS.md listos para ejecutar con los tools player_* de este servidor.',
      argsSchema: {
        casoId: z.string().describe('Id del caso (p.ej. "C-01"; el índice completo y siempre al día vive en el resource arg://casos).')
      },
      render: ({ casoId }) => {
        const markdown = readCasosMarkdown();
        const section = extractCaso(markdown, casoId);
        if (!section) {
          return [
            `Caso "${casoId}" no encontrado en CASOS.md.`,
            `Casos disponibles: ${listCasoIds(markdown).join(', ')}.`,
            'Lee arg://casos para el playbook completo.'
          ].join('\n');
        }
        return [
          `Valida el caso ${casoId} de delta controlando al actor "${bridge.actor}" con los tools player_* de este servidor.`,
          '',
          'Reglas del juego de validación:',
          '1. Ejecuta los "pasos del agente" en orden, como llamadas MCP literales.',
          '2. Tras cada paso comprueba el criterio de éxito en la respuesta { ok, error?, evidencia }.',
          '3. Si un paso esperado-válido devuelve ok:false, o uno esperado-inválido devuelve ok:true, el caso FALLA.',
          '4. Cuenta al humano qué debería estar viendo en su vista en cada paso (columna "qué observa el humano").',
          '5. Informe final: caso, pasos ejecutados, evidencia clave (ledger/estado) y veredicto.',
          '',
          section
        ].join('\n');
      }
    }
  ];
}

/**
 * Ejemplos del server card (fuente de verdad para agentes).
 * @param {object} bridge
 */
export function buildCardExamples(bridge) {
  return {
    actor: bridge.actor,
    room: bridge.room,
    approvalToken: resolveMcpApprovalToken(),
    goldenPath: {
      prompt: 'validar-caso',
      args: { casoId: 'C-01' },
      resolveUri: 'arg://player/state',
      toolSample: { name: 'player_join', args: {} }
    },
    toolSamples: [
      { name: 'player_join', args: {} },
      { name: 'player_state', args: {} },
      { name: 'player_move', args: { nodeId: 'terraza-a' } },
      { name: 'player_goto', args: { nodeId: 'cima-a' } },
      { name: 'player_ride', args: { riverId: 'rio-a' } },
      { name: 'player_dismount', args: {} },
      { name: 'player_label', args: { label: 'agora', tries: 20 } },
      { name: 'player_contact', args: { targetId: 'grifo-a' } },
      { name: 'player_contact_close', args: {} },
      { name: 'player_tap_set', args: { tapId: 'grifo-a', aperture: 0.75 } },
      { name: 'player_excavate', args: { corridorId: 'pasillo-camara-0-2--camara-1-2', waitOpen: true } },
      { name: 'player_cloak_equip', args: { presetId: 'aleph-firehose-browse' } },
      { name: 'player_emote', args: { name: 'wave' } },
      { name: 'player_observe', args: { what: 'ledger', n: 10 } }
    ],
    sampleResolve: [
      { uri: 'arg://player/state', expect: 'snapshot compacto de mi actor' },
      { uri: 'arg://scene', expect: 'nav-graph + estados en vivo para planificar' },
      { uri: 'arg://ledger/tail', expect: 'últimas entradas del ledger' },
      { uri: 'arg://tracks/tail', expect: 'mis últimos tracks' },
      { uri: 'arg://casos', expect: 'playbook CASOS.md + índice' }
    ],
    prompts: [{ name: 'validar-caso', args: { casoId: 'C-01' } }],
    mutationPrompts: [],
    nota: `Una instancia = un actor ("${bridge.actor}"). Este wrapper emite arg:intent, jamás muta dominio (G-ARG.1).`
  };
}

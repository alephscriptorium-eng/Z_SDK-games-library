/**
 * Entradas node-only de @zeus/arg-domain (no importar desde navegador).
 * srcDir se sirve estático en arg-console para que las vistas importen el
 * dominio browser-safe crudo (mismo patrón que @zeus/game-engine/node).
 */

import { nodeSrcDir } from '@zeus/protocol/node-src-dir';

export const srcDir = nodeSrcDir(import.meta.url);

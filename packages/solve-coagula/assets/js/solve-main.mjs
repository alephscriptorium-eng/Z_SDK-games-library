/**
 * Vista solve-coagula — HUD mínimo (sin room socket en browser por ahora).
 * El estado vivo viaja por MCP/autoridad; esta página lista actos + meta.
 */
const cfg = JSON.parse(document.getElementById('viewer-config')?.textContent || '{}');
const roomEl = document.getElementById('hud-room');
const actorEl = document.getElementById('hud-actor');
if (roomEl) roomEl.textContent = cfg.room || '—';
if (actorEl) actorEl.textContent = cfg.actor || '—';

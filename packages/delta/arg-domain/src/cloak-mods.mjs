/**
 * Modificadores de física por preset de cloak (v1).
 * presetId → multiplicadores aplicados en move/swim (reducer) y tick de enlace.
 */

/** @type {Record<string, { walkSpeed?: number, swimAllowed?: boolean }>} */
export const CLOAK_MODS = {
  'aleph-tronco-puro': { walkSpeed: 1, swimAllowed: false },
  'aleph-firehose-browse': { walkSpeed: 1.25, swimAllowed: true },
  'aleph-wp-cache': { walkSpeed: 0.9, swimAllowed: true },
  'test-dry-only': { swimAllowed: false }
};

/**
 * @param {string|null|undefined} presetId
 * @returns {{ walkSpeed: number, swimAllowed: boolean }}
 */
export function cloakModFor(presetId) {
  const mod = presetId ? CLOAK_MODS[presetId] : null;
  return {
    walkSpeed: mod?.walkSpeed ?? 1,
    swimAllowed: mod?.swimAllowed !== false
  };
}

/** Alias usado en domain-state / reducer. */
export const cloakModsFor = cloakModFor;

/**
 * Velocidad efectiva sobre un enlace según el cloak del actor.
 * @param {number} baseSpeed walkSpeed del enlace (nav-graph)
 * @param {{ cloak?: { presetId?: string }|null }} actor
 */
export function effectiveLinkSpeed(baseSpeed, actor) {
  return baseSpeed * cloakModFor(actor?.cloak?.presetId).walkSpeed;
}

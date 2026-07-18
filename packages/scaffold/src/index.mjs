/**
 * Identidad del scaffold de Z_SDK-games-library (WP-U60).
 * No nombra un juego canónico: la library alberga varios juegos.
 */
export const LIBRARY_ID = 'Z_SDK-games-library';

export const LIBRARY_STATUS = 'scaffold';

/** Slots previstos; la migración real es WP-U61. */
export const GAME_SLOTS = Object.freeze(['delta', 'pozo']);

/**
 * @param {string} id
 * @returns {boolean}
 */
export function isKnownGameSlot(id) {
  return GAME_SLOTS.includes(id);
}

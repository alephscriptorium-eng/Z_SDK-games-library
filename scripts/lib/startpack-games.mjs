/**
 * Catálogo de juegos → startpack (tabla, no if/else — PRACTICAS §1.2).
 * Pipeline Notario parametrizado por `game` (regla de los dos juegos).
 */

/** @typedef {{
 *   game: string,
 *   packageName: string,
 *   dir: string,
 *   npmPackName: string
 * }} StartpackGame */

/** @type {Record<string, StartpackGame>} */
export const STARTPACK_GAMES = {
  delta: {
    game: 'delta',
    packageName: '@zeus/startpack-delta',
    dir: 'packages/startpack-delta',
    npmPackName: 'zeus-startpack-delta'
  },
  pozo: {
    game: 'pozo',
    packageName: '@zeus/startpack-pozo',
    dir: 'packages/startpack-pozo',
    npmPackName: 'zeus-startpack-pozo'
  }
};

/**
 * @param {string} game
 * @returns {StartpackGame}
 */
export function resolveStartpackGame(game) {
  const entry = STARTPACK_GAMES[game];
  if (!entry) {
    const known = Object.keys(STARTPACK_GAMES).join(', ');
    throw new Error(`Unknown startpack game "${game}". Known: ${known}`);
  }
  return entry;
}

export function listStartpackGames() {
  return Object.keys(STARTPACK_GAMES);
}

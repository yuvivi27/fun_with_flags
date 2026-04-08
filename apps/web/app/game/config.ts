/** Offered on the game-length screen; session uses `min(choice, unique flags in pool)`. */
export const GAME_LENGTH_OPTIONS = [10, 25, 50] as const;

/** Smallest offered round length (used for docs / validation messaging only). */
export const DEFAULT_GAME_LENGTH = 10;

/**
 * Parses `count` from the URL. Returns null when missing or invalid so the game
 * route can send players to the length picker first — no implicit default session.
 */
export function parseRequestedQuestionCount(
  raw: string | undefined,
): number | null {
  if (raw === undefined || raw === "") return null;
  const n = Number.parseInt(raw, 10);
  if (!Number.isFinite(n) || n < 1) return null;
  return n;
}

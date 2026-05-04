/** XP for first segment (level 1 → 2). */
export const BASE_FIRST_SEGMENT_XP = 400;

/** Each subsequent level adds this much to the segment requirement. */
export const XP_PER_LEVEL_STEP = 200;

export type LevelProgress = {
  currentLevel: number;
  /** XP still needed to level up (remaining within the current bracket). */
  xpToNextLevel: number;
  xpRequiredForNextLevel: number;
};

export type TotalXpUser = {
  totalXp: number;
};

/**
 * XP required in the current level to reach the next level.
 * Segments: 400, 600, 800, … — formula: BASE + (level − 1) × STEP.
 */
export function xpRequiredForNextLevel(currentLevel: number): number {
  const safeLevel = Math.max(1, Math.floor(currentLevel));
  return BASE_FIRST_SEGMENT_XP + (safeLevel - 1) * XP_PER_LEVEL_STEP;
}

export function progressFromTotalXp(totalXp: number): LevelProgress {
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let requirement = xpRequiredForNextLevel(level);

  while (remaining >= requirement) {
    remaining -= requirement;
    level += 1;
    requirement = xpRequiredForNextLevel(level);
  }

  return {
    currentLevel: level,
    xpToNextLevel: Math.max(0, requirement - remaining),
    xpRequiredForNextLevel: requirement,
  };
}

export function levelFromTotalXp(totalXp: number): number {
  return progressFromTotalXp(totalXp).currentLevel;
}

/** Prefer over stored `currentLevel` when unlocks must match XP curve. */
export function effectivePlayerLevelFromUser(
  user: TotalXpUser | null | undefined,
): number {
  if (user == null) return 1;
  return levelFromTotalXp(user.totalXp);
}

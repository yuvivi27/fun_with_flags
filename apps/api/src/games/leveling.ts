const BASE_LEVEL_XP = 400;
const LEVEL_MULTIPLIER = 1.5;

export type LevelProgress = {
  currentLevel: number;
  xpToNextLevel: number;
  xpRequiredForNextLevel: number;
};

export function xpRequiredForNextLevel(currentLevel: number): number {
  const safeLevel = Math.max(1, Math.floor(currentLevel));
  return Math.round(BASE_LEVEL_XP * LEVEL_MULTIPLIER ** (safeLevel - 1));
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

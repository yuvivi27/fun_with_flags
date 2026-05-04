import {
  GAME_LENGTH_LEVEL_REQUIREMENTS,
  GAME_LENGTH_OPTIONS,
} from "./config";
import { getMaxDifficultyForPlayerLevel } from "./questions";

/**
 * Human-readable unlocks the player *just* gained by crossing from previousLevel → newLevel.
 */
export function getUnlockLinesForLevelUp(
  previousLevel: number,
  newLevel: number,
): string[] {
  if (newLevel <= previousLevel) return [];

  const lines: string[] = [];
  const prevBand = getMaxDifficultyForPlayerLevel(previousLevel);
  const newBand = getMaxDifficultyForPlayerLevel(newLevel);

  if (newBand > prevBand) {
    for (let b = prevBand + 1; b <= newBand; b++) {
      if (b === 2) {
        lines.push("More countries added to the flag pool");
      }
      if (b === 3) {
        lines.push("Island and specialty flags added to the pool");
      }
      if (b === 4) {
        lines.push("US state flags added to the pool");
      }
      if (b === 5) {
        lines.push("Advanced packs unlocked: historical and cultural flags");
      }
    }
  }

  for (const len of GAME_LENGTH_OPTIONS) {
    const req =
      GAME_LENGTH_LEVEL_REQUIREMENTS[
        len as keyof typeof GAME_LENGTH_LEVEL_REQUIREMENTS
      ];
    if (req === undefined) continue;
    if (previousLevel < req && newLevel >= req) {
      lines.push(`${len}-question games unlocked`);
    }
  }

  return lines;
}

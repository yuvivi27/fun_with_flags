import { describe, expect, it } from "vitest";
import {
  BASE_FIRST_SEGMENT_XP,
  XP_PER_LEVEL_STEP,
  effectivePlayerLevelFromUser,
  levelFromTotalXp,
  progressFromTotalXp,
  xpRequiredForNextLevel,
} from "./leveling.js";

describe("xpRequiredForNextLevel", () => {
  it("returns BASE_FIRST_SEGMENT_XP for level 1", () => {
    expect(xpRequiredForNextLevel(1)).toBe(BASE_FIRST_SEGMENT_XP);
  });

  it("adds XP_PER_LEVEL_STEP for each subsequent level", () => {
    expect(xpRequiredForNextLevel(2)).toBe(
      BASE_FIRST_SEGMENT_XP + XP_PER_LEVEL_STEP,
    );
    expect(xpRequiredForNextLevel(5)).toBe(
      BASE_FIRST_SEGMENT_XP + 4 * XP_PER_LEVEL_STEP,
    );
  });

  it("clamps non-positive levels up to 1", () => {
    expect(xpRequiredForNextLevel(0)).toBe(BASE_FIRST_SEGMENT_XP);
    expect(xpRequiredForNextLevel(-7)).toBe(BASE_FIRST_SEGMENT_XP);
  });

  it("floors fractional levels", () => {
    expect(xpRequiredForNextLevel(2.9)).toBe(
      BASE_FIRST_SEGMENT_XP + XP_PER_LEVEL_STEP,
    );
  });
});

describe("progressFromTotalXp", () => {
  it("reports level 1 for zero XP", () => {
    expect(progressFromTotalXp(0)).toEqual({
      currentLevel: 1,
      xpToNextLevel: 400,
      xpRequiredForNextLevel: 400,
    });
  });

  it("treats negative XP as zero", () => {
    expect(progressFromTotalXp(-50)).toEqual({
      currentLevel: 1,
      xpToNextLevel: 400,
      xpRequiredForNextLevel: 400,
    });
  });

  it("counts XP within the first bracket", () => {
    expect(progressFromTotalXp(399)).toEqual({
      currentLevel: 1,
      xpToNextLevel: 1,
      xpRequiredForNextLevel: 400,
    });
  });

  it("crosses the boundary at exactly 400 XP", () => {
    expect(progressFromTotalXp(400)).toEqual({
      currentLevel: 2,
      xpToNextLevel: 600,
      xpRequiredForNextLevel: 600,
    });
  });

  it("spans multiple levels for larger totals", () => {
    expect(progressFromTotalXp(1000)).toEqual({
      currentLevel: 3,
      xpToNextLevel: 800,
      xpRequiredForNextLevel: 800,
    });
  });

  it("handles very large XP totals without infinite looping", () => {
    const result = progressFromTotalXp(100_000);
    expect(result.currentLevel).toBeGreaterThan(10);
    expect(result.xpRequiredForNextLevel).toBeGreaterThan(0);
    expect(result.xpToNextLevel).toBeGreaterThanOrEqual(0);
    expect(result.xpToNextLevel).toBeLessThanOrEqual(
      result.xpRequiredForNextLevel,
    );
  });

  it("floors fractional totals", () => {
    expect(progressFromTotalXp(401.9)).toEqual({
      currentLevel: 2,
      xpToNextLevel: 599,
      xpRequiredForNextLevel: 600,
    });
  });
});

describe("levelFromTotalXp", () => {
  it("matches the level reported by progressFromTotalXp", () => {
    for (const xp of [0, 200, 400, 999, 5000, 250_000]) {
      expect(levelFromTotalXp(xp)).toBe(progressFromTotalXp(xp).currentLevel);
    }
  });
});

describe("effectivePlayerLevelFromUser", () => {
  it("returns 1 for null", () => {
    expect(effectivePlayerLevelFromUser(null)).toBe(1);
  });

  it("returns 1 for undefined", () => {
    expect(effectivePlayerLevelFromUser(undefined)).toBe(1);
  });

  it("returns 1 for a brand-new user", () => {
    expect(effectivePlayerLevelFromUser({ totalXp: 0 })).toBe(1);
  });

  it("derives the level from totalXp for an existing user", () => {
    expect(effectivePlayerLevelFromUser({ totalXp: 1000 })).toBe(3);
    expect(effectivePlayerLevelFromUser({ totalXp: 1500 })).toBe(3);
  });
});

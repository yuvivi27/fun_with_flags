import { describe, expect, it } from "vitest";
import {
  DEFAULT_GAME_LENGTH,
  GAME_LENGTH_LEVEL_REQUIREMENTS,
  GAME_LENGTH_OPTIONS,
  isGameLengthUnlocked,
  parseRequestedQuestionCount,
} from "./config";

describe("config constants", () => {
  it("exposes the expected length options and unlock requirements", () => {
    expect(GAME_LENGTH_OPTIONS).toEqual([10, 25, 50]);
    expect(GAME_LENGTH_LEVEL_REQUIREMENTS).toEqual({ 10: 1, 25: 3, 50: 8 });
    expect(DEFAULT_GAME_LENGTH).toBe(10);
  });
});

describe("parseRequestedQuestionCount", () => {
  it("returns null for missing or empty input", () => {
    expect(parseRequestedQuestionCount(undefined)).toBeNull();
    expect(parseRequestedQuestionCount("")).toBeNull();
  });

  it("returns null for non-numeric or sub-1 values", () => {
    expect(parseRequestedQuestionCount("abc")).toBeNull();
    expect(parseRequestedQuestionCount("0")).toBeNull();
    expect(parseRequestedQuestionCount("-5")).toBeNull();
  });

  it("parses positive integers", () => {
    expect(parseRequestedQuestionCount("10")).toBe(10);
    expect(parseRequestedQuestionCount("999")).toBe(999);
  });

  it("floors decimal values via parseInt", () => {
    expect(parseRequestedQuestionCount("12.9")).toBe(12);
  });
});

describe("isGameLengthUnlocked", () => {
  it("locks lengths above the player's level", () => {
    expect(isGameLengthUnlocked(25, 1)).toBe(false);
    expect(isGameLengthUnlocked(50, 7)).toBe(false);
  });

  it("unlocks lengths at or above the level requirement", () => {
    expect(isGameLengthUnlocked(10, 1)).toBe(true);
    expect(isGameLengthUnlocked(25, 3)).toBe(true);
    expect(isGameLengthUnlocked(50, 8)).toBe(true);
    expect(isGameLengthUnlocked(50, 99)).toBe(true);
  });

  it("returns false for unsupported question counts", () => {
    expect(isGameLengthUnlocked(7 as unknown as number, 9)).toBe(false);
    expect(isGameLengthUnlocked(100 as unknown as number, 99)).toBe(false);
  });
});

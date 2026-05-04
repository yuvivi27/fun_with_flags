import { describe, expect, it } from "vitest";
import {
  FLAGS_DATABASE,
  flagImageSrc,
  getFlagsForPlayerLevel,
  getMaxDifficultyForPlayerLevel,
} from "./questions";

describe("getMaxDifficultyForPlayerLevel", () => {
  it.each([
    [1, 1],
    [3, 1],
    [4, 2],
    [6, 2],
    [7, 3],
    [8, 3],
    [9, 5],
    [99, 5],
  ])("level %i unlocks band %i", (level, expected) => {
    expect(getMaxDifficultyForPlayerLevel(level)).toBe(expected);
  });
});

describe("getFlagsForPlayerLevel", () => {
  it("returns no flag with difficulty above the unlocked band", () => {
    const flags = getFlagsForPlayerLevel(1);
    expect(flags.length).toBeGreaterThan(0);
    for (const flag of flags) {
      expect(flag.difficulty).toBeLessThanOrEqual(1);
    }
  });

  it("returns more flags as the level increases", () => {
    const lvl1 = getFlagsForPlayerLevel(1).length;
    const lvl4 = getFlagsForPlayerLevel(4).length;
    const lvl7 = getFlagsForPlayerLevel(7).length;
    const lvl9 = getFlagsForPlayerLevel(9).length;
    expect(lvl4).toBeGreaterThanOrEqual(lvl1);
    expect(lvl7).toBeGreaterThanOrEqual(lvl4);
    expect(lvl9).toBeGreaterThanOrEqual(lvl7);
  });
});

describe("flagImageSrc", () => {
  it("returns a lowercased path under /flags/", () => {
    expect(flagImageSrc("US")).toBe("/flags/us.svg");
    expect(flagImageSrc("eth-druze")).toBe("/flags/eth-druze.svg");
  });
});

describe("FLAGS_DATABASE", () => {
  it("never contains an excluded code", () => {
    const codes = new Set(FLAGS_DATABASE.map((f) => f.code.toLowerCase()));
    for (const banned of ["ps", "usc", "bl", "bq", "bv", "yt"]) {
      expect(codes.has(banned)).toBe(false);
    }
  });

  it("has unique country codes", () => {
    const codes = FLAGS_DATABASE.map((f) => f.code);
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("contains the custom territory entries (ac, ta)", () => {
    const codes = new Set(FLAGS_DATABASE.map((f) => f.code));
    expect(codes.has("ac")).toBe(true);
    expect(codes.has("ta")).toBe(true);
  });

  it("normalizes English country names (no diacritics in known names)", () => {
    const turkey = FLAGS_DATABASE.find((f) => f.name === "Turkey");
    expect(turkey).toBeDefined();
    const aland = FLAGS_DATABASE.find((f) => f.name === "Aland Islands");
    expect(aland).toBeDefined();
    for (const flag of FLAGS_DATABASE) {
      expect(flag.name).not.toMatch(/[\u0300-\u036f]/);
    }
  });
});

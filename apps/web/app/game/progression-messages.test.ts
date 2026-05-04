import { describe, expect, it } from "vitest";
import { getUnlockLinesForLevelUp } from "./progression-messages";

describe("getUnlockLinesForLevelUp", () => {
  it("returns no lines when the level did not increase", () => {
    expect(getUnlockLinesForLevelUp(3, 3)).toEqual([]);
    expect(getUnlockLinesForLevelUp(5, 4)).toEqual([]);
  });

  it("returns no lines when crossing levels that do not unlock anything", () => {
    expect(getUnlockLinesForLevelUp(1, 2)).toEqual([]);
  });

  it("announces the 25-question unlock at level 3", () => {
    expect(getUnlockLinesForLevelUp(2, 3)).toEqual([
      "25-question games unlocked",
    ]);
  });

  it("announces the broader pool when crossing into band 2", () => {
    expect(getUnlockLinesForLevelUp(3, 4)).toEqual([
      "More countries added to the flag pool",
    ]);
  });

  it("announces island/specialty flags when crossing into band 3", () => {
    expect(getUnlockLinesForLevelUp(6, 7)).toEqual([
      "Island and specialty flags added to the pool",
    ]);
  });

  it("announces US states and the advanced packs together when crossing band 5", () => {
    const lines = getUnlockLinesForLevelUp(8, 9);
    expect(lines).toContain("US state flags added to the pool");
    expect(lines).toContain(
      "Advanced packs unlocked: historical and cultural flags",
    );
  });

  it("collects every unlock when leveling 1 to 9", () => {
    const lines = getUnlockLinesForLevelUp(1, 9);
    expect(lines).toEqual([
      "More countries added to the flag pool",
      "Island and specialty flags added to the pool",
      "US state flags added to the pool",
      "Advanced packs unlocked: historical and cultural flags",
      "25-question games unlocked",
      "50-question games unlocked",
    ]);
  });
});

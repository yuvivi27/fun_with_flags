import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LevelUpCelebration } from "./LevelUpCelebration";

describe("LevelUpCelebration", () => {
  it("renders the level + unlock list", () => {
    render(
      <LevelUpCelebration
        level={4}
        unlockLines={[
          "More countries added to the flag pool",
          "25-question games unlocked",
        ]}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.getByText(/You reached level 4/i)).toBeInTheDocument();
    expect(screen.getByText(/New for you:/i)).toBeInTheDocument();
    expect(
      screen.getByText("More countries added to the flag pool"),
    ).toBeInTheDocument();
  });

  it("renders a fallback message when there are no unlock lines", () => {
    render(
      <LevelUpCelebration
        level={2}
        unlockLines={[]}
        onContinue={vi.fn()}
      />,
    );
    expect(screen.queryByText(/New for you:/i)).not.toBeInTheDocument();
    expect(
      screen.getByText(/Keep playing to unlock longer rounds/i),
    ).toBeInTheDocument();
  });

  it("invokes onContinue when the button is clicked", () => {
    const onContinue = vi.fn();
    render(
      <LevelUpCelebration
        level={5}
        unlockLines={["x"]}
        onContinue={onContinue}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /Continue/i }));
    expect(onContinue).toHaveBeenCalledTimes(1);
  });
});

import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();
vi.mock("../../auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import GameLengthPage from "./page";

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("GameLengthPage", () => {
  it("renders the level-1 player with only the 10-question option unlocked", () => {
    useAuthMock.mockReturnValue({ user: { totalXp: 0 } });
    render(<GameLengthPage />);

    expect(screen.getByRole("link", { name: /10 Questions/i })).toHaveAttribute(
      "href",
      "/game?count=10",
    );

    const locked25 = screen.getByRole("button", {
      name: /25 questions locked until level 3/i,
    });
    expect(locked25).toBeDisabled();

    const locked50 = screen.getByRole("button", {
      name: /50 questions locked until level 8/i,
    });
    expect(locked50).toBeDisabled();
  });

  it("unlocks all options at high level", () => {
    useAuthMock.mockReturnValue({ user: { totalXp: 100_000 } });
    render(<GameLengthPage />);
    expect(screen.getByRole("link", { name: /10 Questions/i })).toHaveAttribute(
      "href",
      "/game?count=10",
    );
    expect(screen.getByRole("link", { name: /25 Questions/i })).toHaveAttribute(
      "href",
      "/game?count=25",
    );
    expect(screen.getByRole("link", { name: /50 Questions/i })).toHaveAttribute(
      "href",
      "/game?count=50",
    );
  });
});

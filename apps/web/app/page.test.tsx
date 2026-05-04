import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn().mockReturnValue({ user: null, logout: vi.fn() });
vi.mock("./auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import Home from "./page";

describe("Home (landing) page", () => {
  it("renders the main navigation", () => {
    render(<Home />);
    expect(
      screen.getByRole("link", { name: /^PLAY/i }),
    ).toHaveAttribute("href", "/game/length");
    expect(
      screen.getByRole("link", { name: /LEADERBOARD/i }),
    ).toHaveAttribute("href", "/leaderboard");
    expect(
      screen.getByRole("link", { name: /ABOUT/i }),
    ).toHaveAttribute("href", "/about");
  });
});

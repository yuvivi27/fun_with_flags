import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();
vi.mock("./auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import { HomeAuthActions } from "./home-auth-actions";

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("HomeAuthActions", () => {
  it("shows the login link when there is no user", () => {
    useAuthMock.mockReturnValue({ user: null, logout: vi.fn() });
    render(<HomeAuthActions />);
    const link = screen.getByRole("link", { name: /Login \/ Signup/i });
    expect(link).toHaveAttribute("href", "/login");
  });

  it("shows level + XP progress and a logout button when authenticated", () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.com",
        username: "a",
        totalXp: 100,
        currentLevel: 1,
        xpToNextLevel: 300,
        xpRequiredForNextLevel: 400,
      },
      logout,
    });
    render(<HomeAuthActions />);

    expect(screen.getByText(/Lv 1/)).toBeInTheDocument();
    expect(screen.getByText(/300 XP left/)).toBeInTheDocument();
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemax", "400");
    expect(progressbar).toHaveAttribute("aria-valuenow", "100");

    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(logout).toHaveBeenCalled();
  });

  it("clamps XP remaining within the bracket bounds", () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "u1",
        email: "a@b.com",
        username: "a",
        totalXp: 1000,
        currentLevel: 3,
        xpToNextLevel: 800,
        xpRequiredForNextLevel: 800,
      },
      logout: vi.fn(),
    });
    render(<HomeAuthActions />);
    const progressbar = screen.getByRole("progressbar");
    expect(progressbar).toHaveAttribute("aria-valuemax", "800");
    expect(progressbar).toHaveAttribute("aria-valuenow", "0");
  });
});

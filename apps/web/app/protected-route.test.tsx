import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __routerMocks, __setPathname, __setSearchParams } from "../test/setup";

const useAuthMock = vi.fn();
vi.mock("./auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import { ProtectedRoute } from "./protected-route";

beforeEach(() => {
  useAuthMock.mockReset();
  window.history.pushState({}, "", "/");
});

function renderWithAuth(value: unknown) {
  useAuthMock.mockReturnValue(value);
  return render(
    <ProtectedRoute>
      <div data-testid="children">protected</div>
    </ProtectedRoute>,
  );
}

describe("ProtectedRoute", () => {
  it("shows the checking-session view while loading", () => {
    renderWithAuth({
      user: null,
      token: null,
      loading: true,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    });
    expect(screen.getByText(/Checking your session/i)).toBeInTheDocument();
    expect(screen.queryByTestId("children")).not.toBeInTheDocument();
  });

  it("renders children when authenticated", () => {
    renderWithAuth({
      user: { id: "u1" },
      token: "tok",
      loading: false,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    });
    expect(screen.getByTestId("children")).toBeInTheDocument();
  });

  it("redirects to /login when there is no session", async () => {
    __setPathname("/leaderboard");
    __setSearchParams("count=10");
    window.history.pushState({}, "", "/leaderboard?count=10");
    renderWithAuth({
      user: null,
      token: null,
      loading: false,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    });

    await waitFor(() => expect(__routerMocks.replace).toHaveBeenCalled());
    expect(__routerMocks.replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/leaderboard?count=10")}`,
    );
  });

  it("redirects to a default next path when pathname is empty", async () => {
    __setPathname("");
    __setSearchParams("");
    renderWithAuth({
      user: null,
      token: null,
      loading: false,
      refreshUser: vi.fn(),
      logout: vi.fn(),
    });

    await waitFor(() => expect(__routerMocks.replace).toHaveBeenCalled());
    expect(__routerMocks.replace).toHaveBeenCalledWith(
      `/login?next=${encodeURIComponent("/game/length")}`,
    );
  });

  it("shows a retry/sign-out card when token exists but no user", () => {
    const refreshUser = vi.fn().mockResolvedValue(undefined);
    const logout = vi.fn();
    renderWithAuth({
      user: null,
      token: "tok",
      loading: false,
      refreshUser,
      logout,
    });

    expect(
      screen.getByText(/We could not restore your session/i),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /Retry now/i }));
    expect(refreshUser).toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /Sign out/i }));
    expect(logout).toHaveBeenCalled();
  });
});

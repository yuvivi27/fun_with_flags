import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  __routerMocks,
  __setSearchParams,
} from "../../test/setup";

const useAuthMock = vi.fn();
vi.mock("../auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import LoginPageClient from "./LoginPageClient";

beforeEach(() => {
  useAuthMock.mockReset();
});

function setupAuth(login = vi.fn()) {
  useAuthMock.mockReturnValue({ login });
  return login;
}

describe("LoginPageClient", () => {
  it("renders the form with email/password inputs and a submit button", () => {
    setupAuth();
    render(<LoginPageClient />);
    expect(screen.getByRole("textbox", { name: /Email/i })).toBeInTheDocument();
    expect(
      screen.getByLabelText(/^Password$/i, { selector: "input" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Sign in/i }),
    ).toBeInTheDocument();
  });

  it("submits credentials and replaces the route with the next path", async () => {
    const login = setupAuth(vi.fn().mockResolvedValue(undefined));
    __setSearchParams("next=/leaderboard");
    render(<LoginPageClient />);

    fireEvent.change(screen.getByRole("textbox", { name: /Email/i }), {
      target: { value: "alice@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i, { selector: "input" }), {
      target: { value: "pw-12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    await waitFor(() => expect(login).toHaveBeenCalledTimes(1));
    expect(login).toHaveBeenCalledWith("alice@example.com", "pw-12345");
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/leaderboard"),
    );
  });

  it("falls back to /game/length when there is no next param", async () => {
    const login = setupAuth(vi.fn().mockResolvedValue(undefined));
    render(<LoginPageClient />);
    fireEvent.change(screen.getByRole("textbox", { name: /Email/i }), {
      target: { value: "a@b.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i, { selector: "input" }), {
      target: { value: "pw-12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));
    await waitFor(() => expect(login).toHaveBeenCalled());
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/game/length"),
    );
  });

  it("shows the API error message when login fails", async () => {
    setupAuth(vi.fn().mockRejectedValue(new Error("Invalid email or password")));
    render(<LoginPageClient />);

    fireEvent.change(screen.getByRole("textbox", { name: /Email/i }), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i, { selector: "input" }), {
      target: { value: "pw-12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(
      await screen.findByText(/Invalid email or password/i),
    ).toBeInTheDocument();
    expect(__routerMocks.replace).not.toHaveBeenCalled();
  });

  it("shows a generic message when the thrown error is not an Error instance", async () => {
    setupAuth(vi.fn().mockRejectedValue("oops"));
    render(<LoginPageClient />);

    fireEvent.change(screen.getByRole("textbox", { name: /Email/i }), {
      target: { value: "x@y.com" },
    });
    fireEvent.change(screen.getByLabelText(/^Password$/i, { selector: "input" }), {
      target: { value: "pw-12345" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Sign in/i }));

    expect(await screen.findByText(/Login failed/i)).toBeInTheDocument();
  });
});

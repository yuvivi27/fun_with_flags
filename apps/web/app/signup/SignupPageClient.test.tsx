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

import SignupPageClient from "./SignupPageClient";

beforeEach(() => {
  useAuthMock.mockReset();
});

function setupAuth(signup = vi.fn()) {
  useAuthMock.mockReturnValue({ signup });
  return signup;
}

function fillForm({
  email,
  password,
  confirm,
  username,
}: {
  email: string;
  password: string;
  confirm: string;
  username?: string;
}) {
  if (username !== undefined) {
    fireEvent.change(screen.getByLabelText(/Username/i), {
      target: { value: username },
    });
  }
  fireEvent.change(screen.getByLabelText(/^Email/i), {
    target: { value: email },
  });
  fireEvent.change(screen.getByLabelText(/^Password/i), {
    target: { value: password },
  });
  fireEvent.change(screen.getByLabelText(/Verify password/i), {
    target: { value: confirm },
  });
}

describe("SignupPageClient", () => {
  it("renders all signup fields", () => {
    setupAuth();
    render(<SignupPageClient />);
    expect(screen.getByLabelText(/Username/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^Password/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Verify password/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Create account/i }),
    ).toBeInTheDocument();
  });

  it("blocks submission when passwords do not match", () => {
    const signup = setupAuth(vi.fn());
    render(<SignupPageClient />);
    fillForm({
      email: "a@b.com",
      password: "pw-12345",
      confirm: "different",
    });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    expect(screen.getByText(/Passwords do not match/i)).toBeInTheDocument();
    expect(signup).not.toHaveBeenCalled();
  });

  it("creates an account and navigates to the next path with username", async () => {
    const signup = setupAuth(vi.fn().mockResolvedValue(undefined));
    __setSearchParams("next=/leaderboard");
    render(<SignupPageClient />);
    fillForm({
      email: "alice@example.com",
      password: "pw-12345",
      confirm: "pw-12345",
      username: "alice",
    });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    await waitFor(() => expect(signup).toHaveBeenCalled());
    expect(signup).toHaveBeenCalledWith(
      "alice@example.com",
      "pw-12345",
      "alice",
    );
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/leaderboard"),
    );
  });

  it("submits without a username when none provided and defaults to /game/length", async () => {
    const signup = setupAuth(vi.fn().mockResolvedValue(undefined));
    render(<SignupPageClient />);
    fillForm({ email: "a@b.com", password: "pw-12345", confirm: "pw-12345" });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    await waitFor(() => expect(signup).toHaveBeenCalled());
    expect(signup).toHaveBeenCalledWith("a@b.com", "pw-12345", undefined);
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/game/length"),
    );
  });

  it("renders the API error from a rejected signup", async () => {
    setupAuth(vi.fn().mockRejectedValue(new Error("Email already in use")));
    render(<SignupPageClient />);
    fillForm({ email: "a@b.com", password: "pw-12345", confirm: "pw-12345" });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    expect(await screen.findByText(/Email already in use/i)).toBeInTheDocument();
  });

  it("falls back to a generic message when the thrown error is not an Error", async () => {
    setupAuth(vi.fn().mockRejectedValue("nope"));
    render(<SignupPageClient />);
    fillForm({ email: "a@b.com", password: "pw-12345", confirm: "pw-12345" });
    fireEvent.click(screen.getByRole("button", { name: /Create account/i }));
    expect(await screen.findByText(/Sign up failed/i)).toBeInTheDocument();
  });
});

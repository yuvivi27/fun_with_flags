import { act, render, renderHook, waitFor } from "@testing-library/react";
import { setDoc } from "firebase/firestore";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthProvider, useAuth, type AuthUser } from "./auth-context";

const setDocMock = vi.mocked(setDoc);

function jsonResponse(
  data: unknown,
  init: { status?: number; headers?: Record<string, string> } = {},
): Response {
  return new Response(JSON.stringify(data), {
    status: init.status ?? 200,
    headers: { "Content-Type": "application/json", ...(init.headers ?? {}) },
  });
}

function bodyOf(call: unknown[]): Record<string, unknown> | undefined {
  const init = call[1] as RequestInit | undefined;
  if (!init?.body) return undefined;
  return JSON.parse(init.body as string) as Record<string, unknown>;
}

function authHeaders(call: unknown[]): Record<string, string> {
  const init = call[1] as RequestInit | undefined;
  return (init?.headers ?? {}) as Record<string, string>;
}

const baseUser: AuthUser = {
  id: "user-1",
  email: "alice@example.com",
  username: "alice",
  totalXp: 100,
  currentLevel: 1,
  xpToNextLevel: 300,
  xpRequiredForNextLevel: 400,
};

type RefHolder = { current: ReturnType<typeof useAuth> | null };

function captureAuth() {
  const ref: RefHolder = { current: null };
  function Capture() {
    ref.current = useAuth();
    return null;
  }
  return { ref, Capture };
}

function renderProvider(children?: ReactNode) {
  const { ref, Capture } = captureAuth();
  const utils = render(
    <AuthProvider>
      {children}
      <Capture />
    </AuthProvider>,
  );
  return { ref, ...utils };
}

beforeEach(() => {
  setDocMock.mockClear();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useAuth guard", () => {
  it("throws when called outside the provider", () => {
    const renderOutside = () => renderHook(() => useAuth());
    expect(renderOutside).toThrowError("useAuth must be used inside AuthProvider");
  });
});

describe("AuthProvider bootstrap", () => {
  it("settles to non-loading with null user when there is no stored token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current?.user).toBeNull();
    expect(ref.current?.token).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("hydrates the user from /auth/me when a token is stored", async () => {
    window.localStorage.setItem("flags_auth_token", "stored-token");
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse(baseUser));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();

    await waitFor(() => expect(ref.current?.user?.email).toBe(baseUser.email));
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0]![0]).toBe("http://127.0.0.1:3001/auth/me");
    expect(authHeaders(fetchMock.mock.calls[0]!).Authorization).toBe(
      "Bearer stored-token",
    );
    expect(ref.current?.token).toBe("stored-token");
  });

  it("clears the stored token when /auth/me fails on bootstrap", async () => {
    window.localStorage.setItem("flags_auth_token", "stale-token");
    const fetchMock = vi.fn().mockResolvedValue(
      jsonResponse({ message: "Invalid token" }, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();

    await waitFor(() => expect(ref.current?.loading).toBe(false));
    expect(ref.current?.user).toBeNull();
    expect(ref.current?.token).toBeNull();
    expect(window.localStorage.getItem("flags_auth_token")).toBeNull();
  });
});

describe("login", () => {
  it("persists the token, sets the user, and syncs to Firestore", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ accessToken: "fresh-token", user: baseUser }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });

    expect(ref.current?.user?.email).toBe(baseUser.email);
    expect(ref.current?.token).toBe("fresh-token");
    expect(window.localStorage.getItem("flags_auth_token")).toBe("fresh-token");
    expect(fetchMock).toHaveBeenLastCalledWith(
      "http://127.0.0.1:3001/auth/login",
      expect.objectContaining({ method: "POST" }),
    );
    expect(bodyOf(fetchMock.mock.calls.at(-1)!)).toEqual({
      email: "alice@example.com",
      password: "pw-12345",
    });

    await waitFor(() => expect(setDocMock).toHaveBeenCalledTimes(1));
    const setDocPayload = setDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(setDocPayload.userId).toBe(baseUser.id);
    expect(setDocPayload.totalXP).toBe(baseUser.totalXp);
    expect(setDocPayload.username).toBe(baseUser.username);
  });

  it("falls back to email handle when username is missing", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({
        accessToken: "tok",
        user: { ...baseUser, username: null },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });

    await waitFor(() => expect(setDocMock).toHaveBeenCalled());
    const payload = setDocMock.mock.calls[0]![1] as Record<string, unknown>;
    expect(payload.username).toBe("alice");
  });

  it("rethrows API error messages with a friendly Error", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ message: "Invalid email or password" }, { status: 401 }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.login("alice@example.com", "wrong"),
    ).rejects.toThrow("Invalid email or password");
  });
});

describe("signup", () => {
  it("submits without username when none given and persists the session", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ accessToken: "new-tok", user: baseUser }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await act(async () => {
      await ref.current!.signup("alice@example.com", "pw-12345");
    });

    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({
      email: "alice@example.com",
      password: "pw-12345",
    });
    expect(ref.current?.token).toBe("new-tok");
  });

  it("includes the username when provided", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ accessToken: "new-tok", user: baseUser }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await act(async () => {
      await ref.current!.signup("alice@example.com", "pw-12345", "alice");
    });

    expect(bodyOf(fetchMock.mock.calls[0]!)).toEqual({
      email: "alice@example.com",
      password: "pw-12345",
      username: "alice",
    });
  });

  it("rethrows array validation messages joined with commas", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse(
        { message: ["email must be valid", "password too short"] },
        { status: 400 },
      ),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.signup("bad", "short"),
    ).rejects.toThrow("email must be valid, password too short");
  });
});

describe("logout", () => {
  it("clears the user and removes the stored token", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(
      jsonResponse({ accessToken: "tok", user: baseUser }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });
    expect(window.localStorage.getItem("flags_auth_token")).toBe("tok");

    act(() => ref.current!.logout());
    expect(ref.current?.user).toBeNull();
    expect(ref.current?.token).toBeNull();
    expect(window.localStorage.getItem("flags_auth_token")).toBeNull();
  });
});

describe("refreshUser", () => {
  it("clears the user when there is no token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await act(async () => {
      await ref.current!.refreshUser();
    });
    expect(ref.current?.user).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("refetches /auth/me and updates the user", async () => {
    const updatedUser: AuthUser = { ...baseUser, totalXp: 500, currentLevel: 2 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: "tok", user: baseUser }))
      .mockResolvedValueOnce(jsonResponse(updatedUser));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });

    await act(async () => {
      await ref.current!.refreshUser();
    });

    expect(ref.current?.user?.totalXp).toBe(500);
    const lastCall = fetchMock.mock.calls.at(-1)!;
    expect(lastCall[0]).toBe("http://127.0.0.1:3001/auth/me");
    expect(authHeaders(lastCall).Authorization).toBe("Bearer tok");
  });

  it("clears the session when refreshing fails", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: "tok", user: baseUser }))
      .mockResolvedValueOnce(jsonResponse({ message: "nope" }, { status: 401 }));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });

    await act(async () => {
      await ref.current!.refreshUser();
    });

    expect(ref.current?.user).toBeNull();
    expect(ref.current?.token).toBeNull();
  });
});

describe("completeRound", () => {
  it("throws when there is no token", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.completeRound({ score: 10, correct: 1, total: 5 }),
    ).rejects.toThrow("Missing auth token");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts the round, syncs Firestore, and triggers a refresh", async () => {
    const updated: AuthUser = { ...baseUser, totalXp: 250 };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ accessToken: "tok", user: baseUser }))
      .mockResolvedValueOnce(jsonResponse({ user: updated, gainedXp: 150 }))
      .mockResolvedValueOnce(jsonResponse(updated));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));
    await act(async () => {
      await ref.current!.login("alice@example.com", "pw-12345");
    });

    let result: { gainedXp: number } | undefined;
    await act(async () => {
      result = await ref.current!.completeRound({
        score: 150,
        correct: 5,
        total: 10,
      });
    });

    expect(result?.gainedXp).toBe(150);
    expect(fetchMock).toHaveBeenCalledTimes(3);
    const completeCall = fetchMock.mock.calls[1]!;
    expect(completeCall[0]).toBe("http://127.0.0.1:3001/games/complete-round");
    expect(authHeaders(completeCall).Authorization).toBe("Bearer tok");
    expect(bodyOf(completeCall)).toEqual({ score: 150, correct: 5, total: 10 });
    expect(setDocMock).toHaveBeenCalled();
    expect(ref.current?.user?.totalXp).toBe(250);
  });
});

describe("requestJson edge cases", () => {
  it("translates AbortError into a friendly server-warming message", async () => {
    const abort = new DOMException("aborted", "AbortError");
    const fetchMock = vi.fn().mockRejectedValueOnce(abort);
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.login("a@b.com", "pw-12345"),
    ).rejects.toThrow(/server is taking too long/i);
  });

  it("falls back to the status code when the error body is not JSON", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response("oops", { status: 502 }));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.login("a@b.com", "pw-12345"),
    ).rejects.toThrow("Request failed (502)");
  });

  it("rethrows non-DOMException fetch failures verbatim", async () => {
    const fetchMock = vi.fn().mockRejectedValueOnce(new Error("network broke"));
    vi.stubGlobal("fetch", fetchMock);

    const { ref } = renderProvider();
    await waitFor(() => expect(ref.current?.loading).toBe(false));

    await expect(
      ref.current!.login("a@b.com", "pw-12345"),
    ).rejects.toThrow("network broke");
  });
});

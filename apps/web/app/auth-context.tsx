"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Capacitor } from "@capacitor/core";
import { doc, serverTimestamp, setDoc } from "firebase/firestore";
import { db } from "../firebaseConfig";

const TOKEN_KEY = "flags_auth_token";

function resolveApiBaseUrl(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }
  if (Capacitor.isNativePlatform()) {
    // Android emulator loopback to host machine.
    if (Capacitor.getPlatform() === "android") return "http://10.0.2.2:3001";
    return "http://127.0.0.1:3001";
  }
  return "http://127.0.0.1:3001";
}

export type AuthUser = {
  id: string;
  email: string;
  username: string | null;
  totalXp: number;
  currentLevel: number;
  xpToNextLevel: number;
  xpRequiredForNextLevel: number;
};

type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

type FirebasePlayerSyncInput = {
  id: string;
  email: string;
  username: string | null;
  totalXp: number;
  currentLevel: number;
};

type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, username?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  completeRound: (payload: {
    score: number;
    correct: number;
    total: number;
  }) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function getErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) return "Unexpected error";
  return error.message;
}

function calculateLevelFromXp(totalXp: number): number {
  const BASE_LEVEL_XP = 400;
  const LEVEL_MULTIPLIER = 1.5;
  let level = 1;
  let remaining = Math.max(0, Math.floor(totalXp));
  let requirement = Math.round(BASE_LEVEL_XP * LEVEL_MULTIPLIER ** (level - 1));

  while (remaining >= requirement) {
    remaining -= requirement;
    level += 1;
    requirement = Math.round(BASE_LEVEL_XP * LEVEL_MULTIPLIER ** (level - 1));
  }

  return level;
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const apiBaseUrl = resolveApiBaseUrl();
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });

  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const data = (await response.json()) as { message?: string | string[] };
      if (Array.isArray(data.message)) {
        message = data.message.join(", ");
      } else if (typeof data.message === "string") {
        message = data.message;
      }
    } catch {
      // Ignore JSON parse errors and keep fallback message.
    }
    throw new Error(message);
  }

  return (await response.json()) as T;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const persistToken = useCallback((value: string | null) => {
    setToken(value);
    if (typeof window === "undefined") return;
    if (!value) {
      window.localStorage.removeItem(TOKEN_KEY);
      return;
    }
    window.localStorage.setItem(TOKEN_KEY, value);
  }, []);

  const syncUserToFirebase = useCallback(async (player: FirebasePlayerSyncInput) => {
    const leveledValue = calculateLevelFromXp(player.totalXp);
    const currentLevel =
      leveledValue !== player.currentLevel ? leveledValue : player.currentLevel;

    await setDoc(
      doc(db, "players", player.id),
      {
        userId: player.id,
        email: player.email,
        username:
          player.username && player.username.trim().length > 0
            ? player.username
            : player.email.split("@")[0] ?? "Player",
        totalXP: player.totalXp,
        currentLevel,
        updatedAt: serverTimestamp(),
      },
      { merge: true },
    );
  }, []);

  const refreshUser = useCallback(async () => {
    if (!token) {
      setUser(null);
      return;
    }

    try {
      const me = await requestJson<AuthUser>("/auth/me", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setUser(me);
    } catch {
      persistToken(null);
      setUser(null);
    }
  }, [persistToken, token]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(TOKEN_KEY);
    if (!stored) {
      setLoading(false);
      return;
    }

    setToken(stored);
    requestJson<AuthUser>("/auth/me", {
      headers: { Authorization: `Bearer ${stored}` },
    })
      .then((me) => setUser(me))
      .catch(() => {
        window.localStorage.removeItem(TOKEN_KEY);
        setToken(null);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!token) return;
    void refreshUser();
  }, [refreshUser, token]);

  const login = useCallback(
    async (email: string, password: string) => {
      const data = await requestJson<AuthResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });
      persistToken(data.accessToken);
      setUser(data.user);
      await syncUserToFirebase(data.user);
    },
    [persistToken, syncUserToFirebase],
  );

  const signup = useCallback(
    async (email: string, password: string, username?: string) => {
      const payload = username
        ? { email, password, username }
        : { email, password };
      const data = await requestJson<AuthResponse>("/auth/signup", {
        method: "POST",
        body: JSON.stringify(payload),
      });
      persistToken(data.accessToken);
      setUser(data.user);
      await syncUserToFirebase(data.user);
    },
    [persistToken, syncUserToFirebase],
  );

  const logout = useCallback(() => {
    persistToken(null);
    setUser(null);
  }, [persistToken]);

  const completeRound = useCallback(
    async (payload: { score: number; correct: number; total: number }) => {
      if (!token) {
        throw new Error("Missing auth token");
      }
      const result = await requestJson<{ user: AuthUser; gainedXp: number }>(
        "/games/complete-round",
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: JSON.stringify(payload),
        },
      );

      await syncUserToFirebase(result.user);
      await refreshUser();
    },
    [refreshUser, syncUserToFirebase, token],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      loading,
      login: async (email, password) => {
        try {
          await login(email, password);
        } catch (error) {
          throw new Error(getErrorMessage(error));
        }
      },
      signup: async (email, password, username) => {
        try {
          await signup(email, password, username);
        } catch (error) {
          throw new Error(getErrorMessage(error));
        }
      },
      logout,
      refreshUser,
      completeRound,
    }),
    [completeRound, loading, login, logout, refreshUser, signup, token, user],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}

"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, token, loading, refreshUser, logout } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user || token) return;
    const query =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).toString()
        : "";
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(next || "/game/length")}`);
  }, [loading, pathname, router, token, user]);

  if (loading) {
    return (
      <div
        style={{
          minHeight: "45svh",
          display: "grid",
          placeItems: "center",
          padding: "1rem",
          textAlign: "center",
        }}
      >
        <p style={{ opacity: 0.85 }}>
          Checking your session. If this takes too long, the backend may be waking
          up.
        </p>
      </div>
    );
  }

  if (user) return <>{children}</>;

  if (token) {
    return (
      <div
        style={{
          minHeight: "45svh",
          display: "grid",
          placeItems: "center",
          padding: "1rem",
          textAlign: "center",
          gap: "0.75rem",
        }}
      >
        <p style={{ margin: 0, opacity: 0.9 }}>
          We could not restore your session yet. The API may still be starting.
        </p>
        <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
          <button type="button" onClick={() => void refreshUser()}>
            Retry now
          </button>
          <button type="button" onClick={logout}>
            Sign out
          </button>
        </div>
      </div>
    );
  }

  return null;
}

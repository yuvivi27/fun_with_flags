"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "./auth-context";

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading || user) return;
    const query =
      typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).toString()
        : "";
    const next = query ? `${pathname}?${query}` : pathname;
    router.replace(`/login?next=${encodeURIComponent(next || "/game/length")}`);
  }, [loading, pathname, router, user]);

  if (loading || !user) return null;
  return <>{children}</>;
}

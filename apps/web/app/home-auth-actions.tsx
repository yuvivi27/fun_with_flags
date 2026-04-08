"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useAuth } from "./auth-context";

export function HomeAuthActions() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Link
        className={`${styles.menuButton} ${styles.menuButtonSecondary}`}
        href="/login"
      >
        Login / Signup
      </Link>
    );
  }

  return (
    <>
      <div className={styles.profileHud} aria-live="polite">
        <strong>{user.username ?? user.email}</strong>
        <span>
          Level {user.currentLevel} · XP {user.totalXp}
        </span>
        <span>Next level in {user.xpToNextLevel} XP</span>
      </div>
      <button
        type="button"
        className={`${styles.menuButton} ${styles.menuButtonSecondary}`}
        onClick={logout}
        aria-label="Sign out"
      >
        Sign out
      </button>
    </>
  );
}

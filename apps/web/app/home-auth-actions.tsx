"use client";

import Link from "next/link";
import styles from "./page.module.css";
import { useAuth } from "./auth-context";
import { progressFromTotalXp } from "@repo/player-leveling";

export function HomeAuthActions() {
  const { user, logout } = useAuth();

  if (!user) {
    return (
      <Link
        className={styles.cornerAuthButton}
        href="/login"
      >
        Login / Signup
      </Link>
    );
  }

  const progress = progressFromTotalXp(user.totalXp);
  const xpRequired = Math.max(1, progress.xpRequiredForNextLevel);
  const xpRemaining = Math.min(Math.max(progress.xpToNextLevel, 0), xpRequired);
  const xpProgress = Math.max(0, xpRequired - xpRemaining);
  const progressPercent = Math.round((xpProgress / xpRequired) * 100);

  return (
    <div className={styles.cornerAuthGroup}>
      <div className={styles.cornerAuthProgress} aria-live="polite">
        <span className={styles.cornerAuthLevel}>{`Lv ${progress.currentLevel}`}</span>
        <div
          className={styles.cornerAuthXpTrack}
          role="progressbar"
          aria-label="Level progress"
          aria-valuemin={0}
          aria-valuemax={xpRequired}
          aria-valuenow={xpProgress}
          aria-valuetext={`${xpProgress} of ${xpRequired} XP to next level`}
        >
          <span
            className={styles.cornerAuthXpFill}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
        <span className={styles.cornerAuthXpText}>{`${xpRemaining} XP left`}</span>
      </div>
      <button
        type="button"
        className={styles.cornerAuthButton}
        onClick={logout}
        aria-label="Sign out"
      >
        Sign out
      </button>
    </div>
  );
}

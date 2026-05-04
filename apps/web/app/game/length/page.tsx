"use client";

import Link from "next/link";
import { useAuth } from "../../auth-context";
import { effectivePlayerLevelFromUser } from "@repo/player-leveling";
import styles from "./length.module.css";
import {
  GAME_LENGTH_LEVEL_REQUIREMENTS,
  GAME_LENGTH_OPTIONS,
  isGameLengthUnlocked,
} from "../config";

export default function GameLengthPage() {
  const { user } = useAuth();
  const playerLevel = effectivePlayerLevelFromUser(user);

  return (
    <div className={styles.pageLength}>
      <main className={styles.mainLength}>
        <h1 className={styles.title}>GAME LENGTH</h1>
        <p className={styles.subtitle}>
          How many flags in this round? You&apos;ll get up to this many unique
          countries.
        </p>
        <nav className={styles.lengthStack} aria-label="Choose game length">
          {GAME_LENGTH_OPTIONS.map((n) => {
            const unlocked = isGameLengthUnlocked(n, playerLevel);
            const requirement = GAME_LENGTH_LEVEL_REQUIREMENTS[n];

            if (unlocked) {
              return (
                <Link
                  key={n}
                  className={styles.lengthButton}
                  href={`/game?count=${n}`}
                >
                  {n} Questions
                </Link>
              );
            }

            return (
              <button
                key={n}
                type="button"
                className={`${styles.lengthButton} ${styles.lengthButtonLocked}`}
                disabled
                aria-label={`${n} questions locked until level ${requirement}`}
                title={`Unlocked at level ${requirement}`}
              >
                {`🔒 ${n} Questions (Lv ${requirement})`}
              </button>
            );
          })}
          <Link className={styles.backButton} href="/">
            ← Back to menu
          </Link>
        </nav>
      </main>
    </div>
  );
}

import Link from "next/link";
import styles from "../../page.module.css";
import { GAME_LENGTH_OPTIONS } from "../config";

export default function GameLengthPage() {
  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${styles.screenEnter}`}>
        <h1 className={styles.heroTitle}>Game length</h1>
        <p className={styles.heroSubtitle}>
          How many flags in this round? You&apos;ll get up to this many unique
          countries.
        </p>
        <nav className={styles.menuStack} aria-label="Choose game length">
          {GAME_LENGTH_OPTIONS.map((n) => (
            <Link
              key={n}
              className={`${styles.menuButton} ${styles.menuButtonPrimary}`}
              href={`/game?count=${n}`}
            >
              {n} Questions
            </Link>
          ))}
          <Link
            className={`${styles.menuButton} ${styles.menuButtonBack}`}
            href="/"
          >
            ← Back to menu
          </Link>
        </nav>
      </main>
    </div>
  );
}

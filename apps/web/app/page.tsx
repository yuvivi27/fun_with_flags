import Link from "next/link";
import styles from "./page.module.css";
import { HomeAuthActions } from "./home-auth-actions";

export default function Home() {
  return (
    <div className={styles.page}>
      <main className={styles.main}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export uses public asset directly */}
        <img
          className={styles.brandLogoCentered}
          src="/flags_logo.png"
          alt="Fun With Flags logo"
          width={608}
          height={539}
        />
        <h1 className={styles.heroTitle}>Fun With Flags</h1>
        <p className={styles.heroSubtitle}>
          Mastering world flags has never been so clever and fun.
        </p>
        <nav className={styles.menuStack} aria-label="Main menu">
          <Link
            className={`${styles.menuButton} ${styles.menuButtonPrimary}`}
            href="/game/length"
          >
            Start game
          </Link>
          <Link
            className={`${styles.menuButton} ${styles.menuButtonPrimary}`}
            href="/leaderboard"
          >
            Leaderboard
          </Link>
          <Link
            className={`${styles.menuButton} ${styles.menuButtonPrimary}`}
            href="/about"
          >
            About
          </Link>
          <HomeAuthActions />
        </nav>
      </main>
    </div>
  );
}

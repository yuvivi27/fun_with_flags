import Link from "next/link";
import styles from "./page.module.css";
import { HomeAuthActions } from "./home-auth-actions";

export default function Home() {
  return (
    <div className={`${styles.page} ${styles.homePage}`}>
      <main className={`${styles.main} ${styles.homeMain}`}>
        <h1 className={styles.srOnly}>Fun With Flags</h1>
        <div className={styles.homeCornerAuth}>
          <HomeAuthActions />
        </div>
        <nav className={styles.homeNav} aria-label="Main menu">
          <Link className={styles.playButton} href="/game/length">
            PLAY <span aria-hidden>▶</span>
          </Link>
          <div className={styles.homeMetaRow}>
            <Link className={styles.metaButton} href="/leaderboard">
              <span className={styles.metaIconTrophy} aria-hidden>
                🏆
              </span>
              <span>LEADERBOARD</span>
            </Link>
            <Link className={styles.metaButton} href="/about">
              <span className={styles.metaIconQuestion} aria-hidden>
                ?
              </span>
              <span>ABOUT</span>
            </Link>
          </div>
        </nav>
      </main>
    </div>
  );
}

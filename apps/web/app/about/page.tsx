import Link from "next/link";
import styles from "../page.module.css";

export default function AboutPage() {
  return (
    <div className={styles.page}>
      <main className={`${styles.main} ${styles.aboutMain}`}>
        {/* eslint-disable-next-line @next/next/no-img-element -- static export uses public asset directly */}
        <img
          className={styles.brandLogoCentered}
          src="/flags_logo.png"
          alt="Fun With Flags logo"
          width={608}
          height={539}
        />
        <h1 className={styles.heroTitle}>About the Developer</h1>
        <p className={styles.aboutBodyLegend}>
          Yuval Gershon is the developer of this application. You can contact
          Yuval for inquiries or professional networking via{" "}
          <Link
            href="https://www.linkedin.com/in/yuvalgershon/"
            target="_blank"
            rel="noreferrer"
          >
            LinkedIn
          </Link>
          .
        </p>
        <div className={styles.aboutLinkWrap}>
          <Link
            className={`${styles.menuButton} ${styles.menuButtonPrimary} ${styles.linkedInButton}`}
            href="https://www.linkedin.com/in/yuvalgershon/"
            target="_blank"
            rel="noreferrer"
            aria-label="Connect with Yuval Gershon on LinkedIn"
          >
            Connect on LinkedIn
          </Link>
        </div>
        <div className={styles.menuStack}>
          <Link
            className={`${styles.menuButton} ${styles.menuButtonBack}`}
            href="/"
          >
            ← Back to menu
          </Link>
        </div>
      </main>
    </div>
  );
}

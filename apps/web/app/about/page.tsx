import Link from "next/link";
import styles from "./about.module.css";

export default function AboutPage() {
  return (
    <div className={styles.pageAbout}>
      <main className={styles.mainAbout}>
        <h1 className={styles.title}>ABOUT THE DEVELOPER</h1>
        <p className={styles.aboutBody}>
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
        <div className={styles.actionRow}>
          <Link className={styles.secondaryButton} href="/">
            ← Back to menu
          </Link>
        </div>
      </main>
    </div>
  );
}

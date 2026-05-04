"use client";

import type { CSSProperties } from "react";
import { useLayoutEffect, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./game.module.css";

const EFFECTS_MS = 2000;

const CONFETTI_COLORS = [
  "#7ae8ff",
  "#ffd447",
  "#ff6ec7",
  "#a78bfa",
  "#6ee7b7",
  "#f472b6",
];

type LevelUpCelebrationProps = {
  level: number;
  unlockLines: string[];
  onContinue: () => void;
};

export function LevelUpCelebration({
  level,
  unlockLines,
  onContinue,
}: LevelUpCelebrationProps) {
  const [effectsDone, setEffectsDone] = useState(false);

  useLayoutEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) {
      setEffectsDone(true);
      return;
    }
    const id = window.setTimeout(() => setEffectsDone(true), EFFECTS_MS);
    return () => window.clearTimeout(id);
  }, []);

  const overlay = (
    <div
      className={styles.levelUpOverlay}
      role="dialog"
      aria-modal="true"
      aria-labelledby="level-up-title"
    >
      <div
        className={`${styles.fireworksLayer} ${effectsDone ? styles.levelUpEffectsDone : ""}`}
        aria-hidden
      >
        {Array.from({ length: 24 }, (_, i) => (
          <span
            key={i}
            className={styles.fireworkBurst}
            style={
              {
                "--fx": `${6 + ((i * 17) % 88)}%`,
                "--fdelay": `${(i % 9) * 0.07}s`,
                "--frot": `${(i * 47) % 360}deg`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div
        className={`${styles.confettiLayer} ${effectsDone ? styles.levelUpEffectsDone : ""}`}
        aria-hidden
      >
        {Array.from({ length: 42 }, (_, i) => (
          <span
            key={`c-${i}`}
            className={styles.confettiPiece}
            style={
              {
                "--cx": `${(i * 23) % 100}%`,
                "--cdelay": `${(i % 14) * 0.035}s`,
                "--ccolor": CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
                "--crot": `${(i * 41) % 360}deg`,
                "--cdrift": `${(((i * 11) % 19) - 9) * 0.28}rem`,
              } as CSSProperties
            }
          />
        ))}
      </div>
      <div className={styles.levelUpCard}>
        <p className={styles.levelUpKicker}>LEVEL UP</p>
        <h2 id="level-up-title" className={styles.levelUpTitle}>
          You reached level {level}
        </h2>
        {unlockLines.length > 0 ? (
          <>
            <p className={styles.levelUpSub}>New for you:</p>
            <ul className={styles.levelUpList}>
              {unlockLines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          </>
        ) : (
          <p className={styles.levelUpSubMuted}>
            Keep playing to unlock longer rounds and more flags.
          </p>
        )}
        <button
          type="button"
          className={`${styles.option} ${styles.levelUpContinue}`}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );

  if (typeof document === "undefined") {
    return null;
  }

  return createPortal(overlay, document.body);
}

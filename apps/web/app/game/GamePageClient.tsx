"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "../auth-context";
import { effectivePlayerLevelFromUser } from "@repo/player-leveling";
import styles from "../page.module.css";
import { isGameLengthUnlocked, parseRequestedQuestionCount } from "./config";
import { QuizClient } from "./quiz-client";

export default function GamePageClient() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const playerLevel = effectivePlayerLevelFromUser(user);

  const requestedCount = useMemo(() => {
    const raw = searchParams?.get("count") ?? undefined;
    return parseRequestedQuestionCount(raw);
  }, [searchParams]);
  const hasUnlockedCount = useMemo(
    () =>
      requestedCount !== null && isGameLengthUnlocked(requestedCount, playerLevel),
    [playerLevel, requestedCount],
  );

  useEffect(() => {
    if (loading) return;
    if (requestedCount === null || !hasUnlockedCount) {
      router.replace("/game/length");
    }
  }, [hasUnlockedCount, loading, requestedCount, router]);

  if (loading) return null;
  if (requestedCount === null || !hasUnlockedCount) return null;

  return (
    <div className={`${styles.page} ${styles.pageGame}`}>
      <main
        className={`${styles.main} ${styles.mainGame} ${styles.screenEnter}`}
      >
        <QuizClient requestedQuestionCount={requestedCount} />
      </main>
    </div>
  );
}


"use client";

import { useEffect, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import styles from "../page.module.css";
import { parseRequestedQuestionCount } from "./config";
import { QuizClient } from "./quiz-client";

export default function GamePageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const requestedCount = useMemo(() => {
    const raw = searchParams?.get("count") ?? undefined;
    return parseRequestedQuestionCount(raw);
  }, [searchParams]);

  useEffect(() => {
    if (requestedCount === null) {
      router.replace("/game/length");
    }
  }, [requestedCount, router]);

  if (requestedCount === null) return null;

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


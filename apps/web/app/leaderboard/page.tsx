"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  collection,
  getCountFromServer,
  getDocs,
  limit,
  orderBy,
  query,
  where,
} from "firebase/firestore";
import pageStyles from "../page.module.css";
import { useAuth } from "../auth-context";
import { db } from "../../firebaseConfig";
import styles from "./leaderboard.module.css";

type LeaderboardEntry = {
  rank: number;
  id: string;
  username: string;
  totalXp: number;
  currentLevel: number;
};

type LeaderboardResponse = {
  topTen: LeaderboardEntry[];
  currentUser: LeaderboardEntry;
};

function mockLeaderboard(currentUser: LeaderboardEntry): LeaderboardResponse {
  const sample: LeaderboardEntry[] = Array.from({ length: 10 }, (_, index) => {
    const rank = index + 1;
    const totalXp = 3800 - index * 210;
    return {
      rank,
      id: `mock-player-${rank}`,
      username: `Player${rank}`,
      totalXp,
      currentLevel: Math.max(1, Math.floor(totalXp / 450) + 1),
    };
  });

  return {
    topTen: sample,
    currentUser,
  };
}

async function fetchTopPlayers(
  currentUser: LeaderboardEntry,
): Promise<LeaderboardResponse> {
  const topPlayersQuery = query(
    collection(db, "players"),
    orderBy("totalXP", "desc"),
    limit(10),
  );
  const snapshot = await getDocs(topPlayersQuery);
  const topTen: LeaderboardEntry[] = snapshot.docs.map((playerDoc, index) => {
    const data = playerDoc.data() as {
      userId?: string;
      username?: string;
      totalXP?: number;
      currentLevel?: number;
    };

    return {
      rank: index + 1,
      id: data.userId ?? playerDoc.id,
      username: data.username ?? `Player ${index + 1}`,
      totalXp: data.totalXP ?? 0,
      currentLevel: data.currentLevel ?? 1,
    };
  });

  const inTopTen = topTen.find((entry) => entry.id === currentUser.id);
  if (inTopTen) {
    return {
      topTen,
      currentUser: inTopTen,
    };
  }

  // Rank users by totalXP. Ties share the same offset-based bucket here.
  const usersAheadQuery = query(
    collection(db, "players"),
    where("totalXP", ">", currentUser.totalXp),
  );
  const usersAheadSnapshot = await getCountFromServer(usersAheadQuery);

  return {
    topTen,
    currentUser: {
      ...currentUser,
      rank: usersAheadSnapshot.data().count + 1,
    },
  };
}

function rankBadge(rank: number) {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `${rank}.`;
}

export default function LeaderboardPage() {
  const { user, token } = useAuth();
  const [data, setData] = useState<LeaderboardResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fallbackCurrentUser = useMemo<LeaderboardEntry>(
    () => ({
      rank: 14,
      id: user?.id ?? "current-user",
      username: user?.username ?? user?.email ?? "You",
      totalXp: user?.totalXp ?? 0,
      currentLevel: user?.currentLevel ?? 1,
    }),
    [user],
  );

  useEffect(() => {
    if (!token || !user) {
      setLoading(false);
      setError("Missing auth token");
      return;
    }

    setLoading(true);
    setError(null);

    // Old PostgreSQL leaderboard fetch kept for rollback:
    // fetchLeaderboard(token)
    fetchTopPlayers(fallbackCurrentUser)
      .then((payload) => setData(payload))
      .catch(() => {
        setData(mockLeaderboard(fallbackCurrentUser));
        setError("Using fallback leaderboard data (Firestore unavailable).");
      })
      .finally(() => setLoading(false));
  }, [fallbackCurrentUser, token, user]);

  return (
    <div className={`${pageStyles.page} ${styles.pageLeaderboard}`}>
      <main className={`${pageStyles.main} ${styles.mainLeaderboard}`}>
        <h1 className={pageStyles.heroTitle}>Leaderboard</h1>
        <p className={pageStyles.heroSubtitle}>
          Top 10 players by total XP across all games.
        </p>

        {loading ? (
          <div className={styles.stateCard}>Loading leaderboard...</div>
        ) : (
          <section className={styles.boardCard} aria-label="Top players">
            {error ? <p className={styles.notice}>{error}</p> : null}
            <div className={styles.boardHeader}>
              <span>Rank</span>
              <span>Player</span>
              <span>XP</span>
              <span>Level</span>
            </div>
            <ol className={styles.boardList}>
              {(data?.topTen ?? []).map((entry) => (
                <li
                  key={entry.id}
                  className={`${styles.boardRow} ${
                    entry.rank <= 3 ? styles[`top${entry.rank}`] : ""
                  }`}
                >
                  <span className={styles.rankCell}>{rankBadge(entry.rank)}</span>
                  <span className={styles.nameCell}>{entry.username}</span>
                  <span className={styles.xpCell}>{entry.totalXp}</span>
                  <span className={styles.levelCell}>Lv {entry.currentLevel}</span>
                </li>
              ))}
            </ol>
          </section>
        )}

        <Link
          className={`${pageStyles.menuButton} ${pageStyles.menuButtonSecondary}`}
          href="/"
        >
          Back to Main
        </Link>
      </main>

      <aside className={styles.currentUserFooter} aria-label="Your current rank">
        <strong>Your placement</strong>
        <div className={styles.currentUserGrid}>
          <span>Rank #{data?.currentUser.rank ?? fallbackCurrentUser.rank}</span>
          <span>XP {data?.currentUser.totalXp ?? fallbackCurrentUser.totalXp}</span>
          <span>Level {data?.currentUser.currentLevel ?? fallbackCurrentUser.currentLevel}</span>
        </div>
      </aside>
    </div>
  );
}

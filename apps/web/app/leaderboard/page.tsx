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
import { useAuth } from "../auth-context";
import {
  effectivePlayerLevelFromUser,
  levelFromTotalXp,
} from "@repo/player-leveling";
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
      currentLevel: levelFromTotalXp(totalXp),
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

    const totalXp = data.totalXP ?? 0;
    return {
      rank: index + 1,
      id: data.userId ?? playerDoc.id,
      username: data.username ?? `Player ${index + 1}`,
      totalXp,
      currentLevel: levelFromTotalXp(totalXp),
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
      currentLevel: effectivePlayerLevelFromUser(user),
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

    fetchTopPlayers(fallbackCurrentUser)
      .then((payload) => setData(payload))
      .catch(() => {
        setData(mockLeaderboard(fallbackCurrentUser));
        setError("Using fallback leaderboard data (Firestore unavailable).");
      })
      .finally(() => setLoading(false));
  }, [fallbackCurrentUser, token, user]);

  return (
    <div className={styles.pageLeaderboard}>
      <main className={styles.mainLeaderboard}>
        <h1 className={styles.title}>LEADERBOARD</h1>

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

            <div className={styles.yourPlacementBlock} aria-label="Your placement">
              <p className={styles.yourPlacementLabel}>YOUR PLACEMENT</p>
              <div className={`${styles.boardRow} ${styles.currentUserRow}`}>
                <span className={styles.rankCell}>
                  #{data?.currentUser.rank ?? fallbackCurrentUser.rank}
                </span>
                <span className={styles.nameCell}>
                  {data?.currentUser.username ?? fallbackCurrentUser.username}
                </span>
                <span className={styles.xpCell}>
                  {data?.currentUser.totalXp ?? fallbackCurrentUser.totalXp}
                </span>
                <span className={styles.levelCell}>
                  Lv {data?.currentUser.currentLevel ?? fallbackCurrentUser.currentLevel}
                </span>
              </div>
            </div>
          </section>
        )}

        <Link className={styles.backButton} href="/">
          Back to Main
        </Link>
      </main>
    </div>
  );
}

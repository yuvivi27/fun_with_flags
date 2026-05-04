import { render, screen, waitFor } from "@testing-library/react";
import {
  getCountFromServer,
  getDocs,
} from "firebase/firestore";
import { beforeEach, describe, expect, it, vi } from "vitest";

const useAuthMock = vi.fn();
vi.mock("../auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import LeaderboardPage from "./page";

const getDocsMock = vi.mocked(getDocs);
const getCountMock = vi.mocked(getCountFromServer);

function makePlayerDoc(
  id: string,
  data: { userId?: string; username?: string; totalXP?: number },
) {
  return {
    id,
    data: () => data,
  };
}

beforeEach(() => {
  useAuthMock.mockReset();
  getDocsMock.mockReset();
  getCountMock.mockReset();
});

describe("LeaderboardPage", () => {
  it("shows a 'missing auth token' notice when not logged in", async () => {
    useAuthMock.mockReturnValue({ user: null, token: null });
    render(<LeaderboardPage />);
    expect(await screen.findByText(/Missing auth token/i)).toBeInTheDocument();
  });

  it("renders the top players from Firestore and computes the user's rank", async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-current",
        email: "me@example.com",
        username: "me",
        totalXp: 600,
      },
      token: "tok",
    });

    getDocsMock.mockResolvedValueOnce({
      docs: [
        makePlayerDoc("p1", { userId: "p1", username: "Top", totalXP: 5000 }),
        makePlayerDoc("p2", { userId: "p2", username: "Second", totalXP: 3000 }),
      ],
    } as never);
    getCountMock.mockResolvedValueOnce({
      data: () => ({ count: 12 }),
    } as never);

    render(<LeaderboardPage />);

    expect(await screen.findByText("Top")).toBeInTheDocument();
    expect(screen.getByText("Second")).toBeInTheDocument();
    expect(await screen.findByText("#13")).toBeInTheDocument();
  });

  it("uses the in-list entry when the current user is in the top ten", async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-current",
        email: "me@example.com",
        username: "me",
        totalXp: 5000,
      },
      token: "tok",
    });

    getDocsMock.mockResolvedValueOnce({
      docs: [
        makePlayerDoc("user-current", {
          userId: "user-current",
          username: "me",
          totalXP: 5000,
        }),
      ],
    } as never);

    render(<LeaderboardPage />);
    expect(await screen.findAllByText(/^me$/)).toHaveLength(2);
    expect(getCountMock).not.toHaveBeenCalled();
    await waitFor(() =>
      expect(screen.queryByText(/Loading leaderboard/i)).not.toBeInTheDocument(),
    );
  });

  it("falls back to mock leaderboard data when Firestore fails", async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-current",
        email: "me@example.com",
        username: "me",
        totalXp: 100,
      },
      token: "tok",
    });

    getDocsMock.mockRejectedValueOnce(new Error("offline"));

    render(<LeaderboardPage />);
    expect(
      await screen.findByText(/Using fallback leaderboard data/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Player1")).toBeInTheDocument();
    expect(screen.getByText("Player10")).toBeInTheDocument();
  });

  it("uses safe defaults when Firestore docs are missing fields", async () => {
    useAuthMock.mockReturnValue({
      user: {
        id: "user-current",
        username: null,
        email: "me@example.com",
        totalXp: 0,
      },
      token: "tok",
    });

    getDocsMock.mockResolvedValueOnce({
      docs: [makePlayerDoc("orphan-doc", {})],
    } as never);
    getCountMock.mockResolvedValueOnce({
      data: () => ({ count: 0 }),
    } as never);

    render(<LeaderboardPage />);
    expect(await screen.findByText(/Player 1/)).toBeInTheDocument();
  });
});

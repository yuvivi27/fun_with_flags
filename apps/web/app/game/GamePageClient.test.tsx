import { render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { __routerMocks, __setSearchParams } from "../../test/setup";

const useAuthMock = vi.fn();
vi.mock("../auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

vi.mock("./quiz-client", () => ({
  QuizClient: ({ requestedQuestionCount }: { requestedQuestionCount: number }) => (
    <div data-testid="quiz-stub">{`Quiz(${requestedQuestionCount})`}</div>
  ),
}));

import GamePageClient from "./GamePageClient";

beforeEach(() => {
  useAuthMock.mockReset();
});

describe("GamePageClient", () => {
  it("renders nothing while auth is loading", () => {
    useAuthMock.mockReturnValue({ user: null, loading: true });
    render(<GamePageClient />);
    expect(screen.queryByTestId("quiz-stub")).not.toBeInTheDocument();
  });

  it("redirects to /game/length when count is missing", async () => {
    useAuthMock.mockReturnValue({ user: { totalXp: 100_000 }, loading: false });
    render(<GamePageClient />);
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/game/length"),
    );
    expect(screen.queryByTestId("quiz-stub")).not.toBeInTheDocument();
  });

  it("redirects to /game/length when count is locked for the player level", async () => {
    useAuthMock.mockReturnValue({ user: { totalXp: 0 }, loading: false });
    __setSearchParams("count=50");
    render(<GamePageClient />);
    await waitFor(() =>
      expect(__routerMocks.replace).toHaveBeenCalledWith("/game/length"),
    );
  });

  it("renders the QuizClient when count is valid and unlocked", () => {
    useAuthMock.mockReturnValue({
      user: { totalXp: 100_000 },
      loading: false,
    });
    __setSearchParams("count=10");
    render(<GamePageClient />);
    expect(screen.getByTestId("quiz-stub")).toHaveTextContent("Quiz(10)");
    expect(__routerMocks.replace).not.toHaveBeenCalled();
  });
});

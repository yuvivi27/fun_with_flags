import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { MutableRefObject } from "react";
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import type { AuthUser } from "../auth-context";

const useAuthMock = vi.fn();
vi.mock("../auth-context", () => ({
  useAuth: () => useAuthMock(),
}));

import {
  AnimatedFinalScore,
  QuizClient,
  buildQuestionForCountry,
  dedupeQuestionsByCode,
  difficultyFactor,
  preloadFlagSrc,
  scoreForCorrectAnswer,
  shuffleArray,
} from "./quiz-client";
import { FLAGS_DATABASE } from "./questions";

function getFlagEntryFromDom(): (typeof FLAGS_DATABASE)[number] {
  const img = document.querySelector(
    'img[src*="/flags/"]',
  ) as HTMLImageElement | null;
  const raw = img?.getAttribute("src") ?? "";
  if (!raw) throw new Error("flag image not found");
  const match = /\/flags\/([^/?#]+)\.svg/i.exec(raw);
  const code = match?.[1]?.toLowerCase();
  if (!code) throw new Error("could not parse flag code");
  const entry = FLAGS_DATABASE.find((row) => row.code.toLowerCase() === code);
  if (!entry) throw new Error(`unknown flag code ${code}`);
  return entry;
}

function clickCorrectAnswerFromFlagImg(): void {
  const entry = getFlagEntryFromDom();
  const group = screen.getByRole("group", { name: /Answer choices/i });
  fireEvent.click(within(group).getByRole("button", { name: entry.name }));
}

function clickWrongAnswerFromFlagImg(): void {
  const entry = getFlagEntryFromDom();
  const group = screen.getByRole("group", { name: /Answer choices/i });
  const wrong = within(group)
    .getAllByRole("button")
    .find((b) => (b.textContent ?? "").trim() !== entry.name);
  if (!wrong) throw new Error("could not find a wrong answer button");
  fireEvent.click(wrong);
}

function highLevelUser(overrides: Partial<AuthUser> = {}): AuthUser {
  return {
    id: "user-1",
    email: "player@example.com",
    username: "player",
    totalXp: 50_000,
    currentLevel: 12,
    xpToNextLevel: 100,
    xpRequiredForNextLevel: 200,
    ...overrides,
  };
}

beforeEach(() => {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: query.includes("(prefers-reduced-motion: reduce)"),
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe("quiz helpers", () => {
  it("computes difficultyFactor for each band", () => {
    expect(difficultyFactor(1)).toBe(1);
    expect(difficultyFactor(2)).toBe(1.2);
    expect(difficultyFactor(3)).toBe(1.35);
    expect(difficultyFactor(4)).toBe(1.45);
    expect(difficultyFactor(5)).toBe(1.55);
    expect(difficultyFactor(9)).toBe(1.55);
  });

  it("scores correct answers with difficulty weighting", () => {
    expect(scoreForCorrectAnswer(30, 1)).toBe(Math.floor((10 + 30 / 5) * 1));
    expect(scoreForCorrectAnswer(0, 5)).toBe(Math.floor(10 * 1.55));
  });

  it("shuffles deterministically when Math.random always picks zero", () => {
    vi.spyOn(Math, "random").mockReturnValue(0);
    expect(shuffleArray([1, 2, 3, 4])).toEqual([2, 3, 4, 1]);
  });

  it("builds four distractors from the pool", () => {
    const pool = [
      { countryCode: "a", answer: "Aland", difficulty: 2 as const },
      { countryCode: "b", answer: "Belgium", difficulty: 2 as const },
      { countryCode: "c", answer: "Canada", difficulty: 2 as const },
      { countryCode: "d", answer: "Denmark", difficulty: 2 as const },
      { countryCode: "e", answer: "Estonia", difficulty: 3 as const },
    ];
    vi.spyOn(Math, "random").mockReturnValue(0);
    const q = buildQuestionForCountry(pool[0]!, pool);
    expect(q.options.length).toBe(4);
    expect(q.options).toContain("Aland");
  });

  it("dedupes questions by country code", () => {
    const list = [
      {
        countryCode: "us",
        answer: "United States",
        difficulty: 4 as const,
        options: ["x", "y", "z", "w"] as [string, string, string, string],
      },
      {
        countryCode: "us",
        answer: "United States",
        difficulty: 4 as const,
        options: ["a", "b", "c", "d"] as [string, string, string, string],
      },
    ];
    expect(dedupeQuestionsByCode(list)).toHaveLength(1);
  });

  it("dedupes preload requests once an image finishes loading", async () => {
    const loaded = { current: new Set<string>() } as MutableRefObject<
      Set<string>
    >;
    const inflight = { current: new Set<string>() } as MutableRefObject<
      Set<string>
    >;
    preloadFlagSrc("/flags/zz.svg", loaded, inflight);
    preloadFlagSrc("/flags/zz.svg", loaded, inflight);
    await Promise.resolve();
    expect(loaded.current.has("/flags/zz.svg")).toBe(true);
  });

});

function stubMatchMediaFullMotion(): void {
  vi.spyOn(window, "matchMedia").mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(() => false),
  }));
}

describe("AnimatedFinalScore", () => {
  it("animates a bonus count-up when reduced motion is off", async () => {
    stubMatchMediaFullMotion();
    vi.useFakeTimers();
    try {
      render(
        <AnimatedFinalScore
          initialScore={0}
          finalScore={35}
          bonusPoints={12}
        />,
      );
      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });
      expect(screen.getByText("35")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("animates without a perfection bonus after a short delay", async () => {
    stubMatchMediaFullMotion();
    vi.useFakeTimers();
    try {
      render(
        <AnimatedFinalScore
          initialScore={10}
          finalScore={45}
          bonusPoints={0}
        />,
      );
      await act(async () => {
        vi.advanceTimersByTime(15_000);
      });
      expect(screen.getByText("45")).toBeInTheDocument();
    } finally {
      vi.useRealTimers();
    }
  });

  it("settles immediately when there is nothing to count", () => {
    stubMatchMediaFullMotion();
    render(
      <AnimatedFinalScore
        initialScore={80}
        finalScore={80}
        bonusPoints={0}
      />,
    );
    expect(screen.getByText("80")).toBeInTheDocument();
  });
});

describe("QuizClient integration", () => {
  const user = userEvent.setup();

  it("runs a perfect single-question round, saves with bonus, and can play again", async () => {
    const completeRound = vi.fn().mockResolvedValue({
      gainedXp: 40,
      user: highLevelUser({ totalXp: 50_040 }),
    });
    useAuthMock.mockReturnValue({
      completeRound,
      user: highLevelUser(),
    });

    render(<QuizClient requestedQuestionCount={1} />);

    await screen.findByRole("group", { name: /Answer choices/i });
    clickCorrectAnswerFromFlagImg();
    await screen.findByText(/^Correct!$/i);

    await waitFor(
      () =>
        expect(screen.getByText(/Saving score|Final results/i)).toBeInTheDocument(),
      { timeout: 25_000 },
    );

    await waitFor(() =>
      expect(screen.getByText(/Final results/i)).toBeInTheDocument(),
    );

    expect(completeRound).toHaveBeenCalledWith({
      score: expect.any(Number),
      correct: 1,
      total: 1,
    });

    await user.click(screen.getByRole("button", { name: /Play again/i }));

    await screen.findByRole("group", { name: /Answer choices/i });
  }, 60_000);

  it("shows the summary flow when the answer is wrong and finishes without bonus", async () => {
    const completeRound = vi.fn().mockResolvedValue({
      gainedXp: 10,
      user: highLevelUser({ totalXp: 50_010 }),
    });
    useAuthMock.mockReturnValue({
      completeRound,
      user: highLevelUser(),
    });

    render(<QuizClient requestedQuestionCount={1} />);

    await screen.findByRole("group", { name: /Answer choices/i });
    clickWrongAnswerFromFlagImg();

    await screen.findByText(/^Wrong$/i);

    await waitFor(
      () =>
        expect(
          screen.getByRole("button", { name: /Finish & keep score/i }),
        ).toBeInTheDocument(),
      { timeout: 15_000 },
    );

    await user.click(
      screen.getByRole("button", { name: /Finish & keep score/i }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Final results/i)).toBeInTheDocument(),
    );

    expect(completeRound).toHaveBeenCalled();
  }, 60_000);
});

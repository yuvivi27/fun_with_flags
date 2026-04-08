"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../auth-context";
import layout from "../page.module.css";
import styles from "./game.module.css";
import { FLAGS_DATABASE, flagImageSrc } from "./questions";

const QUESTION_SECONDS = 30;
const ADVANCE_FEEDBACK_MS = 1100;
/** Sentinel — never matches a real answer label */
const TIMEOUT_SENTINEL = "__TIMEOUT__";

type Phase = "playing" | "summary" | "final";
type PlayMode = "initial" | "retake";

function difficultyFactor(difficulty: 1 | 2): number {
  return difficulty === 2 ? 1.2 : 1.0;
}

function scoreForCorrectAnswer(
  secondsRemaining: number,
  difficulty: 1 | 2,
): number {
  return Math.floor((10 + secondsRemaining / 5) * difficultyFactor(difficulty));
}

function AnimatedFinalScore({
  initialScore,
  finalScore,
  bonusPoints,
}: {
  initialScore: number;
  finalScore: number;
  bonusPoints: number;
}) {
  const [displayScore, setDisplayScore] = useState(initialScore);
  const [showBonus, setShowBonus] = useState(false);
  const [isCounting, setIsCounting] = useState(false);
  const [isSettled, setIsSettled] = useState(false);

  useEffect(() => {
    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let cancelled = false;
    let timerId: number | null = null;
    const stagedTimers: number[] = [];

    setDisplayScore(initialScore);
    setShowBonus(false);
    setIsCounting(false);
    setIsSettled(false);

    if (reduceMotion || finalScore <= initialScore) {
      setDisplayScore(finalScore);
      setIsSettled(true);
      if (bonusPoints > 0) setShowBonus(true);
      return () => {
        cancelled = true;
      };
    }

    const scheduleTick = (current: number) => {
      if (cancelled) return;
      const remaining = finalScore - current;
      if (remaining <= 0) {
        setDisplayScore(finalScore);
        setIsCounting(false);
        setIsSettled(true);
        return;
      }

      let step = 1;
      let delay = 126;

      if (remaining > 60) {
        step = Math.max(4, Math.floor(remaining / 9));
        delay = 20;
      } else if (remaining > 30) {
        step = Math.max(3, Math.floor(remaining / 12));
        delay = 29;
      } else if (remaining > 14) {
        step = 2;
        delay = 41;
      } else if (remaining > 7) {
        step = 1;
        delay = 57;
      }

      const next = Math.min(finalScore, current + step);
      timerId = window.setTimeout(() => {
        setDisplayScore(next);
        scheduleTick(next);
      }, delay);
    };

    const startCountUp = () => {
      if (cancelled) return;
      setIsCounting(true);
      setShowBonus(false);
      scheduleTick(initialScore);
    };

    if (bonusPoints > 0) {
      stagedTimers.push(window.setTimeout(() => setShowBonus(true), 520));
      stagedTimers.push(window.setTimeout(startCountUp, 2100));
    } else {
      stagedTimers.push(window.setTimeout(startCountUp, 260));
    }

    return () => {
      cancelled = true;
      if (timerId !== null) window.clearTimeout(timerId);
      for (const t of stagedTimers) window.clearTimeout(t);
    };
  }, [initialScore, finalScore, bonusPoints]);

  return (
    <>
      <div className={styles.resultFinalScoreSlot}>
        <p
          className={`${styles.resultScore} ${
            isCounting || isSettled ? styles.resultScoreLanded : ""
          }`}
          aria-live="polite"
        >
          {displayScore}
        </p>
        {showBonus ? (
          <span className={styles.bonusInline} aria-live="polite">
            {`+${bonusPoints} Perfection Bonus`}
          </span>
        ) : null}
      </div>
    </>
  );
}

export type QuizClientProps = {
  requestedQuestionCount: number;
};

type QuizCountry = {
  countryCode: string;
  answer: string;
  difficulty: 1 | 2;
};

type QuizQuestionGenerated = {
  countryCode: string;
  answer: string;
  difficulty: 1 | 2;
  options: [string, string, string, string];
};

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = a[i] as T;
    a[i] = a[j] as T;
    a[j] = tmp;
  }
  return a;
}

function buildQuestionForCountry(
  country: QuizCountry,
  pool: QuizCountry[],
): QuizQuestionGenerated {
  const others = pool.filter((c) => c.countryCode !== country.countryCode);
  const sameDifficulty = others.filter((c) => c.difficulty === country.difficulty);
  const sameShuffled = shuffleArray(sameDifficulty);
  const restShuffled = shuffleArray(
    others.filter((c) => c.difficulty !== country.difficulty),
  );
  const wrongCountries = [...sameShuffled, ...restShuffled].slice(0, 3);
  const wrongAnswers = wrongCountries.map((c) => c.answer);
  const options = shuffleArray([country.answer, ...wrongAnswers]) as [
    string,
    string,
    string,
    string,
  ];
  return {
    countryCode: country.countryCode,
    answer: country.answer,
    difficulty: country.difficulty,
    options,
  };
}

function dedupeQuestionsByCode(
  list: QuizQuestionGenerated[],
): QuizQuestionGenerated[] {
  const m = new Map<string, QuizQuestionGenerated>();
  for (const q of list) m.set(q.countryCode, q);
  return [...m.values()];
}

export function QuizClient({ requestedQuestionCount }: QuizClientProps) {
  const { completeRound, user } = useAuth();
  const countryPool = useMemo(() => {
    const m = new Map<string, QuizCountry>();
    for (const row of FLAGS_DATABASE) {
      if (row.difficulty !== 1 && row.difficulty !== 2) continue;
      m.set(row.code, {
        countryCode: row.code,
        answer: row.name,
        difficulty: row.difficulty,
      });
    }
    return Array.from(m.values());
  }, []);

  const sessionQuestionCount = Math.min(
    Math.max(1, requestedQuestionCount),
    countryPool.length,
  );

  function makeQuizQuestions(): QuizQuestionGenerated[] {
    const pickedCountries = shuffleArray(countryPool).slice(
      0,
      sessionQuestionCount,
    );
    return pickedCountries.map((country) =>
      buildQuestionForCountry(country, countryPool),
    );
  }

  function buildRetakeRound(wrong: QuizQuestionGenerated[]): QuizQuestionGenerated[] {
    const unique = dedupeQuestionsByCode(wrong);
    const built = unique
      .map((q) => {
        const c = countryPool.find((x) => x.countryCode === q.countryCode);
        return c ? buildQuestionForCountry(c, countryPool) : null;
      })
      .filter((x): x is QuizQuestionGenerated => x !== null);
    return shuffleArray(built);
  }

  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionGenerated[]>(
    () => makeQuizQuestions(),
  );
  const [phase, setPhase] = useState<Phase>("playing");
  const [playMode, setPlayMode] = useState<PlayMode>("initial");
  const [initialScore, setInitialScore] = useState(0);
  const [wrongToMaster, setWrongToMaster] = useState<QuizQuestionGenerated[]>(
    [],
  );
  const [bonusEligible, setBonusEligible] = useState(false);

  const originalCodesRef = useRef<string[]>([]);
  const masteredCodesRef = useRef<Set<string>>(new Set());
  const stillWrongRetakeRef = useRef<QuizQuestionGenerated[]>([]);
  const roundEndHandledRef = useRef(false);
  const questionRef = useRef<QuizQuestionGenerated | null>(null);
  const playModeRef = useRef<PlayMode>("initial");
  playModeRef.current = playMode;
  // Retake success should use the same copy as the first pass: "Correct!"
  const retakeCongratsRef = useRef<"Correct!">("Correct!");

  const roundTotal = quizQuestions.length;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [totalScore, setTotalScore] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(QUESTION_SECONDS);
  const [pointsPop, setPointsPop] = useState<{ value: number; id: number } | null>(
    null,
  );
  const pointsPopIdRef = useRef(0);
  const finalPersistedRef = useRef(false);

  const advanceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const isLockedRef = useRef(false);
  const selectedRef = useRef<string | null>(null);
  selectedRef.current = selected;

  const question =
    phase === "playing" && index < roundTotal
      ? (quizQuestions[index] ?? null)
      : null;
  questionRef.current = question;
  const answered = selected !== null;

  useEffect(() => {
    if (originalCodesRef.current.length > 0) return;
    if (quizQuestions.length === 0) return;
    originalCodesRef.current = quizQuestions.map((q) => q.countryCode);
  }, [quizQuestions]);

  const clearAdvanceTimer = useCallback(() => {
    if (advanceTimerRef.current) {
      clearTimeout(advanceTimerRef.current);
      advanceTimerRef.current = null;
    }
  }, []);

  const scheduleAdvanceToNext = useCallback(() => {
    clearAdvanceTimer();
    advanceTimerRef.current = setTimeout(() => {
      setPointsPop(null);
      setIndex((i) => i + 1);
      setSelected(null);
      isLockedRef.current = false;
      advanceTimerRef.current = null;
    }, ADVANCE_FEEDBACK_MS);
  }, [clearAdvanceTimer]);

  const handleTimeUpRef = useRef<() => void>(() => {});

  handleTimeUpRef.current = () => {
    if (phase !== "playing" || !questionRef.current) return;
    if (isLockedRef.current) return;
    if (selectedRef.current !== null) return;

    const q = questionRef.current;
    isLockedRef.current = true;
    setSelected(TIMEOUT_SENTINEL);

    if (playModeRef.current === "initial") {
      setWrongToMaster((prev) =>
        prev.some((x) => x.countryCode === q.countryCode)
          ? prev
          : [...prev, q],
      );
    } else {
      stillWrongRetakeRef.current.push(q);
    }

    scheduleAdvanceToNext();
  };

  const pickClass = useCallback(
    (label: string) => {
      if (!question) return styles.option;
      if (!answered) return styles.option;
      const isCorrect = label === question.answer;
      const isPicked = label === selected;
      if (isCorrect) return `${styles.option} ${styles.optionCorrect}`;
      if (isPicked && !isCorrect) return `${styles.option} ${styles.optionWrong}`;
      return `${styles.option} ${styles.optionDimmed}`;
    },
    [answered, question, selected],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    if (roundTotal === 0 || index < roundTotal) {
      roundEndHandledRef.current = false;
      return;
    }
    if (roundEndHandledRef.current) return;
    roundEndHandledRef.current = true;

    if (playMode === "initial") {
      setInitialScore(totalScore);
      const perfectFirstPass = wrongToMaster.length === 0;
      if (perfectFirstPass) {
        setBonusEligible(true);
        setPhase("final");
      } else {
        setPhase("summary");
      }
      return;
    }

    const raw = stillWrongRetakeRef.current;
    stillWrongRetakeRef.current = [];
    const still = dedupeQuestionsByCode(raw);
    setWrongToMaster(still);

    if (still.length === 0) {
      const eligible = originalCodesRef.current.every((c) =>
        masteredCodesRef.current.has(c),
      );
      setBonusEligible(eligible);
      setPhase("final");
    } else {
      setPhase("summary");
    }
  }, [phase, index, roundTotal, playMode, totalScore, wrongToMaster]);

  const resetSessionRefs = useCallback(() => {
    originalCodesRef.current = [];
    masteredCodesRef.current = new Set();
    stillWrongRetakeRef.current = [];
    roundEndHandledRef.current = false;
  }, []);

  const handlePlayAgain = () => {
    clearAdvanceTimer();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    isLockedRef.current = false;
    resetSessionRefs();
    retakeCongratsRef.current = "Correct!";

    const qs = makeQuizQuestions();
    setQuizQuestions(qs);
    originalCodesRef.current = qs.map((q) => q.countryCode);

    setPhase("playing");
    setPlayMode("initial");
    setInitialScore(0);
    setWrongToMaster([]);
    setBonusEligible(false);
    setIndex(0);
    setSelected(null);
    setTotalScore(0);
    setCorrectCount(0);
    setPointsPop(null);
    setSecondsLeft(QUESTION_SECONDS);
    finalPersistedRef.current = false;
  };

  const finalScore = bonusEligible
    ? Math.floor(initialScore * 1.2)
    : initialScore;

  useEffect(() => {
    if (phase !== "final") return;
    if (finalPersistedRef.current) return;
    finalPersistedRef.current = true;
    void completeRound({
      score: finalScore,
      correct: correctCount,
      total: sessionQuestionCount,
    }).catch(() => {
      finalPersistedRef.current = false;
    });
  }, [completeRound, correctCount, finalScore, phase, sessionQuestionCount]);

  const handleSelect = useCallback(
    (label: string) => {
      if (phase !== "playing" || !question) return;
      if (isLockedRef.current) return;

      isLockedRef.current = true;
      const wasRight = label === question.answer;
      setSelected(label);

      if (wasRight) {
        masteredCodesRef.current.add(question.countryCode);
        if (playMode === "initial") {
          const pts = scoreForCorrectAnswer(secondsLeft, question.difficulty);
          setTotalScore((s) => s + pts);
          setCorrectCount((c) => c + 1);
          pointsPopIdRef.current += 1;
          setPointsPop({ value: pts, id: pointsPopIdRef.current });
        } else {
          retakeCongratsRef.current = "Correct!";
        }
      } else {
        if (playMode === "initial") {
          setWrongToMaster((prev) =>
            prev.some((x) => x.countryCode === question.countryCode)
              ? prev
              : [...prev, question],
          );
        } else {
          stillWrongRetakeRef.current.push(question);
        }
      }

      scheduleAdvanceToNext();
    },
    [phase, question, playMode, scheduleAdvanceToNext, secondsLeft],
  );

  const startRetake = useCallback(() => {
    if (wrongToMaster.length === 0) return;
    clearAdvanceTimer();
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
    }
    isLockedRef.current = false;
    roundEndHandledRef.current = false;
    stillWrongRetakeRef.current = [];
    retakeCongratsRef.current = "Correct!";

    const qs = buildRetakeRound(wrongToMaster);
    setQuizQuestions(qs);
    setPlayMode("retake");
    setPhase("playing");
    setIndex(0);
    setSelected(null);
    setSecondsLeft(QUESTION_SECONDS);
    setPointsPop(null);
  }, [wrongToMaster, clearAdvanceTimer]);

  const handleFinishFromSummary = useCallback(() => {
    setBonusEligible(false);
    setPhase("final");
  }, []);


  useEffect(() => {
    if (!pointsPop) return;
    const t = setTimeout(() => setPointsPop(null), 1420);
    return () => clearTimeout(t);
  }, [pointsPop]);

  useEffect(() => {
    if (phase !== "playing" || !question) return;
    if (selected !== null) return;

    setSecondsLeft(QUESTION_SECONDS);
    if (countdownRef.current) clearInterval(countdownRef.current);

    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          countdownRef.current = null;
          queueMicrotask(() => handleTimeUpRef.current());
          return 0;
        }
        return s - 1;
      });
    }, 1000);

    countdownRef.current = id;
    return () => {
      clearInterval(id);
      if (countdownRef.current === id) countdownRef.current = null;
    };
  }, [phase, question, index, selected]);

  useEffect(() => {
    return () => {
      clearAdvanceTimer();
      if (countdownRef.current) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
      }
    };
  }, [clearAdvanceTimer]);
  const bonusPoints = finalScore - initialScore;

  if (phase === "summary") {
    const hasWrongs = wrongToMaster.length > 0;
    return (
      <>
        <Link
          href="/"
          className={styles.homeCorner}
          aria-label="Back to home"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>
        <div className={styles.quiz}>
          <div className={styles.actions}>
            {hasWrongs ? (
              <>
                <button
                  type="button"
                  className={`${styles.option} ${styles.quizEndControl}`}
                  onClick={startRetake}
                >
                  Retake wrong questions
                </button>
                <button
                  type="button"
                  className={`${styles.option} ${styles.quizEndControl}`}
                  onClick={handleFinishFromSummary}
                >
                  Finish &amp; keep score
                </button>
              </>
            ) : null}
          </div>
        </div>
      </>
    );
  }

  if (phase === "final") {
    return (
      <>
        <Link
          href="/"
          className={styles.homeCorner}
          aria-label="Back to home"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden
          >
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
            <polyline points="9 22 9 12 15 12 15 22" />
          </svg>
        </Link>
        <div className={styles.quiz}>
          <h2 className={layout.heroTitle}>Final results</h2>
          <AnimatedFinalScore
            initialScore={initialScore}
            finalScore={finalScore}
            bonusPoints={bonusPoints}
          />
          <div className={styles.actions}>
            <button
              type="button"
              className={`${styles.option} ${styles.quizEndControl}`}
              onClick={handlePlayAgain}
            >
              Play again
            </button>
            <Link
              className={`${styles.option} ${styles.quizEndControl}`}
              href="/"
            >
              ← Home
            </Link>
          </div>
        </div>
      </>
    );
  }

  if (!question) {
    return null;
  }

  const current = question;
  const isCorrect = answered && selected === current.answer;
  const isTimedOut = answered && selected === TIMEOUT_SENTINEL;
  const isUrgentTimer = secondsLeft <= 5 && secondsLeft > 0 && !answered;
  const showPointsFloat = playMode === "initial" && pointsPop;

  const correctLabel =
    playMode === "retake" && isCorrect
      ? retakeCongratsRef.current
      : "Correct!";

  return (
    <>
      <Link
        href="/"
        className={styles.homeCorner}
        aria-label="Back to home"
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      </Link>
      <div className={`${styles.quiz} ${styles.quizPlaying}`}>
        {playMode === "retake" ? (
          <p className={styles.retakeBanner} role="status">
            Retake practice · no points
          </p>
        ) : null}
        <div className={styles.quizTop}>
          <div className={styles.quizHeader}>
            <div className={styles.quizHeaderBar}>
              <div
                className={styles.progressBarTrack}
                role="progressbar"
                aria-valuemin={1}
                aria-valuemax={roundTotal}
                aria-valuenow={index + 1}
                aria-label={`Question ${index + 1} of ${roundTotal}`}
              >
                <div
                  className={styles.progressBarFill}
                  style={{
                    width: `calc(100% * ${index + 1} / ${roundTotal})`,
                  }}
                />
              </div>
            </div>
            <div
              className={styles.timerCluster}
              role="status"
              aria-live="off"
              aria-label={`${secondsLeft} seconds remaining`}
            >
              <span
                className={
                  isUrgentTimer
                    ? `${styles.timerValue} ${styles.timerValueUrgent}`
                    : styles.timerValue
                }
              >
                {secondsLeft}
              </span>
              <span className={styles.timerUnit}>s</span>
            </div>
          </div>
          <div className={styles.progressMeta}>
            <span className={styles.progressFraction} aria-hidden="true">
              {index + 1}/{roundTotal}
            </span>
            <span className={styles.scorePill} aria-live="polite">
              {playMode === "retake"
                ? `Score ${initialScore}`
                : `Score ${totalScore}`}
            </span>
            {user ? (
              <span className={styles.scorePill} aria-live="polite">
                Lv {user.currentLevel} · XP {user.totalXp} · Next {user.xpToNextLevel}
              </span>
            ) : null}
          </div>
        </div>
        <p className={styles.prompt}>Which country does this flag belong to?</p>
        <div className={styles.quizCore}>
          <div className={styles.flagWrap}>
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVGs; sizing locked in CSS */}
            <img
              src={flagImageSrc(current.countryCode)}
              alt=""
              className={styles.flagImage}
              decoding="async"
              fetchPriority={index === 0 ? "high" : "auto"}
            />
          </div>
          <div className={styles.feedbackSlot}>
            {showPointsFloat ? (
              <span
                key={pointsPop!.id}
                className={styles.pointsFloat}
                aria-hidden
              >
                +{pointsPop!.value}
              </span>
            ) : null}
            <p
              className={`${styles.feedback} ${
                !answered
                  ? styles.feedbackIdle
                  : isCorrect
                    ? styles.feedbackCorrect
                    : styles.feedbackWrong
              } ${answered ? styles.feedbackVisible : ""}`}
              aria-live="polite"
              aria-hidden={!answered}
            >
              {answered
                ? isCorrect
                  ? correctLabel
                  : isTimedOut
                    ? "Times Up!"
                    : "Wrong"
                : "\u00a0"}
            </p>
          </div>
          <div className={styles.options} role="group" aria-label="Answer choices">
            {current.options.map((label) => (
              <button
                key={label}
                type="button"
                className={pickClass(label)}
                disabled={answered}
                onClick={() => handleSelect(label)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

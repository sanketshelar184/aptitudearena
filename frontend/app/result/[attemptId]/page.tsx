"use client";

import { useEffect, useState, Suspense } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  CheckCircle2,
  Clock,
  CircleDashed,
  XCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  TrendingDown,
  Sparkles,
  Loader2,
  Check,
  X,
  Target,
} from "lucide-react";
import { getAttemptResult } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { AttemptReview } from "@/types/test";
import Navbar from "@/components/Navbar";

function ResultPageContent() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const searchParams = useSearchParams();

  const [review, setReview] = useState<AttemptReview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [filterAnswerStatus, setFilterAnswerStatus] = useState<"ALL" | "INCORRECT" | "CORRECT" | "SKIPPED">("ALL");
  const [guestToken, setGuestToken] = useState<string | null>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    const authToken = getToken();
    const isUserLoggedIn = Boolean(authToken);
    setIsLoggedIn(isUserLoggedIn);

    let token = searchParams.get("token");
    if (!token && typeof window !== "undefined") {
      token = sessionStorage.getItem(`attempt_${attemptId}_token`);
    }

    if (!token && !isUserLoggedIn) {
      setError("This result link requires you to log in or access from your active test session.");
      return;
    }

    setGuestToken(token);
    getAttemptResult(attemptId, token)
      .then(setReview)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load your exam results.");
      });
  }, [attemptId, searchParams]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${mins}m ${secs}s`;
  };

  if (error) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 text-center shadow-sm">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-ink">Result Notice</h2>
          <p className="mt-2 text-xs text-slate-600">{error}</p>
          <Link
            href="/tests"
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Browse Test Catalog
          </Link>
        </div>
      </main>
    );
  }

  if (!review) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center text-slate-500 font-sans">
        <Loader2 size={36} className="animate-spin text-brand mb-3" />
        <p className="text-xs font-medium text-slate-500">Compiling your placement performance report...</p>
      </main>
    );
  }

  const filteredAnswers = review.answers.filter((ans) => {
    if (filterAnswerStatus === "ALL") return true;
    if (filterAnswerStatus === "CORRECT") return ans.is_correct === true;
    if (filterAnswerStatus === "INCORRECT") return ans.is_correct === false;
    if (filterAnswerStatus === "SKIPPED") return ans.is_correct === null;
    return true;
  });

  const paceLabel =
    review.speed_performance?.pace_status === "FAST"
      ? "Speed: Fast (Under 30s avg)"
      : review.speed_performance?.pace_status === "OPTIMAL"
      ? "Speed: Optimal Campus Placement Pace (30-60s)"
      : "Speed: Deliberate / Over-Time (>60s avg)";

  // Adaptive difficulty recommendation
  const currentDiff = review.test_difficulty || "EASY";
  const accuracy = review.accuracy;

  let recommendation = {
    targetLevel: "MEDIUM" as "EASY" | "MEDIUM" | "HARD",
    badge: "Level Up Recommended",
    badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
    cardBorder: "border-amber-200",
    bgGradient: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent",
    btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
    title: "Step Up to Medium Difficulty",
    description: `Impressive! You scored ${accuracy}% on this Easy test. We recommend stepping up to Medium tests to mirror company screening tests (TCS NQT, Infosys, Cognizant).`,
    href: "/tests?difficulty=MEDIUM",
    buttonText: "Solve Medium Tests",
  };

  if (currentDiff === "EASY") {
    if (accuracy >= 70) {
      recommendation = {
        targetLevel: "MEDIUM",
        badge: "Level Up Recommended",
        badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
        cardBorder: "border-amber-200",
        bgGradient: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent",
        btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
        title: "Step Up to Medium Difficulty",
        description: `Impressive! You scored ${accuracy}% on this Easy test. We recommend stepping up to Medium tests to mirror company screening tests (TCS NQT, Infosys, Cognizant).`,
        href: "/tests?difficulty=MEDIUM",
        buttonText: "Solve Medium Tests",
      };
    } else {
      recommendation = {
        targetLevel: "EASY",
        badge: "Foundational Practice Recommended",
        badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
        cardBorder: "border-emerald-200",
        bgGradient: "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent",
        btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
        title: "Master Easy Foundations First",
        description: `You scored ${accuracy}%. Before moving to tricky aptitude puzzles, aim for 70%+ consistency on Easy tests to strengthen fundamental formulas and time management.`,
        href: "/tests?difficulty=EASY",
        buttonText: "Practice Another Easy Test",
      };
    }
  } else if (currentDiff === "MEDIUM") {
    if (accuracy >= 70) {
      recommendation = {
        targetLevel: "HARD",
        badge: "Elite Challenge Recommended",
        badgeColor: "bg-rose-100 text-rose-900 border-rose-300",
        cardBorder: "border-rose-200",
        bgGradient: "bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-transparent",
        btnColor: "bg-rose-600 hover:bg-rose-700 text-white",
        title: "Step Up to Hard / Advanced Difficulty",
        description: `Outstanding accuracy of ${accuracy}%! You're dominating Medium difficulty. Step up to Hard tests for top-tier company rounds (TCS Prime/Digital, Amazon, Accolite, product firms).`,
        href: "/tests?difficulty=HARD",
        buttonText: "Attempt Hard Tests",
      };
    } else if (accuracy < 50) {
      recommendation = {
        targetLevel: "EASY",
        badge: "Foundational Review Recommended",
        badgeColor: "bg-emerald-100 text-emerald-900 border-emerald-300",
        cardBorder: "border-emerald-200",
        bgGradient: "bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent",
        btnColor: "bg-emerald-600 hover:bg-emerald-700 text-white",
        title: "Build Core Speed with Easy Tests",
        description: `You scored ${accuracy}%. Medium questions require multi-step arithmetic. Practicing Easy tests will help you master core formulas and pace under test conditions.`,
        href: "/tests?difficulty=EASY",
        buttonText: "Strengthen with Easy Tests",
      };
    } else {
      recommendation = {
        targetLevel: "MEDIUM",
        badge: "Target 70%+ Consistency",
        badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
        cardBorder: "border-amber-200",
        bgGradient: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent",
        btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
        title: "Continue Medium Practice",
        description: `Solid performance! You scored ${accuracy}%. Take another Medium test and focus on high-yield topics to push your accuracy past 70%.`,
        href: "/tests?difficulty=MEDIUM",
        buttonText: "Practice Another Medium Test",
      };
    }
  } else if (currentDiff === "HARD") {
    if (accuracy >= 70) {
      recommendation = {
        targetLevel: "HARD",
        badge: "Campus Placement Ready",
        badgeColor: "bg-indigo-100 text-indigo-900 border-indigo-300",
        cardBorder: "border-indigo-200",
        bgGradient: "bg-gradient-to-r from-indigo-500/10 via-blue-500/5 to-transparent",
        btnColor: "bg-indigo-600 hover:bg-indigo-700 text-white",
        title: "Elite Placement Ready!",
        description: `Exceptional! Scoring ${accuracy}% on Hard difficulty places you in the top tier of campus candidates. Maintain this standard with mixed mock tests.`,
        href: "/tests",
        buttonText: "Explore Full Test Catalog",
      };
    } else if (accuracy < 50) {
      recommendation = {
        targetLevel: "MEDIUM",
        badge: "Step Down Recommended",
        badgeColor: "bg-amber-100 text-amber-900 border-amber-300",
        cardBorder: "border-amber-200",
        bgGradient: "bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent",
        btnColor: "bg-amber-600 hover:bg-amber-700 text-white",
        title: "Reinforce with Medium Difficulty First",
        description: `Hard tests feature complex edge cases. Practicing Medium tests first will help you master elimination techniques and timing before retrying Hard rounds.`,
        href: "/tests?difficulty=MEDIUM",
        buttonText: "Practice Medium Tests First",
      };
    } else {
      recommendation = {
        targetLevel: "HARD",
        badge: "Advanced Practice",
        badgeColor: "bg-rose-100 text-rose-900 border-rose-200",
        cardBorder: "border-rose-200",
        bgGradient: "bg-gradient-to-r from-rose-500/10 via-purple-500/5 to-transparent",
        btnColor: "bg-rose-600 hover:bg-rose-700 text-white",
        title: "Continue Hard Problem Solving",
        description: `You scored ${accuracy}% on advanced problems. Review the step-by-step solutions below to learn shortcut methods, then tackle another Hard test.`,
        href: "/tests?difficulty=HARD",
        buttonText: "Attempt Another Hard Test",
      };
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-ink">
      <Navbar />

      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Hero Score Card */}
        <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-ink via-slate-900 to-slate-950 p-6 sm:p-8 text-white shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-6">
            <div>
              <span className="rounded-md bg-blue-500/20 px-2.5 py-1 text-xs font-bold text-blue-300 border border-blue-400/30">
                Official Score Report
              </span>
              <h1 className="mt-2 text-2xl sm:text-3xl font-bold tracking-tight">
                Exam Performance Analysis
              </h1>
            </div>

            <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3.5 py-1.5 text-xs text-slate-300 backdrop-blur-xs">
              <Clock size={15} className="text-blue-300" />
              <span>Time Taken: {formatTime(review.time_taken_seconds)}</span>
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 sm:grid-cols-3 gap-6 items-end">
            <div>
              <p className="text-xs font-medium text-slate-400">Total Score</p>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-5xl font-extrabold text-white">{review.score}</span>
                <span className="text-xl text-slate-400 font-medium">/ {review.total_questions}</span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Accuracy Rate</p>
              <p className="mt-1 text-4xl font-extrabold text-blue-400">{review.accuracy}%</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Average Solving Speed</p>
              <p className="mt-1 text-2xl font-bold text-slate-200">
                {Math.round(review.average_time_seconds)}s{" "}
                <span className="text-xs font-normal text-slate-400">/ question</span>
              </p>
            </div>
          </div>
        </div>

        {/* Stats Strip */}
        <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-emerald-600">
              <CheckCircle2 size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Correct</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{review.correct_count}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-red-600">
              <XCircle size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Incorrect</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{review.wrong_count}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-slate-500">
              <CircleDashed size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Skipped</span>
            </div>
            <p className="mt-2 text-2xl font-bold text-ink">{review.skipped_count}</p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center gap-2 text-blue-600">
              <Zap size={18} />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Pace</span>
            </div>
            <p className="mt-2 text-xs font-bold text-ink truncate">
              {review.speed_performance?.pace_status || "OPTIMAL"}
            </p>
          </div>
        </div>

        {/* Diagnostic Weakest Topic Callout & Speed Analysis */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* Weakest Topic Alert */}
          <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-5 shadow-xs">
            <div className="flex items-center gap-2 text-amber-800">
              <TrendingDown size={18} />
              <h2 className="text-xs font-bold uppercase tracking-wider">Placement Diagnostic Insight</h2>
            </div>
            {review.weakest_topic ? (
              <div className="mt-2 text-xs text-amber-950 leading-relaxed">
                Your lowest performing area in this test was{" "}
                <strong className="font-bold underline text-amber-900">{review.weakest_topic}</strong>.
                Review the step-by-step solutions below and practice this topic to prevent scoring drops during campus rounds.
              </div>
            ) : (
              <div className="mt-2 text-xs text-amber-950 leading-relaxed">
                Excellent performance! You answered consistently well across all assessed topics.
              </div>
            )}
          </div>

          {/* Speed Benchmark */}
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Speed Benchmark (45s Goal)
              </span>
              <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700">
                {paceLabel}
              </span>
            </div>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">
              Standard tier-1 campus exams allow an average of 45–60 seconds per question. You averaged{" "}
              <strong>{Math.round(review.average_time_seconds)}s</strong>.
            </p>
          </div>
        </div>

        {/* Adaptive Difficulty Recommendation Card */}
        <div className={`mt-6 rounded-2xl border ${recommendation.cardBorder} ${recommendation.bgGradient} p-5 sm:p-6 shadow-xs bg-white`}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
            <div className="max-w-2xl">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-0.5 text-xs font-bold border ${recommendation.badgeColor}`}>
                  <Target size={13} />
                  <span>{recommendation.badge}</span>
                </span>
                {review.test_difficulty && (
                  <span className="text-[11px] font-medium text-slate-500">
                    Current Test Level: <strong className="text-slate-800">{review.test_difficulty}</strong>
                  </span>
                )}
              </div>

              <h2 className="mt-2.5 text-lg font-bold text-ink tracking-tight">
                {recommendation.title}
              </h2>
              <p className="mt-1 text-xs sm:text-sm text-slate-600 leading-relaxed">
                {recommendation.description}
              </p>
            </div>

            <div className="shrink-0 flex items-center gap-3">
              <Link
                href={recommendation.href}
                className={`inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-xs sm:text-sm font-semibold shadow-xs transition ${recommendation.btnColor}`}
              >
                <span>{recommendation.buttonText}</span>
                <ArrowRight size={15} />
              </Link>
            </div>
          </div>
        </div>

        {/* Topic Breakdown Bars */}
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 shadow-xs">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-600">
            Performance Breakdown by Topic
          </h2>
          <div className="mt-5 space-y-4">
            {review.topic_performance.map((tp) => (
              <div key={`${tp.category}-${tp.topic}`}>
                <div className="flex items-center justify-between text-xs">
                  <div>
                    <span className="font-semibold text-ink">{tp.topic}</span>
                    <span className="ml-2 text-slate-400 font-normal">({tp.category})</span>
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-ink">{tp.accuracy}%</span>
                    <span className="ml-1.5 text-slate-400">
                      ({tp.correct}/{tp.total})
                    </span>
                  </div>
                </div>
                <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-slate-100">
                  <div
                    className={`h-full rounded-full transition-all ${
                      tp.accuracy >= 70
                        ? "bg-emerald-500"
                        : tp.accuracy >= 40
                        ? "bg-amber-500"
                        : "bg-red-500"
                    }`}
                    style={{ width: `${Math.max(tp.accuracy, 4)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Account Creation / Upgrade Banner */}
        <div className="mt-8 rounded-2xl border-2 border-brand/20 bg-gradient-to-r from-blue-50 to-indigo-50 p-6 sm:p-7 shadow-xs">
          {!isLoggedIn ? (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-blue-100 px-3 py-0.5 text-xs font-bold text-brand">
                  <Sparkles size={13} /> Save Your Placement Record
                </div>
                <h3 className="mt-2 text-lg font-bold text-ink">
                  Create a student account to permanently track your growth
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Link this diagnostic score to your profile, track speed improvements over time, and unlock ₹10 targeted topic sprints.
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-3">
                <Link
                  href={`/register?guest_attempt_id=${attemptId}&token=${encodeURIComponent(guestToken || "")}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <span>Create Free Account</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  href={`/login?guest_attempt_id=${attemptId}&token=${encodeURIComponent(guestToken || "")}`}
                  className="text-xs font-semibold text-slate-600 hover:text-ink hover:underline px-2"
                >
                  Already have account? Sign in
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-3 py-0.5 text-xs font-bold text-emerald-800">
                  <Sparkles size={13} /> Placement Practice Hub
                </div>
                <h3 className="mt-2 text-lg font-bold text-ink">
                  Ready to conquer your next placement round?
                </h3>
                <p className="mt-1 text-xs text-slate-600 leading-relaxed">
                  Practice individual ₹10 category sprints or upgrade to Monthly Pro (₹99/mo) for unlimited access to all tests.
                </p>
              </div>

              <div className="shrink-0 flex flex-wrap items-center gap-3">
                <Link
                  href="/dashboard"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  View Dashboard
                </Link>
                <Link
                  href="/pricing"
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-5 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
                >
                  <span>Explore Pro & Sprints</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Detailed Answer Review */}
        <div className="mt-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-4">
            <div>
              <h2 className="text-xl font-bold text-ink">Comprehensive Answer Review</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Review step-by-step solutions for all {review.answers.length} questions.
              </p>
            </div>

            {/* Answer Filter Pills */}
            <div className="flex items-center gap-1.5 rounded-lg bg-slate-100 p-1 text-xs font-semibold">
              {(["ALL", "CORRECT", "INCORRECT", "SKIPPED"] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setFilterAnswerStatus(filter)}
                  className={`rounded-md px-2.5 py-1 transition ${
                    filterAnswerStatus === filter
                      ? "bg-white text-ink shadow-xs"
                      : "text-slate-500 hover:text-ink"
                  }`}
                >
                  {filter}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-6 space-y-5">
            {filteredAnswers.map((ans) => {
              const isCorrect = ans.is_correct === true;
              const isWrong = ans.is_correct === false;

              return (
                <article
                  key={ans.question_id}
                  className="rounded-xl border border-slate-200 bg-white p-5 sm:p-6 shadow-xs"
                >
                  {/* Status header */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-500">
                        Question {ans.position} of {review.total_questions}
                      </span>
                      {ans.difficulty && (
                        <span
                          className={`rounded-md px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide border ${
                            ans.difficulty === "EASY"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : ans.difficulty === "MEDIUM"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-rose-50 text-rose-700 border-rose-200"
                          }`}
                        >
                          {ans.difficulty}
                        </span>
                      )}
                    </div>

                    <span
                      className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                        isCorrect
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : isWrong
                          ? "bg-red-50 text-red-700 border border-red-200"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {isCorrect && <Check size={13} />}
                      {isWrong && <X size={13} />}
                      {isCorrect ? "Correct (+1)" : isWrong ? "Incorrect" : "Skipped (0)"}
                    </span>
                  </div>

                  {/* Question Stem */}
                  <p className="mt-4 text-sm sm:text-base font-medium text-ink whitespace-pre-line leading-relaxed">
                    {ans.question_text}
                  </p>

                  {/* Options */}
                  <div className="mt-5 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                    {Object.entries(ans.options).map(([key, text]) => {
                      const isSelected = ans.selected_answer === key;
                      const isTheCorrectOption = ans.correct_answer === key;

                      let style = "border-slate-200 bg-white text-slate-700";
                      if (isTheCorrectOption) {
                        style = "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium";
                      } else if (isSelected && !isTheCorrectOption) {
                        style = "border-red-400 bg-red-50/70 text-red-950";
                      }

                      return (
                        <div
                          key={key}
                          className={`flex items-center gap-3 rounded-lg border p-3 text-xs ${style}`}
                        >
                          <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md font-bold text-[11px] ${
                              isTheCorrectOption
                                ? "bg-emerald-600 text-white"
                                : isSelected
                                ? "bg-red-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {key}
                          </span>
                          <span className="flex-1 leading-normal">{text}</span>
                          {isTheCorrectOption && (
                            <span className="text-[10px] font-bold text-emerald-700 shrink-0">
                              Correct Answer
                            </span>
                          )}
                          {isSelected && !isTheCorrectOption && (
                            <span className="text-[10px] font-bold text-red-700 shrink-0">
                              Your Answer
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="mt-5 rounded-lg border border-slate-100 bg-slate-50 p-4 text-xs">
                    <p className="font-bold text-ink">Explanation & Solving Step:</p>
                    <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">
                      {ans.explanation}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>

        {/* Bottom Navigation */}
        <div className="mt-10 flex flex-wrap items-center justify-between gap-4 border-t border-slate-200 pt-6">
          <Link
            href="/tests"
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-6 py-3 text-xs font-semibold text-white hover:bg-slate-800 transition"
          >
            <span>Take Another Practice Test</span>
            <ArrowRight size={14} />
          </Link>
          <Link
            href="/tests/free"
            className="text-xs font-semibold text-slate-500 hover:text-ink hover:underline"
          >
            Review Diagnostic Guidelines
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function ResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-24 text-slate-400">
          <Loader2 size={32} className="animate-spin text-brand" />
        </div>
      }
    >
      <ResultPageContent />
    </Suspense>
  );
}

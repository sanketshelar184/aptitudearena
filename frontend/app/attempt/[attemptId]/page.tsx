"use client";

import { useEffect, useState, useRef, useCallback, Suspense } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  ChevronLeft,
  ChevronRight,
  Flag,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Send,
  Wifi,
  WifiOff,
} from "lucide-react";
import { getAttempt, saveAnswer, submitAttempt } from "@/lib/api";
import { StartAttemptResponse } from "@/types/test";

function ExamAttemptContent() {
  const params = useParams<{ attemptId: string }>();
  const attemptId = params.attemptId;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Test state
  const [attemptData, setAttemptData] = useState<StartAttemptResponse | null>(null);
  const [guestToken, setGuestToken] = useState<string>("");
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [markedForReview, setMarkedForReview] = useState<Record<string, boolean>>({});
  const [secondsRemaining, setSecondsRemaining] = useState<number | null>(null);

  // Network & Sync status flags
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [syncStatus, setSyncStatus] = useState<"synced" | "saving" | "offline">("synced");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Time tracking per question
  const questionStartTimeRef = useRef<number>(Date.now());
  const timerIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-sync offline answers to server
  const flushPendingSync = useCallback(async () => {
    if (!guestToken || typeof window === "undefined") return;
    const raw = localStorage.getItem(`attempt_${attemptId}_pending_sync`);
    if (!raw) return;
    try {
      const queue: Array<{ questionId: string; selectedAnswer: string | null; timeSpent?: number }> = JSON.parse(raw);
      if (!queue.length) return;
      setSyncStatus("saving");
      for (const item of [...queue]) {
        await saveAnswer(attemptId, item.questionId, guestToken, item.selectedAnswer, item.timeSpent);
      }
      localStorage.removeItem(`attempt_${attemptId}_pending_sync`);
      setSyncStatus("synced");
    } catch {
      setSyncStatus("offline");
    }
  }, [attemptId, guestToken]);

  // Network online/offline listener
  useEffect(() => {
    if (typeof window === "undefined") return;
    setIsOnline(navigator.onLine);

    const handleOnline = () => {
      setIsOnline(true);
      flushPendingSync();
    };
    const handleOffline = () => {
      setIsOnline(false);
      setSyncStatus("offline");
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, [flushPendingSync]);

  // Accidental exit protection: Warn student if they attempt to close tab or leave during active exam
  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (!isSubmitting) {
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isSubmitting]);

  // Retrieve token
  useEffect(() => {
    let token = searchParams.get("token");
    if (!token && typeof window !== "undefined") {
      token = sessionStorage.getItem(`attempt_${attemptId}_token`);
    }
    if (token) {
      setGuestToken(token);
    } else {
      setErrorMessage("Missing security token for this test attempt. Please start the test again.");
      setIsLoading(false);
    }
  }, [attemptId, searchParams]);

  // Submit test handler with offline check
  const performSubmit = useCallback(
    async () => {
      if (isSubmitting || !guestToken) return;

      if (typeof navigator !== "undefined" && !navigator.onLine) {
        setErrorMessage("You are currently offline. Please reconnect to the internet before submitting your test.");
        setShowSubmitModal(false);
        return;
      }

      setIsSubmitting(true);
      try {
        await flushPendingSync();
        await submitAttempt(attemptId, guestToken);
        try {
          localStorage.removeItem(`attempt_${attemptId}_answers`);
          localStorage.removeItem(`attempt_${attemptId}_pending_sync`);
        } catch {}
        router.push(`/result/${attemptId}?token=${encodeURIComponent(guestToken)}`);
      } catch {
        router.push(`/result/${attemptId}?token=${encodeURIComponent(guestToken)}`);
      }
    },
    [attemptId, flushPendingSync, guestToken, isSubmitting, router]
  );

  // Load attempt
  useEffect(() => {
    if (!guestToken) return;

    getAttempt(attemptId, guestToken)
      .then((data) => {
        setAttemptData(data);

        // Check for any locally cached answers from an offline session
        let localCache: Record<string, string | null> = {};
        try {
          const cached = localStorage.getItem(`attempt_${attemptId}_answers`);
          if (cached) localCache = JSON.parse(cached);
        } catch {}

        // Populate restored answers from server, overlaid with local cache
        const initialAnswers: Record<string, string | null> = {};
        data.questions.forEach((q) => {
          if (localCache[q.id] !== undefined) {
            initialAnswers[q.id] = localCache[q.id];
          } else if (q.selected_answer) {
            initialAnswers[q.id] = q.selected_answer;
          }
        });
        setAnswers(initialAnswers);

        // Compute initial remaining seconds safely (handling UTC with or without trailing Z)
        let expiresAtMs = 0;
        if (data.expires_at) {
          const dateStr = data.expires_at;
          const hasTz = dateStr.endsWith("Z") || /[+-]\d{2}:?\d{2}$/.test(dateStr);
          const normalizedIso = hasTz ? dateStr : `${dateStr}Z`;
          expiresAtMs = new Date(normalizedIso).getTime();
        }

        let diff = Math.floor((expiresAtMs - Date.now()) / 1000);

        // Safeguard: If diff is non-positive or NaN due to client clock drift / timezone differences,
        // fall back to the test's duration_seconds rather than prematurely submitting an active test
        if (isNaN(diff) || diff <= 0) {
          diff = data.duration_seconds || 900;
        }

        setSecondsRemaining(diff);
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load test session.";
        if (msg.includes("409") || msg.includes("already been submitted") || msg.includes("410")) {
          // Attempt already finished, redirect to results
          router.push(`/result/${attemptId}?token=${encodeURIComponent(guestToken)}`);
        } else {
          setErrorMessage(msg);
        }
      })
      .finally(() => setIsLoading(false));
  }, [attemptId, guestToken, performSubmit, router]);

  // Countdown timer effect
  useEffect(() => {
    if (secondsRemaining === null || isSubmitting) return;

    if (secondsRemaining <= 0) {
      performSubmit();
      return;
    }

    timerIntervalRef.current = setInterval(() => {
      setSecondsRemaining((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(timerIntervalRef.current as NodeJS.Timeout);
          performSubmit();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [secondsRemaining, isSubmitting, performSubmit]);

  // Handle option selection with offline cache & queue
  const handleSelectOption = (optionKey: string) => {
    if (!attemptData) return;
    const currentQ = attemptData.questions[currentIndex];
    const previous = answers[currentQ.id];
    const nextVal = previous === optionKey ? null : optionKey;

    const updated = { ...answers, [currentQ.id]: nextVal };
    setAnswers(updated);

    // 1. Immediately cache answers in localStorage for offline persistence
    try {
      localStorage.setItem(`attempt_${attemptId}_answers`, JSON.stringify(updated));
    } catch {}

    // 2. Queue for server sync
    const timeSpent = Math.max(1, Math.round((Date.now() - questionStartTimeRef.current) / 1000));
    questionStartTimeRef.current = Date.now();

    try {
      const raw = localStorage.getItem(`attempt_${attemptId}_pending_sync`);
      const q: Array<{ questionId: string; selectedAnswer: string | null; timeSpent?: number }> = raw ? JSON.parse(raw) : [];
      const filtered = q.filter((item) => item.questionId !== currentQ.id);
      filtered.push({ questionId: currentQ.id, selectedAnswer: nextVal, timeSpent });
      localStorage.setItem(`attempt_${attemptId}_pending_sync`, JSON.stringify(filtered));
    } catch {}

    if (typeof navigator !== "undefined" && navigator.onLine) {
      setSyncStatus("saving");
      saveAnswer(attemptId, currentQ.id, guestToken, nextVal, timeSpent)
        .then(() => {
          try {
            const raw = localStorage.getItem(`attempt_${attemptId}_pending_sync`);
            if (raw) {
              const q: Array<{ questionId: string }> = JSON.parse(raw);
              const remaining = q.filter((item) => item.questionId !== currentQ.id);
              if (remaining.length) {
                localStorage.setItem(`attempt_${attemptId}_pending_sync`, JSON.stringify(remaining));
              } else {
                localStorage.removeItem(`attempt_${attemptId}_pending_sync`);
              }
            }
          } catch {}
          setSyncStatus("synced");
        })
        .catch(() => {
          setSyncStatus("offline");
        });
    } else {
      setSyncStatus("offline");
    }
  };

  const handleClearAnswer = () => {
    if (!attemptData) return;
    const currentQ = attemptData.questions[currentIndex];
    setAnswers((prev) => ({ ...prev, [currentQ.id]: null }));
    saveAnswer(attemptId, currentQ.id, guestToken, null).catch(console.error);
  };

  const handleToggleReview = () => {
    if (!attemptData) return;
    const currentQ = attemptData.questions[currentIndex];
    setMarkedForReview((prev) => ({
      ...prev,
      [currentQ.id]: !prev[currentQ.id],
    }));
  };

  const handleNavigate = (index: number) => {
    if (!attemptData || index < 0 || index >= attemptData.questions.length) return;
    questionStartTimeRef.current = Date.now();
    setCurrentIndex(index);
  };

  const formatTimer = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const handleOpenSubmitModal = () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      alert("⚠️ You are currently offline.\n\nPlease reconnect to the internet before submitting so that all your answers are synchronized and graded accurately.");
      return;
    }
    setShowSubmitModal(true);
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-6 font-sans">
        <Loader2 size={36} className="animate-spin text-blue-400 mb-3" />
        <p className="text-sm font-medium text-slate-300">Setting up your distraction-free exam session...</p>
      </main>
    );
  }

  if (errorMessage || !attemptData) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans">
        <div className="max-w-md w-full rounded-2xl border border-red-200 bg-white p-6 shadow-sm text-center">
          <AlertTriangle size={32} className="text-red-600 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-ink">Exam Notice</h2>
          <p className="mt-2 text-xs text-slate-600">{errorMessage || "Unable to start exam session."}</p>
          <button
            onClick={() => router.push("/tests")}
            className="mt-5 inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Return to Test Catalog
          </button>
        </div>
      </main>
    );
  }

  const questions = attemptData.questions;
  const currentQuestion = questions[currentIndex];
  const answeredCount = Object.values(answers).filter((v) => v !== null && v !== "").length;
  const markedCount = Object.values(markedForReview).filter(Boolean).length;
  const unansweredCount = questions.length - answeredCount;
  const isTimeCritical = (secondsRemaining ?? 999) < 120; // under 2 minutes

  const options: Array<{ key: string; text: string }> = [
    { key: "A", text: currentQuestion.option_a },
    { key: "B", text: currentQuestion.option_b },
    { key: "C", text: currentQuestion.option_c },
    { key: "D", text: currentQuestion.option_d },
  ];

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans select-none text-ink">
      {/* Top Fixed Header */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white shadow-xs">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
          {/* Test Name & Counter */}
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-sm font-bold text-ink truncate max-w-[200px] sm:max-w-md">
                {attemptData.test_name}
              </h1>
              <p className="text-[11px] text-slate-500 font-medium">
                Question {currentIndex + 1} of {questions.length}
              </p>
            </div>
          </div>

          {/* Sync status, Countdown Timer, Submit */}
          <div className="flex items-center gap-2.5 sm:gap-3">
            {/* Real-time Sync / Offline Status */}
            <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium transition">
              {syncStatus === "saving" ? (
                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-100">
                  <Loader2 size={11} className="animate-spin" />
                  Syncing...
                </span>
              ) : syncStatus === "offline" || !isOnline ? (
                <span className="flex items-center gap-1 text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-0.5 rounded-full" title="Changes saved locally on device">
                  <WifiOff size={11} />
                  Offline (Saved)
                </span>
              ) : (
                <span className="flex items-center gap-1 text-slate-500 bg-slate-50 border border-slate-200 px-2.5 py-0.5 rounded-full">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Saved
                </span>
              )}
            </div>

            {/* Countdown Timer */}
            <div
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-mono font-bold tracking-wider transition ${
                isTimeCritical
                  ? "bg-red-50 text-red-600 border border-red-200 animate-pulse"
                  : "bg-slate-100 text-slate-800 border border-slate-200"
              }`}
            >
              <Clock size={15} className={isTimeCritical ? "text-red-500" : "text-slate-500"} />
              <span>{secondsRemaining !== null ? formatTimer(secondsRemaining) : "--:--"}</span>
            </div>

            {/* Submit Button */}
            <button
              onClick={handleOpenSubmitModal}
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition"
            >
              <Send size={13} />
              <span className="hidden sm:inline">Submit Test</span>
              <span className="sm:hidden">Submit</span>
            </button>
          </div>
        </div>
      </header>

      {/* Offline Alert Banner */}
      {!isOnline && (
        <div className="bg-amber-600 text-white px-4 py-2.5 text-xs shadow-inner animate-in slide-in-from-top-2 duration-200">
          <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <WifiOff size={16} className="shrink-0 animate-pulse text-amber-200" />
              <span>
                <strong>Internet Connection Lost:</strong> Don&apos;t panic! Your timer continues running and every option you click is safely preserved on this device. When internet reconnects, all pending answers sync automatically. <em>Keep this tab open.</em>
              </span>
            </div>
            <div className="shrink-0 hidden md:block">
              <span className="rounded bg-amber-700/90 px-2 py-0.5 text-[10px] font-bold text-amber-100 uppercase tracking-wider">
                Offline Auto-Save
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Main Exam Body */}
      <div className="mx-auto flex-1 w-full max-w-7xl px-4 py-6 sm:px-6 flex flex-col lg:flex-row gap-6">
        {/* Left: Question Stem & Options */}
        <section className="flex-1 flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-xs">
          <div>
            {/* Question Header Bar */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <span className="rounded-md bg-blue-50 px-2.5 py-1 text-xs font-bold text-brand border border-blue-100">
                  Question {currentIndex + 1}
                </span>
                {currentQuestion.difficulty && (
                  <span
                    className={`rounded-md px-2 py-0.5 text-[11px] font-semibold tracking-wide uppercase border ${
                      currentQuestion.difficulty === "EASY"
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                        : currentQuestion.difficulty === "MEDIUM"
                        ? "bg-amber-50 text-amber-700 border-amber-200"
                        : "bg-rose-50 text-rose-700 border-rose-200"
                    }`}
                  >
                    {currentQuestion.difficulty}
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleToggleReview}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium border transition ${
                    markedForReview[currentQuestion.id]
                      ? "bg-purple-50 text-purple-700 border-purple-300"
                      : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <Flag size={13} className={markedForReview[currentQuestion.id] ? "fill-purple-600 text-purple-600" : ""} />
                  <span>{markedForReview[currentQuestion.id] ? "Marked for Review" : "Mark for Review"}</span>
                </button>

                {answers[currentQuestion.id] && (
                  <button
                    onClick={handleClearAnswer}
                    className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium text-slate-500 hover:text-red-600 transition"
                  >
                    <RotateCcw size={12} />
                    <span>Clear</span>
                  </button>
                )}
              </div>
            </div>

            {/* Question Statement */}
            <div className="mt-6 text-base sm:text-lg font-medium text-ink leading-relaxed whitespace-pre-line">
              {currentQuestion.question_text}
            </div>

            {/* Options List */}
            <div className="mt-8 space-y-3">
              {options.map((opt) => {
                const isSelected = answers[currentQuestion.id] === opt.key;
                return (
                  <button
                    key={opt.key}
                    onClick={() => handleSelectOption(opt.key)}
                    className={`w-full flex items-center text-left gap-3.5 rounded-xl border p-4 transition ${
                      isSelected
                        ? "border-brand bg-blue-50/70 text-ink shadow-xs"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/50 text-slate-800"
                    }`}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold transition ${
                        isSelected
                          ? "bg-brand text-white"
                          : "bg-slate-100 text-slate-600 border border-slate-200"
                      }`}
                    >
                      {opt.key}
                    </div>
                    <span className="text-sm font-medium leading-normal">{opt.text}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Bottom Question Controls */}
          <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between">
            <button
              onClick={() => handleNavigate(currentIndex - 1)}
              disabled={currentIndex === 0}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-40 disabled:pointer-events-none"
            >
              <ChevronLeft size={16} />
              <span>Previous</span>
            </button>

            {currentIndex < questions.length - 1 ? (
              <button
                onClick={() => handleNavigate(currentIndex + 1)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition"
              >
                <span>Next</span>
                <ChevronRight size={16} />
              </button>
            ) : (
              <button
                onClick={() => setShowSubmitModal(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition"
              >
                <CheckCircle2 size={16} />
                <span>Finish & Submit</span>
              </button>
            )}
          </div>
        </section>

        {/* Right: Question Palette & Overview */}
        <aside className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Question Palette
              </h2>
              <span className="text-xs font-semibold text-brand">
                {answeredCount}/{questions.length} Answered
              </span>
            </div>

            {/* Grid of question buttons */}
            <div className="mt-4 grid grid-cols-5 gap-2">
              {questions.map((q, idx) => {
                const isAnswered = answers[q.id] !== null && answers[q.id] !== undefined && answers[q.id] !== "";
                const isMarked = markedForReview[q.id];
                const isCurrent = idx === currentIndex;

                let btnStyles = "bg-white text-slate-700 border-slate-200 hover:border-slate-300";

                if (isAnswered && isMarked) {
                  btnStyles = "bg-purple-600 text-white border-purple-600";
                } else if (isAnswered) {
                  btnStyles = "bg-emerald-600 text-white border-emerald-600";
                } else if (isMarked) {
                  btnStyles = "bg-purple-100 text-purple-700 border-purple-300";
                }

                if (isCurrent) {
                  btnStyles += " ring-2 ring-brand ring-offset-2 font-bold";
                }

                return (
                  <button
                    key={q.id}
                    onClick={() => handleNavigate(idx)}
                    className={`relative flex h-10 w-full items-center justify-center rounded-lg border text-xs font-semibold transition ${btnStyles}`}
                  >
                    {idx + 1}
                  </button>
                );
              })}
            </div>

            {/* Legend */}
            <div className="mt-6 pt-4 border-t border-slate-100 grid grid-cols-2 gap-2.5 text-[11px] text-slate-500">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-emerald-600 shrink-0" />
                <span>Answered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-white border border-slate-300 shrink-0" />
                <span>Unanswered</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm bg-purple-600 shrink-0" />
                <span>Review</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-sm border-2 border-brand shrink-0" />
                <span>Current</span>
              </div>
            </div>
          </div>

          {/* Tips / Rules Card */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 text-xs text-slate-500 shadow-xs">
            <p className="font-semibold text-ink">Campus Placement Tip</p>
            <p className="mt-1 leading-relaxed text-[11px]">
              Target solving questions in under 45 seconds. If stuck on complex math, mark for review and proceed to verbal or reasoning first.
            </p>
          </div>
        </aside>
      </div>

      {/* Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-lg font-bold text-ink">Submit Exam Attempt?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Are you sure you want to finish and submit your answers? You cannot alter responses after submission.
            </p>

            <div className="mt-5 grid grid-cols-3 gap-2.5 rounded-xl bg-slate-50 p-3.5 text-center">
              <div>
                <p className="text-xl font-bold text-emerald-600">{answeredCount}</p>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Answered</p>
              </div>
              <div>
                <p className="text-xl font-bold text-slate-600">{unansweredCount}</p>
                <p className="text-[10px] uppercase font-semibold text-slate-400">Skipped</p>
              </div>
              <div>
                <p className="text-xl font-bold text-purple-600">{markedCount}</p>
                <p className="text-[10px] uppercase font-semibold text-slate-400">In Review</p>
              </div>
            </div>

            {!isOnline && (
              <div className="mt-4 flex items-center gap-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-800 border border-amber-200">
                <WifiOff size={16} className="shrink-0 text-amber-600" />
                <span>You are currently offline. Please reconnect your internet before submitting to ensure your score is saved.</span>
              </div>
            )}

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowSubmitModal(false)}
                disabled={isSubmitting}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Return to Test
              </button>
              <button
                onClick={() => performSubmit()}
                disabled={isSubmitting || !isOnline}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    <span>Grading test...</span>
                  </>
                ) : (
                  <>
                    <CheckCircle2 size={14} />
                    <span>Confirm & Grade</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExamAttemptPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white">
          <Loader2 size={36} className="animate-spin text-blue-500 mb-3" />
          <p className="text-xs text-slate-400">Preparing test environment...</p>
        </div>
      }
    >
      <ExamAttemptContent />
    </Suspense>
  );
}

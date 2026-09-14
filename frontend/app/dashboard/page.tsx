"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Trophy,
  Flame,
  Target,
  Clock,
  BookOpen,
  ArrowRight,
  TrendingDown,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Award,
  ChevronRight,
  LogOut,
} from "lucide-react";
import { getStudentDashboard, studentLogout } from "@/lib/api";
import { StudentDashboardData } from "@/types/commerce";
import Navbar from "@/components/Navbar";

export default function DashboardPage() {
  const router = useRouter();
  const [data, setData] = useState<StudentDashboardData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadDashboard = useCallback(() => {
    setIsLoading(true);
    setError(null);
    getStudentDashboard()
      .then(setData)
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : "Failed to load dashboard data.";
        if (msg.includes("401") || msg.includes("Unauthorized") || msg.includes("expired")) {
          router.push("/login?redirect=/dashboard");
        } else {
          setError(msg);
        }
      })
      .finally(() => setIsLoading(false));
  }, [router]);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  const handleLogout = async () => {
    await studentLogout();
    router.push("/");
  };

  const formatDuration = (seconds: number | null) => {
    if (!seconds) return "--";
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    if (mins === 0) return `${secs}s`;
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString("en-IN", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <main className="min-h-screen bg-slate-50 font-sans text-ink">
        <Navbar />
        <div className="mx-auto max-w-6xl px-6 py-10 space-y-8 animate-pulse">
          <div className="h-8 w-64 bg-slate-200 rounded" />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-2xl border border-slate-200" />
            ))}
          </div>
          <div className="h-48 bg-white rounded-2xl border border-slate-200" />
        </div>
      </main>
    );
  }

  if (error || !data) {
    return (
      <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center font-sans px-4">
        <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <AlertTriangle size={32} className="mx-auto text-amber-500 mb-3" />
          <h2 className="text-base font-bold text-ink">Unable to load dashboard</h2>
          <p className="mt-2 text-xs text-slate-500 leading-relaxed">
            {error || "An unexpected error occurred while loading your profile."}
          </p>
          <button
            onClick={loadDashboard}
            className="mt-5 inline-flex items-center gap-2 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
          >
            Try Again
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-ink">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10 space-y-8">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                Welcome back, {data.user_name || "Student"}.
              </h1>
              {data.streak_days > 0 && (
                <span className="inline-flex items-center gap-1 rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-bold text-orange-600 border border-orange-200">
                  <Flame size={13} className="fill-orange-500 text-orange-500" />
                  {data.streak_days} Day Streak
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Track your campus placement preparation speed, accuracy, and weak topic diagnostics.
            </p>
          </div>

          {/* Membership Badge */}
          <div className="flex items-center gap-3">
            {data.is_subscribed ? (
              <div className="flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50/70 px-4 py-2 text-xs">
                <Sparkles size={16} className="text-purple-600 shrink-0" />
                <div>
                  <span className="font-bold text-purple-900 block">Pro Member</span>
                  <span className="text-[11px] text-purple-700">Unlimited Test Access</span>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-2.5 px-4 text-xs shadow-2xs">
                <div>
                  <span className="font-bold text-slate-800 block">Free Account</span>
                  <span className="text-[11px] text-slate-500">Single passes or free tests</span>
                </div>
                <Link
                  href="/pricing"
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white hover:bg-blue-700 transition"
                >
                  Upgrade ₹99
                </Link>
              </div>
            )}
          </div>
        </div>

        {/* Practice Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {/* Tests Completed */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Tests Completed</span>
              <BookOpen size={16} className="text-blue-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{data.tests_completed}</p>
            <span className="text-[11px] text-slate-600">Total attempts</span>
          </div>

          {/* Questions Attempted */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Questions Attempted</span>
              <Target size={16} className="text-emerald-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">{data.questions_attempted}</p>
            <span className="text-[11px] text-slate-600">Practice questions</span>
          </div>

          {/* Overall Accuracy */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Overall Accuracy</span>
              <Award size={16} className="text-purple-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">
              {data.overall_accuracy !== null ? `${data.overall_accuracy}%` : "--"}
            </p>
            <span className="text-[11px] text-slate-600">Placement target: &gt;75%</span>
          </div>

          {/* Average Pace */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Avg Pace</span>
              <Clock size={16} className="text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">
              {data.average_time_per_question_seconds !== null
                ? `${data.average_time_per_question_seconds}s`
                : "--"}
            </p>
            <span className="text-[11px] text-slate-600">Per question</span>
          </div>

          {/* Best Score */}
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs col-span-2 sm:col-span-1">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-600">Personal Best</span>
              <Trophy size={16} className="text-amber-500" />
            </div>
            <p className="mt-2 text-2xl font-black text-ink">
              {data.best_accuracy !== null
                ? `${data.best_accuracy}%`
                : data.best_score !== null
                ? `${data.best_score}`
                : "--"}
            </p>
            <span className="text-[11px] text-slate-600">Highest score</span>
          </div>
        </div>

        {/* Weak Topics Diagnostic Section */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-slate-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <TrendingDown size={18} className="text-rose-500" />
                <h2 className="text-base font-bold text-ink">Weak Topics Diagnostic</h2>
              </div>
              <p className="mt-1 text-xs text-slate-500">
                Topics where your accuracy is below 70%. Focus your preparation here to clear company cutoff marks.
              </p>
            </div>
            <span className="text-xs font-semibold text-slate-600">
              {data.weak_topics.length} {data.weak_topics.length === 1 ? "area" : "areas"} need practice
            </span>
          </div>

          {data.weak_topics.length === 0 ? (
            <div className="py-8 text-center">
              <CheckCircle2 size={32} className="mx-auto text-emerald-500 mb-2" />
              <p className="text-xs font-bold text-slate-700">No critical weak topics detected!</p>
              <p className="text-[11px] text-slate-600 mt-0.5">
                Either all your practiced topics have &ge;70% accuracy, or you haven&apos;t attempted enough tests yet.
              </p>
            </div>
          ) : (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {data.weak_topics.map((t) => {
                const incorrectCount = t.total_questions - t.correct_questions;
                return (
                  <div
                    key={t.topic_name}
                    className="rounded-xl border border-rose-100 bg-rose-50/40 p-3.5 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800">{t.topic_name}</span>
                        <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[10px] font-extrabold text-rose-700">
                          {t.accuracy}%
                        </span>
                      </div>
                      <div className="mt-2 text-[11px] text-slate-600 space-y-0.5">
                        <p>Attempted: {t.total_questions} questions</p>
                        <p className="text-rose-600 font-medium">Incorrect: {incorrectCount} questions</p>
                      </div>
                    </div>

                    <div className="mt-3 pt-2 border-t border-rose-100/80">
                      <Link
                        href="/tests"
                        className="inline-flex items-center gap-1 text-[11px] font-bold text-brand hover:underline"
                      >
                        <span>Practice {t.topic_name}</span>
                        <ArrowRight size={11} />
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Test Attempt History Table */}
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-base font-bold text-ink">Test History</h2>
              <p className="mt-1 text-xs text-slate-500">
                Review your submitted test attempts, time spent, and step-by-step solutions.
              </p>
            </div>
            <Link
              href="/tests"
              className="inline-flex items-center gap-1 rounded-xl bg-brand px-3.5 py-2 text-xs font-bold text-white shadow-2xs hover:bg-blue-700 transition"
            >
              <span>Take New Test</span>
              <ArrowRight size={12} />
            </Link>
          </div>

          {data.recent_attempts.length === 0 ? (
            <div className="py-12 text-center">
              <RotateCcw size={32} className="mx-auto text-slate-300 mb-3" />
              <p className="text-xs font-bold text-slate-700">No test attempts yet</p>
              <p className="text-[11px] text-slate-600 mt-1 max-w-sm mx-auto">
                Take your first test to see detailed accuracy metrics, pace analytics, and weak topics.
              </p>
              <Link
                href="/tests/free"
                className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-blue-700 transition"
              >
                <span>Start Free Diagnostic Test</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    <th className="pb-3 pr-4">Test Name</th>
                    <th className="pb-3 px-4">Date</th>
                    <th className="pb-3 px-4">Score</th>
                    <th className="pb-3 px-4">Accuracy</th>
                    <th className="pb-3 px-4">Time Spent</th>
                    <th className="pb-3 pl-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.recent_attempts.map((test) => {
                    const acc = test.accuracy ?? 0;
                    return (
                      <tr key={test.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3.5 pr-4 font-semibold text-slate-800">
                          {test.test_name}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {formatDate(test.submitted_at || test.started_at)}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-ink">
                          {test.score !== null ? test.score : "--"} / {test.total_questions}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                              acc >= 75
                                ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                : acc >= 50
                                ? "bg-amber-50 text-amber-700 border border-amber-200"
                                : "bg-rose-50 text-rose-700 border border-rose-200"
                            }`}
                          >
                            {acc >= 75 ? (
                              <CheckCircle2 size={10} />
                            ) : (
                              <XCircle size={10} />
                            )}
                            {acc}%
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {formatDuration(test.time_taken_seconds)}
                        </td>
                        <td className="py-3.5 pl-4 text-right">
                          <Link
                            href={`/result/${test.id}`}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                          >
                            <span>Review</span>
                            <ChevronRight size={12} />
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

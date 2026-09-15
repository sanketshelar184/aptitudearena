"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Clock,
  HelpCircle,
  ArrowRight,
  Zap,
  Sparkles,
  Loader2,
  SlidersHorizontal,
} from "lucide-react";
import { getPublishedTests, startTest } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Test } from "@/types/test";
import Navbar from "@/components/Navbar";

export default function TestsCatalogPage() {
  const router = useRouter();
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");

  useEffect(() => {
    getPublishedTests()
      .then(setTests)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load test catalog.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleStartPaidTest = async (testId: string) => {
    if (!getToken()) {
      router.push(`/login?redirect=${encodeURIComponent("/tests")}`);
      return;
    }

    setStartingTestId(testId);
    try {
      const started = await startTest(testId);
      sessionStorage.setItem(`attempt_${started.attempt_id}_token`, started.guest_token);
      router.push(`/attempt/${started.attempt_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to start test. Please try again.";
      if (msg.toLowerCase().includes("payment required") || msg.includes("402")) {
        router.push("/pricing");
      } else {
        alert(msg);
      }
      setStartingTestId(null);
    }
  };

  const freeTest = tests.find((t) => t.is_free);
  const paidTests = tests.filter((t) => !t.is_free);

  const difficulties = [
    { key: "ALL", label: "All Difficulties" },
    { key: "EASY", label: "🟢 Easy (Foundational)" },
    { key: "MEDIUM", label: "🟡 Medium (Placement Standard)" },
    { key: "HARD", label: "🔴 Hard (Advanced)" },
  ];

  const filteredTests = paidTests.filter((t) => {
    if (selectedDifficulty === "ALL") return true;
    const diff = (t.difficulty || "MEDIUM").toUpperCase();
    return diff === selectedDifficulty;
  });

  const renderDifficultyBadge = (diff?: string | null) => {
    const val = (diff || "MEDIUM").toUpperCase();
    if (val === "EASY") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 border border-emerald-200">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          Easy
        </span>
      );
    }
    if (val === "HARD") {
      return (
        <span className="inline-flex items-center gap-1.5 rounded-md bg-rose-50 px-2.5 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
          <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
          Hard
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-amber-50 px-2.5 py-0.5 text-[11px] font-bold text-amber-700 border border-amber-200">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
        Medium
      </span>
    );
  };

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-ink">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Page Hero */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand border border-blue-200 uppercase tracking-wider">
            <Zap size={13} /> Placement Practice Bank
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Aptitude Tests & Sprints
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Engineered to simulate real TCS, Infosys, Wipro, Cognizant, and product-company placement exams. Choose a difficulty level or specific test to begin.
          </p>
        </div>

        {error && (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 text-slate-400">
            <Loader2 size={32} className="animate-spin text-brand" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading tests...</p>
          </div>
        ) : (
          <div className="mt-8 space-y-8">
            {/* Featured Free Test Banner */}
            {freeTest && (
              <div className="relative overflow-hidden rounded-2xl border-2 border-brand bg-gradient-to-br from-ink to-slate-900 p-6 sm:p-8 text-white shadow-md">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div className="max-w-xl">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-emerald-500/20 px-2.5 py-0.5 text-xs font-semibold text-emerald-300 border border-emerald-500/30">
                        100% FREE FOR ALL STUDENTS
                      </span>
                      <span className="text-xs text-slate-300">· No Login Required</span>
                    </div>
                    <h2 className="mt-3 text-2xl font-bold sm:text-3xl tracking-tight">
                      {freeTest.name}
                    </h2>
                    <p className="mt-2 text-xs text-slate-300 leading-relaxed">
                      {freeTest.description ||
                        "Experience standard campus placement test conditions. Evaluate your Quantitative arithmetic, Logical reasoning, and Verbal clarity with 20 balanced questions in 15 minutes."}
                    </p>
                    <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-200">
                      <span className="inline-flex items-center gap-1.5">
                        <HelpCircle size={15} className="text-blue-400" />
                        {freeTest.question_count} Questions
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Clock size={15} className="text-blue-400" />
                        {Math.round(freeTest.duration_seconds / 60)} Minutes
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Sparkles size={15} className="text-emerald-400" />
                        Instant Result & Weak Topic Diagnostic
                      </span>
                    </div>
                  </div>

                  <div className="shrink-0 flex flex-col items-start md:items-end gap-2">
                    <div className="text-left md:text-right">
                      <span className="text-2xl font-extrabold text-white">₹0</span>
                      <span className="text-xs text-slate-400"> / first attempt</span>
                    </div>
                    <Link
                      href="/tests/free"
                      className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-blue-700 transition"
                    >
                      <span>Take Free Test Now</span>
                      <ArrowRight size={16} />
                    </Link>
                  </div>
                </div>
              </div>
            )}

            {/* Difficulty Level Selector Tabs */}
            <div className="flex flex-wrap items-center gap-2 border-b border-slate-200/80 pb-4">
              <span className="text-xs font-bold text-slate-500 mr-2 inline-flex items-center gap-1.5">
                <SlidersHorizontal size={14} /> Difficulty Level:
              </span>
              {difficulties.map((d) => {
                const isSelected = selectedDifficulty === d.key;
                const count =
                  d.key === "ALL"
                    ? paidTests.length
                    : paidTests.filter(
                        (t) => (t.difficulty || "MEDIUM").toUpperCase() === d.key
                      ).length;
                return (
                  <button
                    key={d.key}
                    onClick={() => setSelectedDifficulty(d.key)}
                    className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-bold transition ${
                      isSelected
                        ? "bg-brand text-white shadow-xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    <span>{d.label}</span>
                    <span
                      className={`ml-0.5 rounded-full px-1.5 py-0.5 text-[10px] ${
                        isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Topic & Category Sprints */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-ink">Placement Tests & Sprints</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Targeted assessments calibrated for speed, accuracy, and company cutoff benchmarks.
                  </p>
                </div>
                <span className="text-xs font-semibold text-slate-500">
                  Showing {filteredTests.length} tests
                </span>
              </div>

              {filteredTests.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No tests found in the {selectedDifficulty.toLowerCase()} difficulty level yet.
                  </p>
                  <p className="text-xs text-slate-500 mt-1">
                    Try switching back to &ldquo;All Difficulties&rdquo; to explore other tests.
                  </p>
                  <button
                    onClick={() => setSelectedDifficulty("ALL")}
                    className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                  >
                    Show All Tests
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                  {filteredTests.map((t) => (
                    <div
                      key={t.id}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 truncate max-w-[150px]">
                            {t.category_name || "General Aptitude"}
                          </span>
                          {renderDifficultyBadge(t.difficulty)}
                        </div>

                        <h3 className="mt-3 text-base font-bold text-ink leading-snug">
                          {t.name}
                        </h3>
                        <p className="mt-1.5 text-xs text-slate-500 line-clamp-2">
                          {t.description ||
                            "Timed targeted questions designed to improve speed and eliminate recurring mistakes."}
                        </p>

                        <div className="mt-4 flex items-center gap-4 text-xs text-slate-600 border-t border-slate-100 pt-3">
                          <span className="inline-flex items-center gap-1">
                            <HelpCircle size={14} className="text-slate-400" />
                            {t.question_count} Qs
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Clock size={14} className="text-slate-400" />
                            {Math.round(t.duration_seconds / 60)} mins
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-ink ml-auto">
                            {t.price_inr > 0 ? `₹${t.price_inr}` : "Free"}
                          </span>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] text-slate-400">
                          {t.negative_marking_ratio > 0
                            ? `-${t.negative_marking_ratio} negative mark`
                            : "No negative marks"}
                        </span>
                        <button
                          onClick={() => handleStartPaidTest(t.id)}
                          disabled={startingTestId === t.id}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50 shadow-2xs"
                        >
                          {startingTestId === t.id ? (
                            <>
                              <Loader2 size={13} className="animate-spin" />
                              <span>Starting...</span>
                            </>
                          ) : (
                            <>
                              <span>Start Test</span>
                              <ArrowRight size={13} />
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

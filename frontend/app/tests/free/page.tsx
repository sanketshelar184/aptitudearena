"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowRight,
  Clock,
  CheckCircle2,
  HelpCircle,
  PlayCircle,
  Loader2,
  AlertCircle,
  ShieldCheck,
  RotateCcw,
} from "lucide-react";
import { getFreeTestInfo, startFreeTest } from "@/lib/api";
import { FreeTestInfoResponse } from "@/types/test";
import Navbar from "@/components/Navbar";

export default function FreeTestPage() {
  const router = useRouter();
  const [info, setInfo] = useState<FreeTestInfoResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getFreeTestInfo()
      .then(setInfo)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load free test details. Please try again.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleStart = async () => {
    setIsStarting(true);
    setError(null);
    try {
      const started = await startFreeTest();
      // Store attempt session data locally for smooth resumption
      sessionStorage.setItem(`attempt_${started.attempt_id}_token`, started.guest_token);
      router.push(`/attempt/${started.attempt_id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Unable to begin test. Please try again.");
      setIsStarting(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col font-sans text-ink">
      <Navbar />

      <div className="mx-auto flex-1 w-full max-w-3xl px-6 py-12">
        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand border border-blue-200 uppercase tracking-wider">
            <ShieldCheck size={14} />
            Diagnostic Exam #1 · Free Access
          </span>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Free 20-Question Placement Aptitude Test
          </h1>
          <p className="mt-2 text-sm text-slate-600 max-w-xl mx-auto">
            Experience standard campus placement test pressure. Evaluate your quantitative arithmetic, logical deduction, and verbal precision in one 15-minute diagnostic session.
          </p>
        </div>

        {error && (
          <div className="mt-6 flex items-start gap-3 rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700 max-w-xl mx-auto">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Test Notice</p>
              <p className="mt-0.5">{error}</p>
            </div>
          </div>
        )}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 size={28} className="animate-spin text-brand" />
              <p className="mt-3 text-xs font-medium text-slate-500">Preparing test session...</p>
            </div>
          ) : info?.has_active_attempt ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-3">
                <RotateCcw size={24} />
              </div>
              <h2 className="text-lg font-bold text-ink">You have an ongoing test attempt!</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                Your previous free test session is still active. Click below to resume your test without losing elapsed time or answers.
              </p>
              <div className="mt-6 flex justify-center">
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isStarting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Resuming your test...</span>
                    </>
                  ) : (
                    <>
                      <span>Resume Active Test</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          ) : info?.has_completed_free_test ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 mb-3">
                <CheckCircle2 size={24} />
              </div>
              <h2 className="text-lg font-bold text-ink">Free Test Completed</h2>
              <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
                You have already taken your free diagnostic test. You can review your past results or explore our ₹10 topic and category sprints.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                {info.last_attempt_id && info.last_guest_token && (
                  <Link
                    href={`/result/${info.last_attempt_id}?token=${encodeURIComponent(info.last_guest_token)}`}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-5 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                  >
                    View Your Result
                  </Link>
                )}
                <Link
                  href="/tests"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 transition"
                >
                  <span>Explore Other Tests</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Features grid */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 border-b border-slate-100 pb-6">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-brand">
                    <HelpCircle size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Test Format</p>
                    <p className="text-sm font-bold text-ink">20 Questions</p>
                    <p className="text-[11px] text-slate-500">Quantitative · Reasoning · Verbal</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-blue-50 p-2 text-brand">
                    <Clock size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Time Limit</p>
                    <p className="text-sm font-bold text-ink">15 Minutes</p>
                    <p className="text-[11px] text-slate-500">45 seconds avg per question</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-emerald-50 p-2 text-emerald-600">
                    <CheckCircle2 size={18} />
                  </div>
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Included Review</p>
                    <p className="text-sm font-bold text-ink">Full Solutions</p>
                    <p className="text-[11px] text-slate-500">Detailed explanations & weak topics</p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="mt-6 space-y-2 text-xs text-slate-600">
                <p className="font-semibold text-ink">Instructions & Exam Rules:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-500">
                  <li>Each question has four options with exactly one correct answer.</li>
                  <li>No negative marking in this diagnostic test (+1 for correct, 0 for wrong or skipped).</li>
                  <li>You can navigate between questions and modify answers freely before submitting.</li>
                  <li>The test will automatically submit if the 15-minute countdown timer reaches 00:00.</li>
                </ul>
              </div>

              {/* Start Button */}
              <div className="mt-8 pt-4 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-slate-400 text-center sm:text-left">
                  <span>No credit card or password required to start.</span>
                </div>
                <button
                  onClick={handleStart}
                  disabled={isStarting}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-7 py-3 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isStarting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Generating test questions...</span>
                    </>
                  ) : (
                    <>
                      <PlayCircle size={18} />
                      <span>Begin Free Test Now</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}


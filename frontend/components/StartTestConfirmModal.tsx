"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  X,
  Clock,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Crown,
  Zap,
  Sparkles,
  ShieldAlert,
  CreditCard,
} from "lucide-react";
import { MembershipStatus } from "@/types/commerce";

export interface ConfirmTestDetails {
  title: string;
  categoryName?: string | null;
  topicName?: string | null;
  difficulty?: string | null;
  questionCount: number;
  durationSeconds: number;
  negativeMarkingRatio?: number;
  priceInr?: number;
  isFree?: boolean;
}

interface StartTestConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
  isStarting: boolean;
  testDetails: ConfirmTestDetails | null;
  membership: MembershipStatus | null;
  error?: string | null;
}

export default function StartTestConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  isStarting,
  testDetails,
  membership,
  error,
}: StartTestConfirmModalProps) {
  const router = useRouter();

  // Close on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isStarting) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isStarting, onClose]);

  if (!isOpen || !testDetails) return null;

  const isAdmin = membership?.role === "ADMIN";
  const isPro = Boolean(membership?.is_subscribed);
  const activeCredits = membership?.available_test_credits ?? 0;
  const isFreeTest = Boolean(testDetails.isFree || testDetails.priceInr === 0);
  const hasAccess = isAdmin || isPro || activeCredits > 0 || isFreeTest;

  const durationMinutes = Math.round(testDetails.durationSeconds / 60);
  const diffLabel = (testDetails.difficulty || "MEDIUM").toUpperCase();

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-950/75 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isStarting) {
          onClose();
        }
      }}
    >
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-slate-700/80 bg-slate-900 text-white shadow-2xl transition-all">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 right-0 -mt-10 -mr-10 h-44 w-44 rounded-full bg-indigo-500/20 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 -mb-10 -ml-10 h-44 w-44 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />

        {/* Modal Header */}
        <div className="relative z-10 flex items-start justify-between border-b border-slate-800 p-5 sm:p-6">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md">
              <Sparkles size={20} className="animate-pulse" />
            </div>
            <div>
              <h3 className="text-lg font-black text-white leading-tight">
                Ready to Begin Your Test?
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Review your session details and instructions before starting.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition disabled:opacity-50"
            aria-label="Close confirmation"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="relative z-10 max-h-[75vh] overflow-y-auto p-5 sm:p-6 space-y-4">
          {/* Error Message if any */}
          {error && (
            <div className="rounded-2xl border border-red-500/40 bg-red-950/50 p-3.5 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle size={16} className="text-red-400 shrink-0 mt-0.5" />
              <div>{error}</div>
            </div>
          )}

          {/* Test Overview Card */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 space-y-3">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1.5">
                {testDetails.categoryName && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    {testDetails.categoryName}
                  </span>
                )}
                {testDetails.topicName && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-white/10 text-slate-200">
                    {testDetails.topicName}
                  </span>
                )}
                <span
                  className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border ${
                    diffLabel === "EASY"
                      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                      : diffLabel === "HARD"
                      ? "bg-rose-500/10 text-rose-400 border-rose-500/30"
                      : "bg-amber-500/10 text-amber-400 border-amber-500/30"
                  }`}
                >
                  {diffLabel}
                </span>
              </div>
              <h4 className="text-base font-extrabold text-white">
                {testDetails.title}
              </h4>
            </div>

            {/* Quick Specs Grid */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/80 text-center">
              <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Questions</div>
                <div className="text-sm font-black text-white mt-0.5 flex items-center justify-center gap-1">
                  <HelpCircle size={13} className="text-indigo-400" />
                  <span>{testDetails.questionCount}</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Duration</div>
                <div className="text-sm font-black text-white mt-0.5 flex items-center justify-center gap-1">
                  <Clock size={13} className="text-indigo-400" />
                  <span>{durationMinutes} mins</span>
                </div>
              </div>

              <div className="rounded-xl bg-slate-900/80 p-2 border border-slate-800">
                <div className="text-[10px] font-semibold text-slate-400 uppercase">Marking</div>
                <div className="text-sm font-black text-white mt-0.5 truncate">
                  {testDetails.negativeMarkingRatio && testDetails.negativeMarkingRatio > 0
                    ? `+1 / -${testDetails.negativeMarkingRatio}`
                    : "+1 / 0 (No Neg)"}
                </div>
              </div>
            </div>
          </div>

          {/* Access & Pass Usage Status */}
          <div className="rounded-2xl border p-3.5 text-xs">
            {isAdmin ? (
              <div className="flex items-center justify-between border-amber-400/30 bg-amber-500/10 text-amber-200 -m-3.5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Crown size={15} className="text-amber-400 shrink-0" />
                  <span className="font-semibold">Administrator Access (All Tests Free)</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-400/20 text-amber-300">
                  Unlimited
                </span>
              </div>
            ) : isPro ? (
              <div className="flex items-center justify-between border-emerald-400/30 bg-emerald-500/10 text-emerald-200 -m-3.5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Sparkles size={15} className="text-emerald-400 shrink-0" />
                  <span className="font-semibold">Included in your Pro Subscription</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-400/20 text-emerald-300">
                  0 Passes Used
                </span>
              </div>
            ) : isFreeTest ? (
              <div className="flex items-center justify-between border-blue-400/30 bg-blue-500/10 text-blue-200 -m-3.5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <CheckCircle2 size={15} className="text-blue-400 shrink-0" />
                  <span className="font-semibold">Free Diagnostic Test</span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-400/20 text-blue-300">
                  Free
                </span>
              </div>
            ) : activeCredits > 0 ? (
              <div className="flex items-center justify-between border-blue-400/30 bg-blue-500/10 text-blue-200 -m-3.5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <Zap size={15} className="text-blue-400 shrink-0" />
                  <span>
                    Will consume <strong>1 Test Pass</strong>
                  </span>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-400/20 text-blue-300">
                  {activeCredits} remaining
                </span>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-rose-400/30 bg-rose-500/10 text-rose-200 -m-3.5 p-3.5 rounded-2xl">
                <div className="flex items-center gap-2">
                  <ShieldAlert size={16} className="text-rose-400 shrink-0" />
                  <div>
                    <div className="font-bold">Test Pass Required (₹10)</div>
                    <div className="text-[11px] text-rose-300/90 mt-0.5">
                      You currently have 0 active test passes.
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => router.push("/pricing")}
                  className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 px-3 py-1.5 text-xs font-bold text-slate-950 shadow-sm hover:from-amber-400 hover:to-orange-500 transition shrink-0"
                >
                  <CreditCard size={13} />
                  <span>Get Pass or Pro</span>
                </button>
              </div>
            )}
          </div>

          {/* Test Guidelines & Rules Checklist */}
          <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-950/40 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Before You Start:
            </div>
            <ul className="space-y-2 text-xs text-slate-300">
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                <span>
                  <strong>Timer starts immediately:</strong> The {durationMinutes}-minute countdown begins as soon as you confirm.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                <span>
                  <strong>Auto-Save:</strong> Each answer is securely saved to the server as soon as you choose an option.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                <span>
                  <strong>Do not refresh or leave:</strong> Stay on the test screen to avoid interruptions or lost time.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-indigo-400 mt-0.5 font-bold">•</span>
                <span>
                  <strong>Full flexibility:</strong> You can jump between questions and change answers anytime before final submit.
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="relative z-10 flex flex-col-reverse sm:flex-row sm:items-center justify-end gap-3 border-t border-slate-800 p-5 sm:p-6 bg-slate-900/90">
          <button
            type="button"
            onClick={onClose}
            disabled={isStarting}
            className="rounded-xl border border-slate-700 bg-slate-800/80 px-5 py-2.5 text-xs font-bold text-slate-300 hover:bg-slate-800 hover:text-white transition disabled:opacity-50 text-center"
          >
            Cancel / Change Options
          </button>

          {hasAccess ? (
            <button
              type="button"
              onClick={onConfirm}
              disabled={isStarting}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-800 text-white px-6 py-2.5 text-xs font-extrabold shadow-lg hover:shadow-indigo-500/25 active:scale-98 transition disabled:opacity-50"
            >
              {isStarting ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  <span>Assembling Questions & Starting...</span>
                </>
              ) : (
                <>
                  <span>I am Ready, Start Test</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          ) : (
            <button
              type="button"
              onClick={() => router.push("/pricing")}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 px-6 py-2.5 text-xs font-extrabold shadow-lg transition"
            >
              <CreditCard size={15} />
              <span>Unlock with Pass or Pro (₹10 / ₹99)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}


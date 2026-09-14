"use client";

import { useEffect, useState } from "react";
import { X, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { adminPreviewTest } from "@/lib/api";
import { Test, TestPreviewData } from "@/types/test";

interface TestPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  test: Test | null;
}

export default function TestPreviewModal({ isOpen, onClose, test }: TestPreviewModalProps) {
  const [preview, setPreview] = useState<TestPreviewData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !test) {
      setPreview(null);
      return;
    }
    setIsLoading(true);
    setError(null);
    adminPreviewTest(test.id)
      .then(setPreview)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load test preview.");
      })
      .finally(() => setIsLoading(false));
  }, [isOpen, test]);

  if (!isOpen || !test) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-sans text-ink">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-lg font-bold text-ink">Preview Test Configuration</h2>
            <p className="text-xs text-slate-500 mt-0.5">{test.name}</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-slate-400">
              <Loader2 size={32} className="animate-spin text-brand mx-auto mb-2" />
              <p className="text-xs font-medium">Checking matching question pool...</p>
            </div>
          ) : error ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
              {error}
            </div>
          ) : preview ? (
            <>
              {/* Pool Status Banner */}
              <div
                className={`flex items-start gap-3 rounded-xl p-4 text-xs ${
                  preview.is_sufficient
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-800"
                    : "border border-amber-200 bg-amber-50 text-amber-800"
                }`}
              >
                {preview.is_sufficient ? (
                  <CheckCircle2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle size={18} className="text-amber-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="font-bold">
                    {preview.is_sufficient
                      ? "Pool is sufficient for full randomized attempts."
                      : "Question pool is smaller than target question count."}
                  </p>
                  <p className="mt-1">
                    Matching active questions in bank: <span className="font-bold">{preview.matching_pool_count}</span>. Target per attempt: <span className="font-bold">{preview.target_question_count}</span>.
                  </p>
                </div>
              </div>

              {/* Sample Questions */}
              <div>
                <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3">
                  Sample Matching Questions ({preview.sample_questions.length} shown)
                </h3>
                <div className="space-y-3">
                  {preview.sample_questions.map((q, i) => (
                    <div key={q.id} className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 text-xs">
                      <p className="font-semibold text-ink leading-relaxed">
                        Q{i + 1}. {q.question_text}
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2 text-slate-600">
                        <div className="rounded border border-slate-200 bg-white px-2 py-1">
                          A: {q.option_a}
                        </div>
                        <div className="rounded border border-slate-200 bg-white px-2 py-1">
                          B: {q.option_b}
                        </div>
                        <div className="rounded border border-slate-200 bg-white px-2 py-1">
                          C: {q.option_c}
                        </div>
                        <div className="rounded border border-slate-200 bg-white px-2 py-1">
                          D: {q.option_d}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : null}
        </div>

        <div className="border-t border-slate-100 p-6 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}

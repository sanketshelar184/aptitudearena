"use client";

import { useEffect } from "react";
import { X, Clock, CheckCircle2, BookOpen } from "lucide-react";
import { Question } from "@/types/admin";

interface QuestionPreviewModalProps {
  question: Question | null;
  categoryName?: string;
  topicName?: string;
  onClose: () => void;
}

export default function QuestionPreviewModal({
  question,
  categoryName,
  topicName,
  onClose,
}: QuestionPreviewModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!question) return null;

  const difficultyColors = {
    EASY: "bg-emerald-50 text-emerald-700 border-emerald-200",
    MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
    HARD: "bg-red-50 text-red-700 border-red-200",
  };

  const options = [
    { key: "A", text: question.option_a },
    { key: "B", text: question.option_b },
    { key: "C", text: question.option_c },
    { key: "D", text: question.option_d },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200"
        role="dialog"
        aria-modal="true"
        aria-labelledby="preview-title"
      >
        <div className="flex items-start justify-between border-b border-slate-100 pb-4">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">Question Preview</span>
            <h2 id="preview-title" className="text-base font-bold text-ink mt-0.5">
              {topicName || "Topic"} · {categoryName || "Category"}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Badges / Metadata */}
        <div className="mt-4 flex flex-wrap gap-2 text-xs">
          <span className={`px-2.5 py-1 rounded-full font-semibold border ${difficultyColors[question.difficulty]}`}>
            {question.difficulty}
          </span>
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
            <Clock size={13} />
            {question.estimated_time_seconds}s
          </span>
          <span
            className={`px-2.5 py-1 rounded-full font-medium border ${
              question.is_premium
                ? "bg-purple-50 text-purple-700 border-purple-200"
                : "bg-blue-50 text-brand border-blue-200"
            }`}
          >
            {question.is_premium ? "Premium Only" : "Free Access"}
          </span>
          <span
            className={`px-2.5 py-1 rounded-full font-medium border ${
              question.is_active
                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                : "bg-slate-100 text-slate-500 border-slate-200"
            }`}
          >
            {question.is_active ? "Active" : "Inactive"}
          </span>
          {question.source && (
            <span className="px-2.5 py-1 rounded-full font-medium bg-slate-50 text-slate-600 border border-slate-200">
              Source: {question.source}
            </span>
          )}
        </div>

        {/* Question Text */}
        <div className="mt-5 rounded-xl bg-slate-50 p-4 border border-slate-200/80">
          <p className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Question Statement</p>
          <p className="text-base text-ink font-medium leading-relaxed whitespace-pre-wrap">
            {question.question_text}
          </p>
        </div>

        {/* Options */}
        <div className="mt-4 space-y-2.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">Answer Options</p>
          {options.map((opt) => {
            const isCorrect = opt.key === question.correct_answer;
            return (
              <div
                key={opt.key}
                className={`flex items-start gap-3 p-3.5 rounded-xl border transition ${
                  isCorrect
                    ? "border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium ring-1 ring-emerald-500"
                    : "border-slate-200 bg-white text-slate-800"
                }`}
              >
                <div
                  className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                    isCorrect ? "bg-emerald-600 text-white" : "bg-slate-100 text-slate-600"
                  }`}
                >
                  {opt.key}
                </div>
                <div className="flex-1 text-sm pt-0.5">{opt.text}</div>
                {isCorrect && (
                  <span className="flex items-center gap-1 text-xs font-semibold text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded">
                    <CheckCircle2 size={13} />
                    Correct Answer
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Explanation */}
        <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50/50 p-4">
          <p className="text-xs font-bold uppercase tracking-wider text-brand mb-1 flex items-center gap-1">
            <BookOpen size={13} />
            Step-by-step Explanation
          </p>
          <p className="text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
            {question.explanation}
          </p>
        </div>

        {/* Footer */}
        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Close Preview
          </button>
        </div>
      </div>
    </div>
  );
}


"use client";

import { useEffect, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import { Category, Difficulty, Question, QuestionCreate, Topic } from "@/types/admin";
import { createQuestion, updateQuestion } from "@/lib/api";

interface QuestionFormModalProps {
  initialQuestion?: Question | null;
  categories: Category[];
  allTopics: Topic[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (savedQuestion: Question) => void;
}

export default function QuestionFormModal({
  initialQuestion,
  categories,
  allTopics,
  isOpen,
  onClose,
  onSuccess,
}: QuestionFormModalProps) {
  const isEditing = Boolean(initialQuestion);

  const [questionText, setQuestionText] = useState("");
  const [optionA, setOptionA] = useState("");
  const [optionB, setOptionB] = useState("");
  const [optionC, setOptionC] = useState("");
  const [optionD, setOptionD] = useState("");
  const [correctAnswer, setCorrectAnswer] = useState<"A" | "B" | "C" | "D">("A");
  const [explanation, setExplanation] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty>("EASY");
  const [estimatedTime, setEstimatedTime] = useState(30);
  const [isPremium, setIsPremium] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [source, setSource] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Available topics filtered by category
  const availableTopics = allTopics.filter((t) => t.category_id === categoryId);

  useEffect(() => {
    if (initialQuestion) {
      setQuestionText(initialQuestion.question_text);
      setOptionA(initialQuestion.option_a);
      setOptionB(initialQuestion.option_b);
      setOptionC(initialQuestion.option_c);
      setOptionD(initialQuestion.option_d);
      setCorrectAnswer(initialQuestion.correct_answer);
      setExplanation(initialQuestion.explanation);
      setCategoryId(initialQuestion.category_id);
      setTopicId(initialQuestion.topic_id);
      setDifficulty(initialQuestion.difficulty);
      setEstimatedTime(initialQuestion.estimated_time_seconds);
      setIsPremium(initialQuestion.is_premium);
      setIsActive(initialQuestion.is_active);
      setSource(initialQuestion.source || "");
    } else {
      // Default to first category & its first topic if available
      const defaultCat = categories[0]?.id || "";
      setQuestionText("");
      setOptionA("");
      setOptionB("");
      setOptionC("");
      setOptionD("");
      setCorrectAnswer("A");
      setExplanation("");
      setCategoryId(defaultCat);
      const defaultTopic = allTopics.find((t) => t.category_id === defaultCat)?.id || "";
      setTopicId(defaultTopic);
      setDifficulty("EASY");
      setEstimatedTime(30);
      setIsPremium(false);
      setIsActive(true);
      setSource("");
    }
    setError(null);
  }, [initialQuestion, categories, allTopics, isOpen]);

  // When category changes, auto-select first matching topic
  const handleCategoryChange = (newCatId: string) => {
    setCategoryId(newCatId);
    const matchingTopics = allTopics.filter((t) => t.category_id === newCatId);
    setTopicId(matchingTopics[0]?.id || "");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!questionText.trim()) {
      setError("Question statement is required.");
      return;
    }
    if (!optionA.trim() || !optionB.trim() || !optionC.trim() || !optionD.trim()) {
      setError("All four options (A, B, C, D) are required.");
      return;
    }
    if (!explanation.trim()) {
      setError("Explanation is required so students can understand the solution.");
      return;
    }
    if (!categoryId) {
      setError("Please select a category.");
      return;
    }
    if (!topicId) {
      setError("Please select a topic.");
      return;
    }

    const payload: QuestionCreate = {
      question_text: questionText.trim(),
      option_a: optionA.trim(),
      option_b: optionB.trim(),
      option_c: optionC.trim(),
      option_d: optionD.trim(),
      correct_answer: correctAnswer,
      explanation: explanation.trim(),
      category_id: categoryId,
      topic_id: topicId,
      difficulty,
      estimated_time_seconds: Number(estimatedTime) || 30,
      is_premium: isPremium,
      is_active: isActive,
      source: source.trim() || null,
    };

    setIsSubmitting(true);
    try {
      let result: Question;
      if (isEditing && initialQuestion) {
        result = await updateQuestion(initialQuestion.id, payload);
      } else {
        result = await createQuestion(payload);
      }
      onSuccess(result);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save question");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">
              {isEditing ? "Edit Question" : "Add New Question"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isEditing
                ? "Update question details, options, and taxonomy assignment."
                : "Add a new placement-style aptitude question to the bank."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          {/* Taxonomy selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Category <span className="text-red-500">*</span>
              </label>
              <select
                value={categoryId}
                onChange={(e) => handleCategoryChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                required
              >
                <option value="" disabled>Select category</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Topic <span className="text-red-500">*</span>
              </label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                required
              >
                <option value="" disabled>Select topic</option>
                {availableTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Question Text */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Question Statement <span className="text-red-500">*</span>
            </label>
            <textarea
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              rows={3}
              placeholder="Enter the complete question text..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          {/* Options */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="font-semibold text-slate-700">
                Options & Correct Answer <span className="text-red-500">*</span>
              </label>
              <span className="text-slate-400 text-[11px]">Select the radio button next to the correct choice</span>
            </div>

            {[
              { key: "A", val: optionA, setter: setOptionA },
              { key: "B", val: optionB, setter: setOptionB },
              { key: "C", val: optionC, setter: setOptionC },
              { key: "D", val: optionD, setter: setOptionD },
            ].map(({ key, val, setter }) => (
              <div
                key={key}
                className={`flex items-center gap-2 rounded-lg border p-2 transition ${
                  correctAnswer === key
                    ? "border-emerald-500 bg-emerald-50/50"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <input
                  type="radio"
                  id={`option-${key}`}
                  name="correct_answer"
                  checked={correctAnswer === key}
                  onChange={() => setCorrectAnswer(key as "A" | "B" | "C" | "D")}
                  className="h-4 w-4 text-emerald-600 focus:ring-emerald-500 border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor={`option-${key}`}
                  className="font-bold text-slate-700 w-6 cursor-pointer"
                >
                  {key}.
                </label>
                <input
                  type="text"
                  value={val}
                  onChange={(e) => setter(e.target.value)}
                  placeholder={`Option ${key} text`}
                  className="flex-1 rounded-md border border-slate-200 bg-white p-2 text-xs text-slate-800 focus:border-brand focus:outline-none"
                  required
                />
              </div>
            ))}
          </div>

          {/* Explanation */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Explanation / Solution <span className="text-red-500">*</span>
            </label>
            <textarea
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              rows={2}
              placeholder="Explain the step-by-step logic and formula used..."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              required
            />
          </div>

          {/* Metadata: Difficulty, Time, Source */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty)}
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none"
              >
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimated Solving Time</label>
              <div className="flex items-center gap-1">
                <input
                  type="number"
                  min={5}
                  max={900}
                  value={estimatedTime}
                  onChange={(e) => setEstimatedTime(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none"
                  required
                />
                <span className="text-slate-400 font-medium">sec</span>
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Source / Attribution</label>
              <input
                type="text"
                value={source}
                onChange={(e) => setSource(e.target.value)}
                placeholder="e.g. TCS NQT 2024"
                className="w-full rounded-lg border border-slate-300 p-2.5 text-xs text-slate-800 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {/* Checkboxes: is_premium and is_active */}
          <div className="flex items-center gap-6 pt-1">
            <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
              <input
                type="checkbox"
                checked={isPremium}
                onChange={(e) => setIsPremium(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand cursor-pointer"
              />
              <span>Mark as Premium question (requires paid tier)</span>
            </label>

            {isEditing && (
              <label className="flex items-center gap-2 cursor-pointer font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                />
                <span>Active (visible in test generation)</span>
              </label>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-6">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-lg bg-brand px-5 py-2 font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : isEditing ? "Save Changes" : "Create Question"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


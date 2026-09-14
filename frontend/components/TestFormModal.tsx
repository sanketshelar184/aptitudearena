"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Category, Topic } from "@/types/admin";
import { Difficulty, Test, TestCreatePayload, TestStatus, TestUpdatePayload } from "@/types/test";
import { adminCreateTest, adminUpdateTest } from "@/lib/api";

interface TestFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  test: Test | null;
  categories: Category[];
  allTopics: Topic[];
}

export default function TestFormModal({
  isOpen,
  onClose,
  onSaved,
  test,
  categories,
  allTopics,
}: TestFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [questionCount, setQuestionCount] = useState(20);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [categoryId, setCategoryId] = useState("");
  const [topicId, setTopicId] = useState("");
  const [difficulty, setDifficulty] = useState<Difficulty | "">("");
  const [isFree, setIsFree] = useState(false);
  const [priceInr, setPriceInr] = useState(10);
  const [negativeMarkingRatio, setNegativeMarkingRatio] = useState(0.0);
  const [testStatus, setTestStatus] = useState<TestStatus>("DRAFT");

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (test) {
      setName(test.name);
      setDescription(test.description || "");
      setQuestionCount(test.question_count);
      setDurationMinutes(Math.round(test.duration_seconds / 60));
      setCategoryId(test.category_id || "");
      setTopicId(test.topic_id || "");
      setDifficulty(test.difficulty || "");
      setIsFree(test.is_free);
      setPriceInr(test.price_inr);
      setNegativeMarkingRatio(test.negative_marking_ratio);
      setTestStatus(test.status);
    } else {
      setName("");
      setDescription("");
      setQuestionCount(20);
      setDurationMinutes(15);
      setCategoryId("");
      setTopicId("");
      setDifficulty("");
      setIsFree(false);
      setPriceInr(10);
      setNegativeMarkingRatio(0.0);
      setTestStatus("DRAFT");
    }
    setError(null);
  }, [test, isOpen]);

  const filteredTopics = categoryId
    ? allTopics.filter((t) => t.category_id === categoryId)
    : allTopics;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const payload: TestCreatePayload & TestUpdatePayload = {
        name: name.trim(),
        description: description.trim() || null,
        question_count: Number(questionCount),
        duration_seconds: Number(durationMinutes) * 60,
        category_id: categoryId || null,
        topic_id: topicId || null,
        difficulty: (difficulty as Difficulty) || null,
        is_free: isFree,
        is_premium: !isFree,
        price_inr: isFree ? 0 : Number(priceInr),
        negative_marking_ratio: Number(negativeMarkingRatio),
        status: testStatus,
      };

      if (test) {
        await adminUpdateTest(test.id, payload);
      } else {
        await adminCreateTest(payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save test configuration.");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs font-sans text-ink">
      <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-slate-100 p-6">
          <div>
            <h2 className="text-lg font-bold text-ink">
              {test ? "Edit Placement Test" : "Create New Placement Test"}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure question volume, timing, difficulty, and pricing.
            </p>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-red-700">
              {error}
            </div>
          )}

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Test Name *</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. TCS NQT Quantitative Sprint #1"
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Description</label>
            <textarea
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Test objective, target companies, or syllabus focus."
              className="w-full rounded-lg border border-slate-300 p-2.5 text-slate-900 focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Question Count *</label>
              <input
                type="number"
                min={1}
                max={250}
                required
                value={questionCount}
                onChange={(e) => setQuestionCount(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Duration (Minutes) *</label>
              <input
                type="number"
                min={1}
                max={240}
                required
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={categoryId}
                onChange={(e) => {
                  setCategoryId(e.target.value);
                  setTopicId("");
                }}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              >
                <option value="">Mixed Categories</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Topic</label>
              <select
                value={topicId}
                onChange={(e) => setTopicId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              >
                <option value="">Mixed Topics</option>
                {filteredTopics.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Difficulty</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value as Difficulty | "")}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              >
                <option value="">Mixed Difficulty</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={testStatus}
                onChange={(e) => setTestStatus(e.target.value as TestStatus)}
                className="w-full rounded-lg border border-slate-300 p-2 text-slate-900 focus:border-brand focus:outline-none"
              >
                <option value="DRAFT">Draft</option>
                <option value="PUBLISHED">Published</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="is_free_toggle"
                checked={isFree}
                onChange={(e) => {
                  setIsFree(e.target.checked);
                  if (e.target.checked) setPriceInr(0);
                }}
                className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
              />
              <label htmlFor="is_free_toggle" className="font-semibold text-slate-800 cursor-pointer">
                Free Diagnostic Test (Accessible to all guests without passes)
              </label>
            </div>

            {!isFree && (
              <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-200/60">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Price (INR) *</label>
                  <input
                    type="number"
                    min={1}
                    required={!isFree}
                    value={priceInr}
                    onChange={(e) => setPriceInr(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-brand focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Negative Marking</label>
                  <select
                    value={negativeMarkingRatio}
                    onChange={(e) => setNegativeMarkingRatio(Number(e.target.value))}
                    className="w-full rounded-lg border border-slate-300 bg-white p-2 text-slate-900 focus:border-brand focus:outline-none"
                  >
                    <option value={0.0}>None (0 marks deducted)</option>
                    <option value={0.25}>-0.25 mark (TCS / Infosys)</option>
                    <option value={0.33}>-0.33 mark</option>
                    <option value={0.5}>-0.50 mark</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          <div className="border-t border-slate-100 pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
            >
              {isLoading && <Loader2 size={13} className="animate-spin" />}
              <span>{test ? "Save Changes" : "Create Test"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


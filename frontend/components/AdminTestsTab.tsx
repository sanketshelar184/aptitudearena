"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Plus,
  Search,
  Eye,
  Edit2,
  CheckCircle2,
  Archive,
  Loader2,
} from "lucide-react";
import { Category, Topic } from "@/types/admin";
import { Test } from "@/types/test";
import { adminGetTests, adminPublishTest, adminArchiveTest } from "@/lib/api";
import TestFormModal from "./TestFormModal";
import TestPreviewModal from "./TestPreviewModal";

interface AdminTestsTabProps {
  categories: Category[];
  allTopics: Topic[];
  onMessage: (msg: string) => void;
  onError: (err: string) => void;
}

export default function AdminTestsTab({
  categories,
  allTopics,
  onMessage,
  onError,
}: AdminTestsTabProps) {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState("");

  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [previewTest, setPreviewTest] = useState<Test | null>(null);
  const [isActionLoading, setIsActionLoading] = useState<string | null>(null);

  const loadTests = useCallback(() => {
    setIsLoading(true);
    adminGetTests()
      .then(setTests)
      .catch((err: unknown) => {
        onError(err instanceof Error ? err.message : "Failed to load tests list.");
      })
      .finally(() => setIsLoading(false));
  }, [onError]);

  useEffect(() => {
    loadTests();
  }, [loadTests]);

  const handlePublish = async (testId: string) => {
    setIsActionLoading(testId);
    try {
      await adminPublishTest(testId);
      onMessage("Test published successfully to students.");
      loadTests();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to publish test.");
    } finally {
      setIsActionLoading(null);
    }
  };

  const handleArchive = async (testId: string) => {
    setIsActionLoading(testId);
    try {
      await adminArchiveTest(testId);
      onMessage("Test archived successfully.");
      loadTests();
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Failed to archive test.");
    } finally {
      setIsActionLoading(null);
    }
  };

  const filteredTests = tests.filter((t) => {
    if (statusFilter && t.status !== statusFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = t.name.toLowerCase().includes(term);
      const matchCategory = (t.category_name || "").toLowerCase().includes(term);
      const matchTopic = (t.topic_name || "").toLowerCase().includes(term);
      if (!matchName && !matchCategory && !matchTopic) return false;
    }
    return true;
  });

  return (
    <div className="mt-6 space-y-6">
      {/* Action and Filter Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-ink">Test Bank & Assessment Configurations</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Configure test questions, timing, syllabus categories, pricing, and live availability.
          </p>
        </div>

        <button
          onClick={() => {
            setEditingTest(null);
            setIsFormOpen(true);
          }}
          className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
        >
          <Plus size={14} />
          <span>Create Test</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search test by name, category, or topic..."
            className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-900 focus:border-brand focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-lg border border-slate-300 p-2 text-xs text-slate-900 focus:border-brand focus:outline-none w-full sm:w-44"
        >
          <option value="">All Statuses</option>
          <option value="PUBLISHED">Published Only</option>
          <option value="DRAFT">Draft Only</option>
          <option value="ARCHIVED">Archived Only</option>
        </select>
      </div>

      {/* Tests Table */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-20 text-center text-slate-400">
            <Loader2 size={32} className="animate-spin text-brand mx-auto mb-2" />
            <p className="text-xs font-medium">Loading test catalog...</p>
          </div>
        ) : filteredTests.length === 0 ? (
          <div className="py-16 text-center text-slate-500 px-4">
            <p className="text-sm font-bold text-ink">No tests found</p>
            <p className="text-xs text-slate-400 mt-1">Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3.5 px-6">Test Details</th>
                  <th className="py-3.5 px-4">Syllabus Scope</th>
                  <th className="py-3.5 px-4">Volume & Duration</th>
                  <th className="py-3.5 px-4">Price (INR)</th>
                  <th className="py-3.5 px-4">Difficulty</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTests.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/60 transition">
                    <td className="py-4 px-6 font-semibold text-ink">
                      <p>{t.name}</p>
                      {t.description && (
                        <p className="text-[11px] font-normal text-slate-400 mt-0.5 line-clamp-1">
                          {t.description}
                        </p>
                      )}
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <p className="font-semibold text-ink">{t.category_name || "Mixed Categories"}</p>
                      <p className="text-[11px] text-slate-400">{t.topic_name || "All Topics"}</p>
                    </td>
                    <td className="py-4 px-4 text-slate-600">
                      <p>{t.question_count} Questions</p>
                      <p className="text-[11px] text-slate-400">
                        {Math.round(t.duration_seconds / 60)} Minutes
                      </p>
                    </td>
                    <td className="py-4 px-4">
                      {t.is_free ? (
                        <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700 border border-emerald-200">
                          FREE
                        </span>
                      ) : (
                        <span className="font-bold text-ink">₹{t.price_inr}</span>
                      )}
                    </td>
                    <td className="py-4 px-4">
                      <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
                        {t.difficulty || "Mixed"}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span
                        className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                          t.status === "PUBLISHED"
                            ? "bg-emerald-50 text-emerald-700"
                            : t.status === "DRAFT"
                            ? "bg-amber-50 text-amber-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">
                      <div className="flex items-center justify-end gap-3">
                        <button
                          onClick={() => setPreviewTest(t)}
                          className="inline-flex items-center gap-1 font-semibold text-slate-600 hover:text-ink transition"
                          title="Preview pool match"
                        >
                          <Eye size={13} />
                          <span>Preview</span>
                        </button>

                        <button
                          onClick={() => {
                            setEditingTest(t);
                            setIsFormOpen(true);
                          }}
                          className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                        >
                          <Edit2 size={13} />
                          <span>Edit</span>
                        </button>

                        {t.status !== "PUBLISHED" ? (
                          <button
                            onClick={() => handlePublish(t.id)}
                            disabled={isActionLoading === t.id}
                            className="inline-flex items-center gap-1 font-semibold text-emerald-600 hover:underline disabled:opacity-50"
                          >
                            {isActionLoading === t.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <CheckCircle2 size={12} />
                            )}
                            <span>Publish</span>
                          </button>
                        ) : (
                          <button
                            onClick={() => handleArchive(t.id)}
                            disabled={isActionLoading === t.id}
                            className="inline-flex items-center gap-1 font-semibold text-slate-500 hover:text-red-600 disabled:opacity-50"
                          >
                            {isActionLoading === t.id ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <Archive size={12} />
                            )}
                            <span>Archive</span>
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modals */}
      <TestFormModal
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingTest(null);
        }}
        onSaved={() => {
          onMessage("Test configuration saved successfully.");
          loadTests();
        }}
        test={editingTest}
        categories={categories}
        allTopics={allTopics}
      />

      <TestPreviewModal
        isOpen={Boolean(previewTest)}
        onClose={() => setPreviewTest(null)}
        test={previewTest}
      />
    </div>
  );
}

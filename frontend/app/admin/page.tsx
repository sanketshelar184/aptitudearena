"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Plus,
  Upload,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Loader2,
} from "lucide-react";

import Navbar from "@/components/Navbar";
import QuestionPreviewModal from "@/components/QuestionPreviewModal";
import QuestionFormModal from "@/components/QuestionFormModal";
import ProductFormModal from "@/components/ProductFormModal";
import CsvImportModal from "@/components/CsvImportModal";
import CsvTemplateGuideModal from "@/components/CsvTemplateGuideModal";
import AdminAnalyticsTab from "@/components/AdminAnalyticsTab";
import AdminTestsTab from "@/components/AdminTestsTab";
import { Category, Difficulty, Question, Topic } from "@/types/admin";
import { Product } from "@/types/commerce";
import {
  activateQuestion,
  adminGetProducts,
  deactivateQuestion,
  getCategories,
  getQuestions,
  getTopics,
} from "@/lib/api";
import { isAdmin, isAuthenticated } from "@/lib/auth";

export default function AdminDashboardPage() {
  const router = useRouter();

  // Auth check
  const [authChecked, setAuthChecked] = useState(false);

  // Taxonomy
  const [categories, setCategories] = useState<Category[]>([]);
  const [allTopics, setAllTopics] = useState<Topic[]>([]);

  // Questions table state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 15;
  const [isLoading, setIsLoading] = useState(true);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedTopic, setSelectedTopic] = useState("");
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("");
  const [selectedStatus, setSelectedStatus] = useState<string>(""); // all, active, inactive

  // Modals state
  const [previewQuestion, setPreviewQuestion] = useState<Question | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isCsvImportOpen, setIsCsvImportOpen] = useState(false);
  const [isCsvGuideOpen, setIsCsvGuideOpen] = useState(false);
  const [deactivatingId, setDeactivatingId] = useState<string | null>(null);

  // Navigation Tabs state
  const [activeTab, setActiveTab] = useState<"questions" | "tests" | "products" | "analytics">("questions");
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductsLoading, setIsProductsLoading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);

  const loadProducts = useCallback(() => {
    setIsProductsLoading(true);
    adminGetProducts()
      .then(setProducts)
      .catch((err: unknown) => {
        setActionError(err instanceof Error ? err.message : "Failed to load products");
      })
      .finally(() => setIsProductsLoading(false));
  }, []);

  // 1. Initial auth verification
  useEffect(() => {
    if (!isAuthenticated() || !isAdmin()) {
      router.push("/admin/login");
    } else {
      setAuthChecked(true);
    }
  }, [router]);

  // 2. Fetch taxonomy
  useEffect(() => {
    if (!authChecked) return;
    Promise.all([getCategories(), getTopics()])
      .then(([cats, tops]) => {
        setCategories(cats);
        setAllTopics(tops);
      })
      .catch((err) => {
        console.error("Failed to load taxonomy:", err);
      });
  }, [authChecked]);

  // 3. Fetch questions
  const loadQuestions = useCallback(async () => {
    if (!authChecked) return;
    setIsLoading(true);
    setActionError(null);
    try {
      const activeFilter =
        selectedStatus === "active" ? true : selectedStatus === "inactive" ? false : undefined;

      const response = await getQuestions({
        page: currentPage,
        pageSize,
        search: searchTerm.trim() || undefined,
        categoryId: selectedCategory || undefined,
        topicId: selectedTopic || undefined,
        difficulty: (selectedDifficulty as Difficulty) || undefined,
        isActive: activeFilter,
      });
      setQuestions(response.items);
      setTotalCount(response.total);
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Failed to load questions");
    } finally {
      setIsLoading(false);
    }
  }, [authChecked, currentPage, searchTerm, selectedCategory, selectedTopic, selectedDifficulty, selectedStatus]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  // Category mapping helpers
  const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
  const topicMap = new Map(allTopics.map((t) => [t.id, t.name]));

  // Handlers
  const handleCategoryFilterChange = (catId: string) => {
    setSelectedCategory(catId);
    setSelectedTopic("");
    setCurrentPage(1);
  };

  const handleDeactivateToggle = async (question: Question) => {
    setDeactivatingId(question.id);
    setActionError(null);
    try {
      if (question.is_active) {
        await deactivateQuestion(question.id);
        setActionSuccess(`Question successfully deactivated.`);
      } else {
        await activateQuestion(question.id);
        setActionSuccess(`Question successfully reactivated.`);
      }
      loadQuestions();
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setDeactivatingId(null);
    }
  };

  const totalPages = Math.ceil(totalCount / pageSize) || 1;

  if (!authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 text-xs font-semibold text-slate-500">
        Checking admin permissions...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-ink">
      <Navbar variant="admin" />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {/* Top heading and quick stats */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200/80 pb-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-brand">Question Bank Operations</span>
            <h1 className="text-2xl font-bold tracking-tight text-ink mt-0.5">
              Question Management
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Curate, filter, preview, and import aptitude questions without writing code.
            </p>
          </div>

          {/* Action buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCsvGuideOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 shadow-sm transition"
              title="View format rules and download template"
            >
              <HelpCircle size={14} className="text-slate-500" />
              <span>CSV Template & Guide</span>
            </button>

            <button
              onClick={() => setIsCsvImportOpen(true)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 shadow-sm transition"
            >
              <Upload size={14} className="text-brand" />
              <span>Import CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingQuestion(null);
                setIsFormOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition"
            >
              <Plus size={15} />
              <span>Add Question</span>
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Questions</p>
            <p className="text-2xl font-bold text-ink mt-1">{totalCount}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Active in Pool</p>
            <p className="text-2xl font-bold text-emerald-600 mt-1">
              {questions.filter((q) => q.is_active).length} <span className="text-xs font-normal text-slate-400">(on page)</span>
            </p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Categories</p>
            <p className="text-2xl font-bold text-ink mt-1">{categories.length}</p>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Topics Available</p>
            <p className="text-2xl font-bold text-ink mt-1">{allTopics.length}</p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="mt-6 flex flex-wrap items-center gap-2 border-b border-slate-200 pb-2">
          <button
            onClick={() => setActiveTab("questions")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "questions"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Questions Bank ({totalCount})
          </button>
          <button
            onClick={() => setActiveTab("tests")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "tests"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Test Management
          </button>
          <button
            onClick={() => {
              setActiveTab("products");
              loadProducts();
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "products"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Pricing & Commercial Products
          </button>
          <button
            onClick={() => setActiveTab("analytics")}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition ${
              activeTab === "analytics"
                ? "bg-slate-900 text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            Business Analytics & Revenue
          </button>
        </div>

        {/* Banners */}
        {actionSuccess && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-emerald-200 bg-emerald-50 p-3.5 text-xs text-emerald-800">
            <div className="flex items-center gap-2">
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-emerald-700 hover:text-emerald-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}
        {actionError && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} className="text-red-600 shrink-0" />
              <span>{actionError}</span>
            </div>
            <button
              onClick={() => setActionError(null)}
              className="text-red-700 hover:text-red-900 font-semibold"
            >
              Dismiss
            </button>
          </div>
        )}

        {activeTab === "analytics" ? (
          <AdminAnalyticsTab />
        ) : activeTab === "tests" ? (
          <AdminTestsTab
            categories={categories}
            allTopics={allTopics}
            onMessage={setActionSuccess}
            onError={setActionError}
          />
        ) : activeTab === "products" ? (
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 p-5">
              <div>
                <h2 className="text-base font-bold text-ink">Commercial Products & Pricing</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure student test pricing, subscription fees, question limits, and active status.
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingProduct(null);
                  setIsProductModalOpen(true);
                }}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition"
              >
                <Plus size={14} />
                <span>Add Product</span>
              </button>
            </div>

            {isProductsLoading ? (
              <div className="py-16 text-center text-slate-400">
                <Loader2 size={24} className="animate-spin text-brand mx-auto mb-2" />
                <p className="text-xs">Loading products...</p>
              </div>
            ) : products.length === 0 ? (
              <div className="py-16 text-center text-slate-500">
                <p className="text-sm font-semibold">No commercial products configured</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                    <tr>
                      <th className="py-3.5 px-6">Product Name</th>
                      <th className="py-3.5 px-4">Type</th>
                      <th className="py-3.5 px-4">Price (INR)</th>
                      <th className="py-3.5 px-4">Limit / Duration</th>
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-6 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {products.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-4 px-6 font-semibold text-ink">
                          <p>{p.name}</p>
                          {p.description && (
                            <p className="text-[11px] font-normal text-slate-400 mt-0.5">{p.description}</p>
                          )}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              p.product_type === "SUBSCRIPTION"
                                ? "bg-purple-50 text-purple-700 border border-purple-200"
                                : "bg-blue-50 text-brand border border-blue-200"
                            }`}
                          >
                            {p.product_type}
                          </span>
                        </td>
                        <td className="py-4 px-4 font-bold text-ink">
                          ₹{p.price_inr}{" "}
                          <span className="text-[10px] font-normal text-slate-400">({p.price_paise} paise)</span>
                        </td>
                        <td className="py-4 px-4 text-slate-600">
                          {p.product_type === "SUBSCRIPTION"
                            ? `${p.billing_interval_days || 30} days billing`
                            : `${p.question_limit || 20} Qs · ${p.duration_seconds ? Math.round(p.duration_seconds / 60) : 15} mins`}
                        </td>
                        <td className="py-4 px-4">
                          <span
                            className={`inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold ${
                              p.is_active
                                ? "bg-emerald-50 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {p.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => {
                              setEditingProduct(p);
                              setIsProductModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 font-semibold text-brand hover:underline"
                          >
                            <Edit2 size={13} />
                            <span>Edit</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ) : (
          <div>
            {/* Filter and Search Bar */}
            <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-6">
            {/* Search Input */}
            <div className="lg:col-span-2">
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Search Stem / Solution
              </label>
              <div className="relative">
                <Search size={14} className="absolute left-3 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => {
                    setSearchTerm(e.target.value);
                    setCurrentPage(1);
                  }}
                  placeholder="Type keyword or phrase..."
                  className="w-full rounded-lg border border-slate-300 pl-9 pr-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                />
              </div>
            </div>

            {/* Category Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Category
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => handleCategoryFilterChange(e.target.value)}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand focus:outline-none"
              >
                <option value="">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat.id} value={cat.id}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Topic Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Topic
              </label>
              <select
                value={selectedTopic}
                onChange={(e) => {
                  setSelectedTopic(e.target.value);
                  setCurrentPage(1);
                }}
                disabled={!selectedCategory}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand focus:outline-none disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="">All Topics</option>
                {allTopics
                  .filter((t) => !selectedCategory || t.category_id === selectedCategory)
                  .map((top) => (
                    <option key={top.id} value={top.id}>
                      {top.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Difficulty Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Difficulty
              </label>
              <select
                value={selectedDifficulty}
                onChange={(e) => {
                  setSelectedDifficulty(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand focus:outline-none"
              >
                <option value="">All Difficulties</option>
                <option value="EASY">Easy</option>
                <option value="MEDIUM">Medium</option>
                <option value="HARD">Hard</option>
              </select>
            </div>

            {/* Status Filter */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide mb-1">
                Status
              </label>
              <select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-lg border border-slate-300 p-2 text-xs text-slate-800 focus:border-brand focus:outline-none"
              >
                <option value="">All Statuses</option>
                <option value="active">Active Only</option>
                <option value="inactive">Inactive Only</option>
              </select>
            </div>
          </div>
        </div>

        {/* Questions Table */}
        <div className="mt-6 rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs divide-y divide-slate-200">
              <thead className="bg-slate-50 text-slate-600 font-semibold">
                <tr>
                  <th scope="col" className="py-3.5 pl-4 pr-3 sm:pl-6">Question Text</th>
                  <th scope="col" className="px-3 py-3.5">Taxonomy</th>
                  <th scope="col" className="px-3 py-3.5">Difficulty</th>
                  <th scope="col" className="px-3 py-3.5">Tier</th>
                  <th scope="col" className="px-3 py-3.5">Status</th>
                  <th scope="col" className="px-3 py-3.5">Time</th>
                  <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-400">
                      <div className="inline-flex items-center gap-2 font-medium">
                        <RefreshCw size={16} className="animate-spin text-brand" />
                        <span>Loading questions from bank...</span>
                      </div>
                    </td>
                  </tr>
                ) : questions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500">
                      <p className="font-semibold text-sm text-slate-700">No questions found</p>
                      <p className="text-xs text-slate-400 mt-1">
                        Try adjusting your filters, or click &ldquo;Add Question&rdquo; to create one.
                      </p>

                    </td>
                  </tr>
                ) : (
                  questions.map((q) => {
                    const catName = categoryMap.get(q.category_id) || "—";
                    const topName = topicMap.get(q.topic_id) || "—";
                    const isDeactivating = deactivatingId === q.id;

                    const difficultyBadge = {
                      EASY: "bg-emerald-50 text-emerald-700 border-emerald-200",
                      MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
                      HARD: "bg-red-50 text-red-700 border-red-200",
                    }[q.difficulty];

                    return (
                      <tr key={q.id} className="hover:bg-slate-50/60 transition">
                        <td className="py-3 pl-4 pr-3 sm:pl-6 max-w-md">
                          <p className="font-medium text-ink line-clamp-2 leading-snug">
                            {q.question_text}
                          </p>
                          {q.source && (
                            <p className="text-[11px] text-slate-400 mt-0.5">
                              Source: {q.source}
                            </p>
                          )}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <div className="text-slate-800 font-medium">{topName}</div>
                          <div className="text-[11px] text-slate-400">{catName}</div>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[11px] font-semibold border ${difficultyBadge}`}>
                            {q.difficulty}
                          </span>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          {q.is_premium ? (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                              Premium
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-[11px] font-semibold bg-blue-50 text-brand border border-blue-200">
                              Free
                            </span>
                          )}
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-medium border ${
                              q.is_active
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-slate-100 text-slate-500 border-slate-200"
                            }`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${q.is_active ? "bg-emerald-600" : "bg-slate-400"}`} />
                            {q.is_active ? "Active" : "Inactive"}
                          </span>
                        </td>

                        <td className="px-3 py-3 whitespace-nowrap text-slate-600 font-mono text-[11px]">
                          {q.estimated_time_seconds}s
                        </td>

                        <td className="py-3 pl-3 pr-4 sm:pr-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => setPreviewQuestion(q)}
                              className="rounded p-1.5 text-slate-500 hover:bg-blue-50 hover:text-brand transition"
                              title="Preview complete question and explanation"
                            >
                              <Eye size={15} />
                            </button>

                            <button
                              onClick={() => {
                                setEditingQuestion(q);
                                setIsFormOpen(true);
                              }}
                              className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800 transition"
                              title="Edit question"
                            >
                              <Edit2 size={14} />
                            </button>

                            <button
                              onClick={() => handleDeactivateToggle(q)}
                              disabled={isDeactivating}
                              className={`rounded p-1.5 transition ${
                                q.is_active
                                  ? "text-slate-400 hover:bg-red-50 hover:text-red-700"
                                  : "text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                              }`}
                              title={q.is_active ? "Deactivate question" : "Reactivate question"}
                            >
                              {q.is_active ? <Trash2 size={14} /> : <RefreshCw size={14} />}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination bar */}
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 sm:px-6">
            <div className="text-xs text-slate-500">
              Showing{" "}
              <span className="font-semibold text-slate-800">
                {totalCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
              </span>{" "}
              to{" "}
              <span className="font-semibold text-slate-800">
                {Math.min(currentPage * pageSize, totalCount)}
              </span>{" "}
              of <span className="font-semibold text-slate-800">{totalCount}</span> questions
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <ChevronLeft size={14} />
                <span>Prev</span>
              </button>

              <span className="text-xs font-medium text-slate-600 px-1">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage >= totalPages || isLoading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition"
              >
                <span>Next</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </main>

      {/* Modals */}
      <QuestionPreviewModal
        question={previewQuestion}
        categoryName={previewQuestion ? categoryMap.get(previewQuestion.category_id) : ""}
        topicName={previewQuestion ? topicMap.get(previewQuestion.topic_id) : ""}
        onClose={() => setPreviewQuestion(null)}
      />

      <QuestionFormModal
        isOpen={isFormOpen}
        initialQuestion={editingQuestion}
        categories={categories}
        allTopics={allTopics}
        onClose={() => {
          setIsFormOpen(false);
          setEditingQuestion(null);
        }}
        onSuccess={() => {
          setActionSuccess(
            editingQuestion ? "Question updated successfully." : "New question added to bank."
          );
          loadQuestions();
        }}
      />

      <ProductFormModal
        isOpen={isProductModalOpen}
        product={editingProduct}
        onClose={() => {
          setIsProductModalOpen(false);
          setEditingProduct(null);
        }}
        onSaved={() => {
          setActionSuccess("Product saved successfully.");
          loadProducts();
        }}
      />

      <CsvImportModal
        isOpen={isCsvImportOpen}
        onClose={() => setIsCsvImportOpen(false)}
        onImportSuccess={(count) => {
          setActionSuccess(`Successfully imported ${count} question(s) into the bank.`);
          loadQuestions();
        }}
      />

      <CsvTemplateGuideModal
        isOpen={isCsvGuideOpen}
        onClose={() => setIsCsvGuideOpen(false)}
      />
    </div>
  );
}


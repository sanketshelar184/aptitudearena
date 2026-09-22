"use client";

import { useEffect, useState, Suspense, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Clock,
  HelpCircle,
  ArrowRight,
  Zap,
  Sparkles,
  Loader2,
  SlidersHorizontal,
  CheckCircle2,
  Crown,
  Folder,
  FolderOpen,
  ChevronRight,
  Calculator,
  Brain,
  BookOpen,
  Code2,
  Building2,
  Layers,
  Check,
} from "lucide-react";
import { getPublishedTests, startTest, getUserMembership } from "@/lib/api";
import { getToken } from "@/lib/auth";
import { Test } from "@/types/test";
import { MembershipStatus } from "@/types/commerce";
import Navbar from "@/components/Navbar";

interface FolderDefinition {
  key: string;
  name: string;
  shortName: string;
  description: string;
  badgeColor: string;
  iconBg: string;
  borderColor: string;
  accentBg: string;
  icon: typeof Calculator;
  tags: string[];
}

const FOLDERS: FolderDefinition[] = [
  {
    key: "aptitude",
    name: "Quantitative Aptitude",
    shortName: "Aptitude",
    description: "Speed arithmetic, percentages, profit & loss, ratios, time & work, geometry, and numerical problems.",
    badgeColor: "text-blue-700 bg-blue-50 border-blue-200",
    iconBg: "bg-blue-600 text-white",
    borderColor: "border-blue-200 hover:border-blue-400",
    accentBg: "bg-blue-50/60",
    icon: Calculator,
    tags: ["Percentages", "Time & Work", "Ratios", "Geometry", "Speed Math"],
  },
  {
    key: "logical",
    name: "Logical Reasoning",
    shortName: "Reasoning",
    description: "Analytical deduction, seating arrangements, syllogisms, blood relations, and non-verbal puzzles.",
    badgeColor: "text-purple-700 bg-purple-50 border-purple-200",
    iconBg: "bg-purple-600 text-white",
    borderColor: "border-purple-200 hover:border-purple-400",
    accentBg: "bg-purple-50/60",
    icon: Brain,
    tags: ["Puzzles", "Syllogisms", "Non-Verbal", "Blood Relations", "Sequences"],
  },
  {
    key: "verbal",
    name: "Verbal Ability",
    shortName: "Verbal",
    description: "Reading comprehension, grammatical rules, error spotting, vocabulary, and sentence rearrangement.",
    badgeColor: "text-emerald-700 bg-emerald-50 border-emerald-200",
    iconBg: "bg-emerald-600 text-white",
    borderColor: "border-emerald-200 hover:border-emerald-400",
    accentBg: "bg-emerald-50/60",
    icon: BookOpen,
    tags: ["Grammar", "Reading Comprehension", "Vocabulary", "Sentence Correction"],
  },
  {
    key: "technical",
    name: "Technical CS / IT",
    shortName: "Technical",
    description: "C/C++, OOPs concepts, Data Structures, Algorithms, DBMS, Operating Systems, and coding questions.",
    badgeColor: "text-sky-700 bg-sky-50 border-sky-200",
    iconBg: "bg-sky-600 text-white",
    borderColor: "border-sky-200 hover:border-sky-400",
    accentBg: "bg-sky-50/60",
    icon: Code2,
    tags: ["C / C++", "OOPs", "Data Structures", "DBMS", "Operating Systems"],
  },
  {
    key: "company",
    name: "Company Placement Sprints",
    shortName: "Company Papers",
    description: "Official pattern-calibrated tests for TCS NQT, Infosys DSE/SE, Wipro NLTH, and Tech Mahindra.",
    badgeColor: "text-amber-700 bg-amber-50 border-amber-200",
    iconBg: "bg-amber-600 text-white",
    borderColor: "border-amber-200 hover:border-amber-400",
    accentBg: "bg-amber-50/60",
    icon: Building2,
    tags: ["TCS NQT", "Infosys DSE/SE", "Wipro NLTH", "Tech Mahindra"],
  },
];

function testMatchesFolder(test: Test, folderKey: string): boolean {
  if (folderKey === "ALL") return true;
  const name = test.name.toLowerCase();
  const cat = (test.category_name || "").toLowerCase();

  if (folderKey === "aptitude") {
    return (
      test.folder_key === "aptitude" ||
      cat.includes("quantitative") ||
      name.includes("quantitative") ||
      name.includes("speed test") ||
      name.includes("numerical")
    );
  }
  if (folderKey === "logical") {
    return (
      test.folder_key === "logical" ||
      cat.includes("logical") ||
      name.includes("logical") ||
      name.includes("deduction") ||
      name.includes("puzzles")
    );
  }
  if (folderKey === "verbal") {
    return (
      test.folder_key === "verbal" ||
      cat.includes("verbal") ||
      name.includes("verbal") ||
      name.includes("grammar") ||
      name.includes("reading")
    );
  }
  if (folderKey === "technical") {
    return (
      test.folder_key === "technical" ||
      cat.includes("technical") ||
      name.includes("technical") ||
      name.includes("c/c++") ||
      name.includes("systems") ||
      name.includes("engineer")
    );
  }
  if (folderKey === "company") {
    return (
      Boolean(test.company_name) ||
      test.folder_key === "company" ||
      name.includes("tcs") ||
      name.includes("infosys") ||
      name.includes("wipro") ||
      name.includes("mahindra")
    );
  }
  return false;
}

function TestsCatalogContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const passActivated = searchParams.get("pass_activated") === "true";
  const initialFolder = searchParams.get("folder") || "ALL";

  const [tests, setTests] = useState<Test[]>([]);
  const [membership, setMembership] = useState<MembershipStatus | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [startingTestId, setStartingTestId] = useState<string | null>(null);
  const [selectedFolder, setSelectedFolder] = useState<string>(initialFolder);
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>("ALL");
  const [companySubFilter, setCompanySubFilter] = useState<string>("ALL");

  useEffect(() => {
    getPublishedTests()
      .then(setTests)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load test catalog.");
      })
      .finally(() => setIsLoading(false));

    if (getToken()) {
      getUserMembership()
        .then(setMembership)
        .catch(() => {});
    }
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

  const isAdmin = membership?.role === "ADMIN";

  const freeTest = useMemo(() => {
    return tests.find((t) => t.name.toLowerCase().includes("diagnostic")) || tests.find((t) => t.is_free);
  }, [tests]);

  const catalogTests = useMemo(() => {
    return tests.filter((t) => t.id !== freeTest?.id);
  }, [tests, freeTest]);

  // Folder selection helper with URL update
  const handleSelectFolder = (folderKey: string) => {
    setSelectedFolder(folderKey);
    setCompanySubFilter("ALL");
    const params = new URLSearchParams(window.location.search);
    if (folderKey === "ALL") {
      params.delete("folder");
    } else {
      params.set("folder", folderKey);
    }
    const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
    window.history.pushState({}, "", newUrl);
  };

  const activeFolderDef = useMemo(() => {
    return FOLDERS.find((f) => f.key === selectedFolder) || null;
  }, [selectedFolder]);

  // Filter tests by folder, difficulty, and company
  const displayedTests = useMemo(() => {
    return catalogTests.filter((t) => {
      // 1. Folder match
      if (!testMatchesFolder(t, selectedFolder)) return false;

      // 2. Difficulty match
      if (selectedDifficulty !== "ALL") {
        const diff = (t.difficulty || "MEDIUM").toUpperCase();
        if (diff !== selectedDifficulty) return false;
      }

      // 3. Company sub-filter (only active if in company folder)
      if (selectedFolder === "company" && companySubFilter !== "ALL") {
        const name = t.name.toLowerCase();
        const comp = (t.company_name || "").toLowerCase();
        if (companySubFilter === "TCS" && !name.includes("tcs") && !comp.includes("tcs")) return false;
        if (companySubFilter === "Infosys" && !name.includes("infosys") && !comp.includes("infosys")) return false;
        if (companySubFilter === "Wipro" && !name.includes("wipro") && !comp.includes("wipro")) return false;
        if (companySubFilter === "Tech Mahindra" && !name.includes("mahindra") && !comp.includes("mahindra")) return false;
      }

      return true;
    });
  }, [catalogTests, selectedFolder, selectedDifficulty, companySubFilter]);

  const difficulties = [
    { key: "ALL", label: "All Difficulties" },
    { key: "EASY", label: "🟢 Easy (Foundational)" },
    { key: "MEDIUM", label: "🟡 Medium (Placement Standard)" },
    { key: "HARD", label: "🔴 Hard (Advanced)" },
  ];

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

  const renderTestCard = (t: Test) => (
    <div
      key={t.id}
      className="flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs hover:border-slate-300 hover:shadow-xs transition"
    >
      <div>
        <div className="flex items-center justify-between gap-2">
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700 truncate max-w-[170px]">
            {t.company_name ? `🏢 ${t.company_name}` : t.category_name || "General Aptitude"}
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
            {isAdmin ? (
              <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                <Crown size={12} className="text-amber-500" /> Free (Admin)
              </span>
            ) : t.price_inr > 0 ? (
              `₹${t.price_inr}`
            ) : (
              <span className="text-emerald-600 font-bold">Free</span>
            )}
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
          className={`inline-flex items-center gap-1.5 rounded-xl px-3.5 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 shadow-2xs ${
            isAdmin
              ? "bg-amber-600 hover:bg-amber-700"
              : (membership?.available_test_credits ?? 0) > 0 || membership?.is_subscribed
              ? "bg-emerald-600 hover:bg-emerald-700"
              : "bg-slate-900 hover:bg-slate-800"
          }`}
        >
          {startingTestId === t.id ? (
            <>
              <Loader2 size={13} className="animate-spin" />
              <span>Starting...</span>
            </>
          ) : (
            <>
              <span>
                {isAdmin
                  ? "Start Test (Admin Free)"
                  : membership?.is_subscribed
                  ? "Start Test (Pro)"
                  : (membership?.available_test_credits ?? 0) > 0
                  ? "Use Pass & Start"
                  : "Start Test"}
              </span>
              <ArrowRight size={13} />
            </>
          )}
        </button>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-ink">
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-10">
        {/* Admin All-Access Banner */}
        {isAdmin && (
          <div className="mb-8 rounded-2xl border-2 border-amber-300 bg-linear-to-r from-amber-50 via-orange-50 to-amber-50 p-4 sm:p-5 text-amber-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-xs">
                <Crown size={24} />
              </div>
              <div>
                <p className="font-extrabold text-sm sm:text-base text-amber-950 flex items-center gap-2">
                  Admin All-Access Enabled
                  <span className="rounded-full bg-amber-200 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-900 border border-amber-300">
                    Free For Admin
                  </span>
                </p>
                <p className="text-xs text-amber-800 mt-0.5">
                  All tests, placement sprints, and visual exams are completely free and unlocked for your admin account. You can start and inspect any exam without purchasing passes.
                </p>
              </div>
            </div>
            <span className="shrink-0 rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-900 border border-amber-300">
              👑 Unrestricted Testing
            </span>
          </div>
        )}

        {/* Pass Activation Celebration Banner */}
        {passActivated && (
          <div className="mb-8 rounded-2xl border-2 border-emerald-300 bg-emerald-50/90 p-4 sm:p-5 text-emerald-950 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm animate-in fade-in slide-in-from-top-3">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="font-extrabold text-sm sm:text-base text-emerald-950">
                  🎉 Practice Pass Active & Ready!
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Your pass has been loaded. Click <strong>&ldquo;Use Pass & Start&rdquo;</strong> on <strong>ANY test below</strong> to begin your timed attempt.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Page Hero */}
        <div className="max-w-2xl">
          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-brand border border-blue-200 uppercase tracking-wider">
            <Zap size={13} /> Placement Practice Bank
          </span>
          <h1 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
            Aptitude Tests & Sprints
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Engineered to simulate real TCS, Infosys, Wipro, Cognizant, and product-company placement exams. Choose a folder below to explore tests by domain or company.
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
                        "Experience standard campus placement test conditions. Evaluate your Quantitative arithmetic, Logical reasoning, and Verbal clarity with 20 balanced questions in 20 minutes."}
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

            {/* Folder Subparts Directory (Interactive Folder Cards) */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider inline-flex items-center gap-1.5">
                  <Folder size={14} className="text-brand" /> Test Folders & Subparts
                </span>
                {selectedFolder !== "ALL" && (
                  <button
                    onClick={() => handleSelectFolder("ALL")}
                    className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1"
                  >
                    <span>View All Folders</span>
                    <ChevronRight size={13} />
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
                {FOLDERS.map((f) => {
                  const Icon = f.icon;
                  const isSelected = selectedFolder === f.key;
                  const count = catalogTests.filter((t) => testMatchesFolder(t, f.key)).length;

                  return (
                    <button
                      key={f.key}
                      onClick={() => handleSelectFolder(isSelected ? "ALL" : f.key)}
                      className={`text-left rounded-xl p-4 transition border relative flex flex-col justify-between ${
                        isSelected
                          ? "border-brand bg-brand/5 shadow-xs ring-2 ring-brand/20"
                          : "border-slate-200 bg-white hover:border-slate-300 hover:shadow-2xs"
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${f.iconBg}`}>
                            <Icon size={16} />
                          </div>
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                            isSelected ? "bg-brand text-white" : "bg-slate-100 text-slate-600"
                          }`}>
                            {count} {count === 1 ? "Test" : "Tests"}
                          </span>
                        </div>
                        <h4 className="mt-3 font-bold text-sm text-ink flex items-center gap-1">
                          {isSelected ? <FolderOpen size={14} className="text-brand" /> : <Folder size={14} className="text-slate-400" />}
                          {f.shortName}
                        </h4>
                        <p className="mt-1 text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                          {f.description}
                        </p>
                      </div>

                      <div className="mt-3 pt-2 border-t border-slate-100/80 flex items-center justify-between text-[11px] font-semibold">
                        <span className={isSelected ? "text-brand" : "text-slate-400"}>
                          {isSelected ? "Active Folder" : "Open Folder"}
                        </span>
                        <ChevronRight size={13} className={isSelected ? "text-brand" : "text-slate-400"} />
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Folder Subpart Tabs Bar & Filters */}
            <div className="space-y-3 pt-2">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                {/* Folder Pills */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-1 inline-flex items-center gap-1">
                    <Layers size={13} /> Subpart:
                  </span>
                  <button
                    onClick={() => handleSelectFolder("ALL")}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                      selectedFolder === "ALL"
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-ink"
                    }`}
                  >
                    <span>All Folders</span>
                    <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${selectedFolder === "ALL" ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                      {catalogTests.length}
                    </span>
                  </button>

                  {FOLDERS.map((f) => {
                    const isSelected = selectedFolder === f.key;
                    const count = catalogTests.filter((t) => testMatchesFolder(t, f.key)).length;
                    const Icon = f.icon;

                    return (
                      <button
                        key={f.key}
                        onClick={() => handleSelectFolder(f.key)}
                        className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition ${
                          isSelected
                            ? "bg-brand text-white shadow-2xs"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-ink"
                        }`}
                      >
                        <Icon size={12} className={isSelected ? "text-white" : "text-slate-400"} />
                        <span>{f.shortName}</span>
                        <span className={`text-[10px] rounded-full px-1.5 py-0.2 ${isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"}`}>
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Difficulty Selector Tabs */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-500 mr-1 inline-flex items-center gap-1">
                    <SlidersHorizontal size={13} /> Difficulty:
                  </span>
                  {difficulties.map((d) => {
                    const isSelected = selectedDifficulty === d.key;
                    const count =
                      d.key === "ALL"
                        ? catalogTests.filter((t) => testMatchesFolder(t, selectedFolder)).length
                        : catalogTests.filter(
                            (t) =>
                              testMatchesFolder(t, selectedFolder) &&
                              (t.difficulty || "MEDIUM").toUpperCase() === d.key
                          ).length;

                    return (
                      <button
                        key={d.key}
                        onClick={() => setSelectedDifficulty(d.key)}
                        className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-semibold transition ${
                          isSelected
                            ? "bg-slate-800 text-white"
                            : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-ink"
                        }`}
                      >
                        <span>{d.label}</span>
                        <span
                          className={`ml-0.5 rounded-full px-1.5 py-0.2 text-[10px] ${
                            isSelected ? "bg-white/20 text-white" : "bg-slate-100 text-slate-500"
                          }`}
                        >
                          {count}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Company Sub-Filter Bar (when in company folder) */}
              {selectedFolder === "company" && (
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-50/70 border border-amber-200 text-xs">
                  <span className="font-bold text-amber-900 mr-1 inline-flex items-center gap-1">
                    <Building2 size={13} /> Target Company:
                  </span>
                  {["ALL", "TCS", "Infosys", "Wipro", "Tech Mahindra"].map((comp) => {
                    const isSelected = companySubFilter === comp;
                    return (
                      <button
                        key={comp}
                        onClick={() => setCompanySubFilter(comp)}
                        className={`px-2.5 py-1 rounded-lg font-semibold transition ${
                          isSelected
                            ? "bg-amber-600 text-white shadow-2xs"
                            : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        {comp === "ALL" ? "All Companies" : comp}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* FOCUSED FOLDER VIEW: When a specific folder is selected */}
            {selectedFolder !== "ALL" && activeFolderDef && (
              <div className="space-y-4">
                {/* Active Folder Header Banner */}
                <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div className="flex items-start gap-3.5">
                    <div className={`h-12 w-12 rounded-xl flex items-center justify-center shrink-0 shadow-2xs ${activeFolderDef.iconBg}`}>
                      {(() => {
                        const Icon = activeFolderDef.icon;
                        return <Icon size={24} />;
                      })()}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">📁 Folders</span>
                        <span className="text-slate-300">/</span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-md border ${activeFolderDef.badgeColor}`}>
                          {activeFolderDef.name}
                        </span>
                      </div>
                      <h2 className="text-xl font-bold text-ink mt-1 flex items-center gap-2">
                        {activeFolderDef.name} Tests
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                          {displayedTests.length} {displayedTests.length === 1 ? "test" : "tests"}
                        </span>
                      </h2>
                      <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
                        {activeFolderDef.description}
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => handleSelectFolder("ALL")}
                    className="shrink-0 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-ink transition self-start sm:self-center"
                  >
                    <span>← All Folders</span>
                  </button>
                </div>

                {/* Test Cards Grid for this folder */}
                {displayedTests.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-12 text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      No tests found matching the selected filters in this folder.
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      Try resetting the difficulty or company filter to explore available tests.
                    </p>
                    <button
                      onClick={() => {
                        setSelectedDifficulty("ALL");
                        setCompanySubFilter("ALL");
                      }}
                      className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-200 transition"
                    >
                      Reset Filters
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                    {displayedTests.map((t) => renderTestCard(t))}
                  </div>
                )}
              </div>
            )}

            {/* ALL FOLDERS OVERVIEW: Sectioned by Folder */}
            {selectedFolder === "ALL" && (
              <div className="space-y-10">
                {FOLDERS.map((f) => {
                  const Icon = f.icon;
                  const folderTests = catalogTests.filter((t) => {
                    if (!testMatchesFolder(t, f.key)) return false;
                    if (selectedDifficulty !== "ALL") {
                      const diff = (t.difficulty || "MEDIUM").toUpperCase();
                      if (diff !== selectedDifficulty) return false;
                    }
                    return true;
                  });

                  if (folderTests.length === 0 && selectedDifficulty !== "ALL") {
                    return null;
                  }

                  return (
                    <section key={f.key} className="space-y-4">
                      {/* Section Header */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 pb-3">
                        <div className="flex items-center gap-3">
                          <div className={`h-8 w-8 rounded-lg flex items-center justify-center shrink-0 ${f.iconBg}`}>
                            <Icon size={16} />
                          </div>
                          <div>
                            <h3 className="text-lg font-bold text-ink flex items-center gap-2">
                              {f.name}
                              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                                {folderTests.length}
                              </span>
                            </h3>
                            <p className="text-xs text-slate-500 mt-0.5">
                              {f.description}
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={() => handleSelectFolder(f.key)}
                          className="text-xs font-semibold text-brand hover:underline inline-flex items-center gap-1 self-start sm:self-center shrink-0"
                        >
                          <span>Open {f.shortName} Folder</span>
                          <ChevronRight size={14} />
                        </button>
                      </div>

                      {/* Cards Grid for this folder section */}
                      <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
                        {folderTests.map((t) => renderTestCard(t))}
                      </div>
                    </section>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

export default function TestsCatalogPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-slate-50">
          <Loader2 size={32} className="animate-spin text-brand" />
        </div>
      }
    >
      <TestsCatalogContent />
    </Suspense>
  );
}

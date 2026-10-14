"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  Zap,
  Clock,
  Layers,
  ChevronRight,
  Loader2,
  Crown,
  Lock,
  ArrowRight,
  Sliders,
  CheckCircle2,
  HelpCircle,
} from "lucide-react";
import { Category, Topic } from "@/types/admin";
import { MembershipStatus } from "@/types/commerce";
import { getCategories, getTopics, startTopicTest } from "@/lib/api";
import { getToken } from "@/lib/auth";

interface TopicTestGeneratorProps {
  membership: MembershipStatus | null;
}

export default function TopicTestGenerator({ membership }: TopicTestGeneratorProps) {
  const router = useRouter();

  const [categories, setCategories] = useState<Category[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [isLoadingTaxonomy, setIsLoadingTaxonomy] = useState(true);

  // Form selection state
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [selectedTopicId, setSelectedTopicId] = useState<string>("");
  const [difficulty, setDifficulty] = useState<"EASY" | "MEDIUM" | "HARD">("MEDIUM");
  const [questionCount, setQuestionCount] = useState<number>(20);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([getCategories(), getTopics()])
      .then(([cats, tops]) => {
        setCategories(cats);
        setTopics(tops);
        if (cats.length > 0) {
          // Default to Quantitative Aptitude if found
          const quant = cats.find((c) => c.name.toLowerCase().includes("quant"));
          setSelectedCategoryId(quant ? quant.id : cats[0].id);
        }
      })
      .catch((err) => {
        console.error("Failed to load taxonomy for generator:", err);
      })
      .finally(() => {
        setIsLoadingTaxonomy(false);
      });
  }, []);

  // Filter topics based on selected category
  const filteredTopics = useMemo(() => {
    if (!selectedCategoryId) return [];
    return topics.filter((t) => t.category_id === selectedCategoryId);
  }, [topics, selectedCategoryId]);

  const handleCategorySelect = (catId: string) => {
    setSelectedCategoryId(catId);
    setSelectedTopicId(""); // reset topic to "All Topics"
    setError(null);
  };

  const handleStartTest = async () => {
    setError(null);

    if (!getToken()) {
      router.push(`/login?redirect=${encodeURIComponent("/tests")}`);
      return;
    }

    setIsStarting(true);
    try {
      const durationSeconds = questionCount === 10 ? 600 : 1200; // 10m or 20m
      const started = await startTopicTest({
        category_id: selectedCategoryId || null,
        topic_id: selectedTopicId || null,
        difficulty: difficulty,
        question_count: questionCount,
        duration_seconds: durationSeconds,
      });

      sessionStorage.setItem(`attempt_${started.attempt_id}_token`, started.guest_token);
      router.push(`/attempt/${started.attempt_id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Unable to generate topic test. Please try again.";
      if (msg.toLowerCase().includes("payment required") || msg.includes("402")) {
        router.push("/pricing");
      } else {
        setError(msg);
      }
      setIsStarting(false);
    }
  };

  const isAdmin = membership?.role === "ADMIN";
  const isPro = membership?.is_subscribed;
  const hasPasses = (membership?.available_test_credits ?? 0) > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl border-2 border-indigo-500/30 bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-6 sm:p-8 text-white shadow-xl">
      {/* Background Glow */}
      <div className="absolute top-0 right-0 -mt-12 -mr-12 h-64 w-64 rounded-full bg-blue-500/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -mb-12 -ml-12 h-64 w-64 rounded-full bg-indigo-500/15 blur-3xl pointer-events-none" />

      <div className="relative z-10">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-6">
          <div>
            <div className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 px-3 py-1 text-xs font-bold text-indigo-300 border border-indigo-400/30">
              <Sparkles size={13} className="text-indigo-400 animate-pulse" />
              <span>Unlimited On-Demand Assessment Engine</span>
            </div>
            <h2 className="mt-2.5 text-2xl sm:text-3xl font-black tracking-tight text-white">
              Launch a Topic Test
            </h2>
            <p className="mt-1 text-xs sm:text-sm text-slate-300 max-w-xl leading-relaxed">
              Target your weak areas. Pick any topic and difficulty — our engine dynamically pulls fresh questions from the bank with Zero-Repeat intelligence.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-center">
            {isAdmin ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-amber-500/20 px-3.5 py-1.5 text-xs font-bold text-amber-300 border border-amber-400/30 shadow-xs">
                <Crown size={14} className="text-amber-400" />
                <span>Admin All-Access</span>
              </span>
            ) : isPro ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 px-3.5 py-1.5 text-xs font-bold text-emerald-300 border border-emerald-400/30 shadow-xs">
                <Sparkles size={14} className="text-emerald-400" />
                <span>Unlimited Pro Access</span>
              </span>
            ) : hasPasses ? (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-500/20 px-3.5 py-1.5 text-xs font-bold text-blue-300 border border-blue-400/30 shadow-xs">
                <Zap size={14} className="text-blue-400" />
                <span>{membership?.available_test_credits} Active Pass Available</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-white/10 px-3.5 py-1.5 text-xs font-medium text-slate-300 border border-white/10">
                <span>Requires ₹10 Pass or Pro</span>
              </span>
            )}
          </div>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-500/50 bg-red-950/60 p-3.5 text-xs text-red-200">
            {error}
          </div>
        )}

        {/* Configuration Grid */}
        <div className="mt-6 grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* 1. Category Selection (Columns 1-4) */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>1. Choose Domain</span>
            </label>
            <div className="space-y-2">
              {isLoadingTaxonomy ? (
                <div className="py-8 text-center text-slate-400 text-xs">Loading domains...</div>
              ) : (
                categories.map((cat) => {
                  const isSelected = selectedCategoryId === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => handleCategorySelect(cat.id)}
                      className={`w-full text-left p-3 rounded-xl text-xs font-semibold transition border flex items-center justify-between ${
                        isSelected
                          ? "bg-indigo-600/90 text-white border-indigo-400 shadow-md ring-1 ring-indigo-300/40"
                          : "bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white"
                      }`}
                    >
                      <span>{cat.name}</span>
                      {isSelected ? (
                        <CheckCircle2 size={15} className="text-white shrink-0" />
                      ) : (
                        <ChevronRight size={14} className="text-slate-500 shrink-0" />
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* 2. Topic Selection (Columns 5-8) */}
          <div className="md:col-span-4 space-y-2">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <span>2. Select Specific Topic</span>
            </label>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-2 max-h-[220px] overflow-y-auto space-y-1">
              {/* Option to test all topics in domain */}
              <button
                type="button"
                onClick={() => setSelectedTopicId("")}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition flex items-center justify-between ${
                  selectedTopicId === ""
                    ? "bg-indigo-600 text-white"
                    : "text-slate-300 hover:bg-white/10 hover:text-white"
                }`}
              >
                <span>✨ All Topics in this Domain (Mixed)</span>
                {selectedTopicId === "" && <CheckCircle2 size={13} className="text-white" />}
              </button>

              {filteredTopics.map((top) => {
                const isSelected = selectedTopicId === top.id;
                return (
                  <button
                    key={top.id}
                    type="button"
                    onClick={() => setSelectedTopicId(top.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition flex items-center justify-between ${
                      isSelected
                        ? "bg-indigo-600 text-white font-bold"
                        : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="truncate">{top.name}</span>
                    {isSelected && <CheckCircle2 size={13} className="text-white shrink-0 ml-1" />}
                  </button>
                );
              })}

              {filteredTopics.length === 0 && !isLoadingTaxonomy && (
                <p className="p-3 text-center text-xs text-slate-400">
                  Select a domain to see its topics.
                </p>
              )}
            </div>
          </div>

          {/* 3. Difficulty & Length (Columns 9-12) */}
          <div className="md:col-span-4 space-y-4">
            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                3. Difficulty Level
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { key: "EASY" as const, label: "Easy", desc: "Foundations", color: "text-emerald-400" },
                  { key: "MEDIUM" as const, label: "Medium", desc: "Placement", color: "text-amber-400" },
                  { key: "HARD" as const, label: "Hard", desc: "Advanced", color: "text-rose-400" },
                ].map((d) => {
                  const isSelected = difficulty === d.key;
                  return (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDifficulty(d.key)}
                      className={`p-2.5 rounded-xl text-center border transition ${
                        isSelected
                          ? "bg-white text-slate-900 border-white shadow-md font-bold"
                          : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <div className={`text-xs ${isSelected ? "text-slate-900 font-extrabold" : d.color}`}>
                        {d.label}
                      </div>
                      <div className={`text-[10px] ${isSelected ? "text-slate-600" : "text-slate-400"}`}>
                        {d.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
                4. Test Format
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setQuestionCount(20)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    questionCount === 20
                      ? "bg-white text-slate-900 border-white font-bold shadow-md"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-extrabold">20 Questions</div>
                  <div className={`text-[10px] ${questionCount === 20 ? "text-slate-600" : "text-slate-400"}`}>
                    20 Mins Standard
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setQuestionCount(10)}
                  className={`p-2.5 rounded-xl border text-left transition ${
                    questionCount === 10
                      ? "bg-white text-slate-900 border-white font-bold shadow-md"
                      : "bg-white/5 border-white/10 text-slate-300 hover:bg-white/10"
                  }`}
                >
                  <div className="text-xs font-extrabold">10 Questions</div>
                  <div className={`text-[10px] ${questionCount === 10 ? "text-slate-600" : "text-slate-400"}`}>
                    10 Mins Quick Drill
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Action Bottom Bar */}
        <div className="mt-8 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="text-xs text-slate-300 flex items-center gap-2">
            <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span>
              Engine Ready: Questions dynamically assembled with <strong>Zero-Repeat Priority</strong>.
            </span>
          </div>

          <button
            type="button"
            onClick={handleStartTest}
            disabled={isStarting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 via-indigo-600 to-indigo-700 hover:from-blue-600 hover:to-indigo-800 text-white px-7 py-3 text-sm font-black shadow-lg hover:shadow-indigo-500/25 active:scale-98 transition-all disabled:opacity-50"
          >
            {isStarting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Assembling Questions...</span>
              </>
            ) : (
              <>
                <span>Launch Topic Test</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}


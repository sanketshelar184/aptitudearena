"use client";

import { useEffect, useState } from "react";
import {
  Users,
  CheckCircle2,
  HelpCircle,
  CreditCard,
  Zap,
  RefreshCw,
  Loader2,
  AlertCircle,
  Award,
} from "lucide-react";
import { adminGetAnalytics } from "@/lib/api";
import { AdminAnalyticsData } from "@/types/commerce";

export default function AdminAnalyticsTab() {
  const [data, setData] = useState<AdminAnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = () => {
    setIsLoading(true);
    setError(null);
    adminGetAnalytics()
      .then(setData)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load admin analytics.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    fetchAnalytics();
  }, []);

  const formatDate = (isoString: string) => {
    const d = new Date(isoString);
    return d.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (isLoading) {
    return (
      <div className="py-24 text-center text-slate-400">
        <Loader2 size={32} className="animate-spin text-brand mx-auto mb-3" />
        <p className="text-xs font-medium">Aggregating platform metrics...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-6 text-center text-xs text-red-700">
        <AlertCircle size={24} className="mx-auto text-red-500 mb-2" />
        <p className="font-semibold">{error || "Unable to load analytics."}</p>
        <button
          onClick={fetchAnalytics}
          className="mt-3 inline-flex items-center gap-1 font-bold text-brand hover:underline"
        >
          <RefreshCw size={12} />
          <span>Retry</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-8">
      {/* Top action row */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-ink">Business Overview & KPIs</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time tracking of users, tests taken, commercial revenue, and product subscriptions.
          </p>
        </div>
        <button
          onClick={fetchAnalytics}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
        >
          <RefreshCw size={13} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {/* Total Users */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Users
            </span>
            <Users size={16} />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink">{data.total_users}</p>
          <p className="mt-1 text-[11px] text-slate-400">Registered accounts</p>
        </div>

        {/* Tests Taken */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Tests Taken
            </span>
            <CheckCircle2 size={16} className="text-emerald-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink">{data.total_tests_taken}</p>
          <p className="mt-1 text-[11px] text-slate-400">Total student sessions</p>
        </div>

        {/* Questions in Bank */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Active Questions
            </span>
            <HelpCircle size={16} className="text-blue-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink">{data.total_questions_in_bank}</p>
          <p className="mt-1 text-[11px] text-slate-400">In question bank</p>
        </div>

        {/* Total Revenue */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Total Revenue
            </span>
            <span className="text-xs font-bold text-emerald-600">INR</span>
          </div>
          <p className="mt-2 text-2xl font-extrabold text-emerald-700">₹{data.total_revenue_inr}</p>
          <p className="mt-1 text-[11px] text-slate-400">Verified captured volume</p>
        </div>

        {/* Paid Purchases */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Purchases
            </span>
            <CreditCard size={16} className="text-purple-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-ink">{data.paid_purchases_count}</p>
          <p className="mt-1 text-[11px] text-slate-400">Test passes & renewals</p>
        </div>

        {/* Active Subscriptions */}
        <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              Pro Members
            </span>
            <Zap size={16} className="text-amber-500" />
          </div>
          <p className="mt-2 text-2xl font-extrabold text-purple-700">{data.active_subscriptions_count}</p>
          <p className="mt-1 text-[11px] text-slate-400">Active monthly subs</p>
        </div>
      </div>

      {/* Popular Tests & Performance */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 p-5">
          <h3 className="text-sm font-bold text-ink">Popular Placement Tests</h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Top assessments ranked by total student attempts and average score accuracy.
          </p>
        </div>

        {data.popular_tests.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs font-medium">
            No test attempt metrics recorded yet.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Test Name</th>
                  <th className="py-3 px-4">Attempts Count</th>
                  <th className="py-3 px-4">Average Accuracy</th>
                  <th className="py-3 px-6 text-right">Insight</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.popular_tests.map((t) => (
                  <tr key={t.test_id} className="hover:bg-slate-50/60 transition">
                    <td className="py-3.5 px-6 font-semibold text-ink flex items-center gap-2">
                      <Award size={14} className="text-amber-500" />
                      <span>{t.test_name}</span>
                    </td>
                    <td className="py-3.5 px-4 font-bold text-ink">{t.attempt_count} attempts</td>
                    <td className="py-3.5 px-4">
                      <span
                        className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${
                          t.average_accuracy >= 65
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-amber-50 text-amber-800"
                        }`}
                      >
                        {t.average_accuracy}%
                      </span>
                    </td>
                    <td className="py-3.5 px-6 text-right text-slate-500">
                      {t.average_accuracy >= 65 ? "Optimal Challenge" : "High Failure Rate"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Two-column layout: Recent Registrations & Recent Payments */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Recent Registrations */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-sm font-bold text-ink">Recent Student Registrations</h3>
            <p className="text-xs text-slate-500 mt-0.5">Latest sign-ups across India.</p>
          </div>

          {data.recent_registrations.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No registered students yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.recent_registrations.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition">
                  <div>
                    <p className="font-semibold text-ink">{u.full_name || "Student"}</p>
                    <p className="text-slate-400 text-[11px]">{u.email}</p>
                  </div>
                  <div className="text-right">
                    <span
                      className={`inline-block rounded px-2 py-0.5 text-[10px] font-bold ${
                        u.role === "ADMIN"
                          ? "bg-purple-100 text-purple-800"
                          : "bg-blue-50 text-brand"
                      }`}
                    >
                      {u.role}
                    </span>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(u.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h3 className="text-sm font-bold text-ink">Recent Verified Payments</h3>
            <p className="text-xs text-slate-500 mt-0.5">Successful transactions and pass purchases.</p>
          </div>

          {data.recent_payments.length === 0 ? (
            <div className="py-8 text-center text-slate-400 text-xs font-medium">
              No verified payment transactions yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {data.recent_payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between p-4 hover:bg-slate-50/60 transition">
                  <div>
                    <p className="font-semibold text-ink">{p.product_name}</p>
                    <p className="text-slate-400 text-[11px]">{p.user_email}</p>
                  </div>
                  <div className="text-right">
                    <span className="font-extrabold text-emerald-700 text-sm">₹{p.amount_inr}</span>
                    <p className="text-[11px] text-slate-400 mt-1">{formatDate(p.created_at)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

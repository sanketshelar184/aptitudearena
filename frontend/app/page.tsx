import Link from "next/link";
import {
  ArrowRight,
  Clock,
  Target,
  Trophy,
  Zap,
  Sparkles,
  CheckCircle2,
  ChevronRight,
  TrendingUp,
  Brain,
} from "lucide-react";
import Navbar from "@/components/Navbar";

export const metadata = {
  title: "AptitudeArena — Practice Faster. Score Better. Crack Placements.",
  description:
    "Engineered for Indian college students. Practice aptitude questions, evaluate solving speed, eliminate negative marks, and crack TCS, Infosys, Wipro, Cognizant, and product company placements.",
};

const companies = [
  "TCS NQT",
  "Infosys",
  "Wipro",
  "Cognizant",
  "Accenture",
  "Capgemini",
  "Tech Mahindra",
  "Product Companies",
];

const pillars = [
  {
    icon: Clock,
    title: "Exam-Paced Pressure",
    desc: "Actual placement tests demand 45-60 seconds per question. Train your brain with strict section timers and auto-submission.",
  },
  {
    icon: Target,
    title: "Negative Marks Protection",
    desc: "Detailed accuracy analytics highlight impulsive guessing patterns so you maximize net scores in company cut-offs.",
  },
  {
    icon: Brain,
    title: "Weak-Topic Diagnostics",
    desc: "Automatically identifies topics where accuracy dips below 70%—whether Probability, Syllogisms, or Reading Comprehension.",
  },
  {
    icon: Trophy,
    title: "TCS & IT Standard Questions",
    desc: "Updated questions categorized into Quantitative, Logical Reasoning, and Verbal Ability with step-by-step solutions.",
  },
];

const syllabus = [
  {
    category: "Quantitative Aptitude",
    desc: "Formulas, mental math, and calculation speed drills.",
    topics: ["Percentages & Profit/Loss", "Time & Work / Pipes", "Speed, Time & Distance", "Averages, Ratio & Proportion", "Permutation & Probability", "Data Interpretation"],
    badge: "Most High-Stakes",
  },
  {
    category: "Logical Reasoning",
    desc: "Pattern recognition and deductive analysis.",
    topics: ["Blood Relations & Coding", "Direction & Distance", "Number & Letter Series", "Syllogisms & Venn Diagrams", "Seating Arrangements", "Statement & Conclusion"],
    badge: "Core Filter",
  },
  {
    category: "Verbal Ability",
    desc: "Grammar, contextual comprehension, and error spotting.",
    topics: ["Sentence Correction & Error Spotting", "Reading Comprehension", "Synonyms & Antonyms", "Para Jumbles", "Idioms & Phrases", "Vocabulary & Fillers"],
    badge: "Speed Critical",
  },
];

const plans = [
  {
    name: "Free Diagnostic",
    price: "₹0",
    period: "Free forever",
    highlight: false,
    desc: "Evaluate your current aptitude readiness without creating an account.",
    features: [
      "1x 20-Question Full Diagnostic Test",
      "Instant Score & Accuracy Report",
      "Per-Question Time Breakdown",
      "Full Answer Explanations",
      "No Credit Card Required",
    ],
    ctaText: "Take Free Test Now",
    ctaLink: "/tests/free",
  },
  {
    name: "Single Test Pass",
    price: "₹10",
    period: "per full test",
    highlight: false,
    desc: "Pay as you go. Perfect for a quick mock test before your interview round.",
    features: [
      "1x Full Placement Mock Test (20 Qs)",
      "Mixed or Topic-Focused selection",
      "Real-time countdown & auto-submission",
      "Permanent review history in dashboard",
      "No recurring charge",
    ],
    ctaText: "Choose ₹10 Test",
    ctaLink: "/pricing",
  },
  {
    name: "Unlimited Pro",
    price: "₹99",
    period: "per month",
    highlight: true,
    badge: "Most Popular",
    desc: "Unlimited tests, deep diagnostic analytics, and guaranteed placement readiness.",
    features: [
      "Unlimited Mock & Topic Tests",
      "Full Question Bank access (all topics)",
      "Personal Weak-Topic Diagnostics",
      "Solving Speed & Pace Tracker",
      "Performance Streaks & History",
      "30-Day Full Access (No recurring auto-debit)",
    ],
    ctaText: "Get Pro for ₹99",
    ctaLink: "/pricing",
  },
];

const faqs = [
  {
    q: "Do I need to sign up before taking the first test?",
    a: "No. You can jump directly into our Free 20-Question Diagnostic Test without entering an email or creating a password. After completing the test, you can save your score to a free account.",
  },
  {
    q: "How does the ₹10 Single Test Pass work?",
    a: "If you just want to take one quick mock test without subscribing, you can pay a flat ₹10. You will get immediate access to attempt that test and its detailed post-test solution review.",
  },
  {
    q: "How does the ₹99 Pro Pass work?",
    a: "You get 30 days of complete, unlimited access to all aptitude tests, technical MCQs (DBMS, OOPs, C/C++), and company placement papers with a direct one-time payment. There are no recurring card charges or auto-debit surprises.",
  },
  {
    q: "Are the questions relevant for TCS NQT and Infosys tests?",
    a: "Yes. Our questions are calibrated against the syllabus, difficulty mix, and pacing requirements of major IT companies (TCS, Infosys, Cognizant, Wipro, Capgemini) and core placement drives.",
  },
];

export default function LandingPage() {
  return (
    <main className="min-h-screen bg-slate-50 text-ink">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-black text-sm shadow-xs">
              AA
            </span>
            <span className="text-base font-black tracking-tight text-ink">
              Aptitude<span className="text-brand">Arena</span>
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <Link
              href="/pricing"
              className="hidden sm:inline-flex px-3.5 py-2 font-semibold text-slate-600 hover:text-ink transition"
            >
              Pricing
            </Link>
            <Link
              href="/login"
              className="px-3.5 py-2 font-semibold text-slate-700 hover:text-ink transition"
            >
              Sign In
            </Link>
            <Link
              href="/tests/free"
              className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2 font-bold text-white shadow-xs hover:bg-blue-700 transition"
            >
              <span>Free Test</span>
              <ArrowRight size={13} />
            </Link>
          </div>
        </div>
      </header>
      <Navbar />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-16 sm:pt-20 sm:pb-24">
        <div className="mx-auto max-w-5xl px-6 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50/80 px-3.5 py-1 text-xs font-semibold text-brand mb-6 shadow-2xs">
            <Sparkles size={13} />
            <span>Built for Campus Placements 2026</span>
          </div>

          <h1 className="text-3xl font-black tracking-tight text-ink sm:text-5xl sm:leading-tight">
            Practice Faster. Score Better.{" "}
            <span className="text-brand block mt-1">Crack Campus Placements.</span>
          </h1>

          <p className="mx-auto mt-4 max-w-2xl text-xs sm:text-sm text-slate-600 leading-relaxed">
            Timed aptitude tests designed to replicate actual placement exams. Improve your
            speed, reduce careless errors, and pinpoint your weakest topics before company drives begin.
          </p>

          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              href="/tests/free"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              <span>Take Free 20-Question Test</span>
              <ArrowRight size={15} />
            </Link>
            <Link
              href="/tests"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-6 py-3.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
            >
              <span>Browse All Tests</span>
              <ChevronRight size={15} />
            </Link>
          </div>

          {/* Social Proof / Badges */}
          <div className="mt-12 border-t border-slate-200/80 pt-8">
            <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
              Calibrated for campus patterns of
            </p>
            <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:gap-3">
              {companies.map((co) => (
                <span
                  key={co}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1 text-[11px] font-semibold text-slate-600 shadow-2xs"
                >
                  {co}
                </span>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature Pillars */}
      <section className="border-t border-slate-200/80 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
              <Zap size={12} className="text-amber-500" />
              <span>Engineered for Results</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
              Why students score higher on AptitudeArena
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              Generic question apps don&apos;t simulate real placement exams. We focus on timing and accuracy.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div
                  key={p.title}
                  className="rounded-2xl border border-slate-200/80 bg-slate-50/50 p-5 shadow-2xs hover:shadow-xs transition"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-100 text-brand">
                    <Icon size={18} />
                  </div>
                  <h3 className="mt-4 text-sm font-bold text-ink">{p.title}</h3>
                  <p className="mt-2 text-xs text-slate-600 leading-relaxed">{p.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Syllabus Breakdown */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <h2 className="text-2xl font-bold text-ink sm:text-3xl">Complete Placement Syllabus Covered</h2>
            <p className="mt-2 text-xs text-slate-500">
              Master every core section tested by Tier-1 & Tier-2 campus recruiters.
            </p>
          </div>

          <div className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-3">
            {syllabus.map((s) => (
              <div
                key={s.category}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-ink">{s.category}</h3>
                  <span className="rounded-full bg-blue-50 border border-blue-200 px-2.5 py-0.5 text-[10px] font-bold text-brand">
                    {s.badge}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-500">{s.desc}</p>

                <div className="mt-5 border-t border-slate-100 pt-4 flex-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-600 mb-2">
                    Key Topics Included:
                  </p>
                  <ul className="space-y-2">
                    {s.topics.map((t) => (
                      <li key={t} className="flex items-center gap-2 text-xs text-slate-700">
                        <CheckCircle2 size={13} className="text-emerald-500 shrink-0" />
                        <span>{t}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-6 pt-4 border-t border-slate-100">
                  <Link
                    href="/tests"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-brand hover:underline"
                  >
                    <span>Practice {s.category}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6">
          <div className="text-center max-w-2xl mx-auto">
            <div className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3 py-1 text-[11px] font-bold text-emerald-700">
              <TrendingUp size={12} />
              <span>Simple, Honest Pricing</span>
            </div>
            <h2 className="mt-3 text-2xl font-bold text-ink sm:text-3xl">
              Pay ₹0, ₹10, or ₹99. No surprises.
            </h2>
            <p className="mt-2 text-xs text-slate-500">
              We keep prices accessible for every college student. No hidden subscription fees.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 gap-6 md:grid-cols-3 max-w-5xl mx-auto items-stretch">
            {plans.map((plan) => (
              <div
                key={plan.name}
                className={`relative flex flex-col rounded-2xl border p-6 transition shadow-2xs ${
                  plan.highlight
                    ? "border-brand bg-blue-50/20 ring-2 ring-brand"
                    : "border-slate-200 bg-white"
                }`}
              >
                {plan.badge && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-xs">
                    {plan.badge}
                  </span>
                )}
                <div>
                  <h3 className="text-base font-bold text-ink">{plan.name}</h3>
                  <div className="mt-3 flex items-baseline gap-1.5">
                    <span className="text-3xl font-black text-ink">{plan.price}</span>
                    <span className="text-xs text-slate-500 font-medium">{plan.period}</span>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">{plan.desc}</p>
                </div>

                <div className="my-6 border-t border-slate-100 pt-5 flex-1">
                  <ul className="space-y-2.5 text-xs text-slate-700">
                    {plan.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <CheckCircle2 size={14} className="text-emerald-500 shrink-0 mt-0.5" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Link
                  href={plan.ctaLink}
                  className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-3 text-xs font-bold transition shadow-2xs ${
                    plan.highlight
                      ? "bg-brand text-white hover:bg-blue-700"
                      : "border border-slate-300 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{plan.ctaText}</span>
                  <ArrowRight size={13} />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="border-t border-slate-200 bg-slate-50 py-16">
        <div className="mx-auto max-w-4xl px-6 text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Frequently Asked Questions
          </h2>
        </div>

        <div className="mt-10 space-y-4 max-w-4xl mx-auto px-6">
          {faqs.map((f) => (
            <div key={f.q} className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs">
              <h3 className="text-sm font-bold text-ink">{f.q}</h3>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">{f.a}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Bottom CTA Banner */}
      <section className="border-t border-slate-200 bg-white py-16">
        <div className="mx-auto max-w-6xl px-6 text-center">
          <h2 className="text-2xl font-bold text-ink sm:text-3xl">
            Ready to crack your campus placement?
          </h2>
          <p className="mt-2 text-xs text-slate-500 max-w-lg mx-auto">
            Take your free diagnostic test today and identify your exact weak areas before company exam dates.
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/tests/free"
              className="inline-flex items-center gap-2 rounded-xl bg-brand px-6 py-3.5 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
            >
              <span>Start Free 20-Question Test</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-50 py-10 text-xs text-slate-500">
        <div className="mx-auto flex max-w-6xl flex-col sm:flex-row items-center justify-between gap-4 px-6">
          <p>© {new Date().getFullYear()} AptitudeArena. Built for Indian college student success.</p>
          <div className="flex items-center gap-5 font-medium">
            <Link href="/tests" className="hover:text-ink">Browse Tests</Link>
            <Link href="/pricing" className="hover:text-ink">Pricing</Link>
            <Link href="/admin/login" className="hover:text-ink">Admin Portal</Link>
          </div>
        </div>
      </footer>
    </main>
  );
}

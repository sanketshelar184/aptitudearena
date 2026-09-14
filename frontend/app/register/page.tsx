"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { UserPlus, ArrowRight, Loader2, Sparkles, CheckCircle2, AlertCircle } from "lucide-react";
import { studentRegister } from "@/lib/api";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function RegisterFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [guestAttemptId, setGuestAttemptId] = useState<string | null>(null);
  const [guestToken, setGuestToken] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const attemptIdParam = searchParams.get("guest_attempt_id");
    const tokenParam = searchParams.get("token");

    if (attemptIdParam) setGuestAttemptId(attemptIdParam);
    if (tokenParam) setGuestToken(tokenParam);

    // Fallback to local storage if user just completed free test
    if (!tokenParam && attemptIdParam && typeof window !== "undefined") {
      const storedToken = sessionStorage.getItem(`attempt_${attemptIdParam}_token`);
      if (storedToken) setGuestToken(storedToken);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    try {
      await studentRegister({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim() || undefined,
        guest_attempt_id: guestAttemptId || undefined,
        guest_token: guestToken || undefined,
      });

      // If registered with a guest attempt, redirect to its review or dashboard
      if (guestAttemptId && guestToken) {
        router.push(`/result/${guestAttemptId}?token=${encodeURIComponent(guestToken)}`);
      } else {
        router.push("/dashboard");
      }
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Registration failed. Please try again.");
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8 font-sans text-ink">
      <div className="sm:mx-auto sm:w-full sm:max-w-md px-4">
        {/* Brand */}
        <div className="text-center">
          <Link href="/" className="text-2xl font-bold tracking-tight text-ink">
            AptitudeArena
          </Link>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
            Create Your Student Account
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Track your placement progress, review solutions anytime, and unlock targeted ₹10 sprints.
          </p>
        </div>

        {/* Free Test Migration Banner */}
        {guestAttemptId && (
          <div className="mt-6 rounded-xl border border-blue-200 bg-blue-50/80 p-4 shadow-xs text-xs text-blue-900 flex items-start gap-3">
            <Sparkles size={18} className="text-brand shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Save Your Free Diagnostic Score</p>
              <p className="mt-0.5 text-[11px] text-blue-800 leading-normal">
                Your recent 20-question test results will be automatically linked to this account so you can review your answers anytime.
              </p>
            </div>
          </div>
        )}

        {errorMessage && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200 shadow-xs">
          {/* Google Sign-Up */}
          <GoogleSignInButton
            textType="signup"
            guestAttemptId={guestAttemptId}
            guestToken={guestToken}
            redirectUrl={
              guestAttemptId && guestToken
                ? `/result/${guestAttemptId}?token=${encodeURIComponent(guestToken)}`
                : "/dashboard"
            }
            onError={(msg) => setErrorMessage(msg)}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 uppercase font-semibold text-[10px]">
                or register with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Full Name
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="e.g. Rohan Sharma"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                College / Personal Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@college.edu / you@gmail.com"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Password <span className="font-normal text-slate-400">(minimum 8 characters)</span>
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                minLength={8}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
              >
                {isLoading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    <span>Creating account...</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={16} />
                    <span>Create Free Account</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>

          {/* Social Proof / Security Note */}
          <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400">
            <CheckCircle2 size={13} className="text-emerald-500" />
            <span>Never spam. Free diagnostic score saved permanently.</span>
          </div>
        </div>

        {/* Existing User Link */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already have an account?{" "}
          <Link
            href={`/login${guestAttemptId ? `?guest_attempt_id=${guestAttemptId}&token=${guestToken || ""}` : ""}`}
            className="font-semibold text-brand hover:underline"
          >
            Sign in here
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      }
    >
      <RegisterFormContent />
    </Suspense>
  );
}


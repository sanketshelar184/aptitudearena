"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { LogIn, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import { studentLogin } from "@/lib/api";
import GoogleSignInButton from "@/components/GoogleSignInButton";

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

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
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await studentLogin({
        email: email.trim().toLowerCase(),
        password,
        guest_attempt_id: guestAttemptId || undefined,
        guest_token: guestToken || undefined,
      });

      const redirect = searchParams.get("redirect") || "/dashboard";
      router.push(redirect);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : "Invalid email or password.");
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
            Sign In to Your Account
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Access your practice history, active test passes, and placement reports.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Form Card */}
        <div className="mt-6 bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200 shadow-xs">
          {/* Google Sign-In */}
          <GoogleSignInButton
            textType="signin"
            guestAttemptId={guestAttemptId}
            guestToken={guestToken}
            redirectUrl={searchParams.get("redirect") || "/dashboard"}
            onError={(msg) => setErrorMessage(msg)}
          />

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 uppercase font-semibold text-[10px]">
                or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700">
                Email Address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-xs font-semibold text-slate-700">
                  Password
                </label>
                <Link
                  href="/forgot-password"
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Forgot password?
                </Link>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
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
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <LogIn size={16} />
                    <span>Sign In</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Registration Link */}
        <p className="mt-6 text-center text-xs text-slate-500">
          New to AptitudeArena?{" "}
          <Link
            href={`/register${guestAttemptId ? `?guest_attempt_id=${guestAttemptId}&token=${guestToken || ""}` : ""}`}
            className="font-semibold text-brand hover:underline"
          >
            Create free account
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}


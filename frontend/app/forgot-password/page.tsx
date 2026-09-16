"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, ArrowRight, ArrowLeft, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { requestPasswordReset } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    try {
      await requestPasswordReset(email.trim().toLowerCase());
      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to process request. Please try again."
      );
    } finally {
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
            Reset Your Password
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Enter your registered email to receive a secure password recovery link.
          </p>
        </div>

        {errorMessage && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-700">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        <div className="mt-6 bg-white py-8 px-6 sm:px-8 rounded-2xl border border-slate-200 shadow-xs">
          {isSuccess ? (
            <div className="text-center py-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 mb-4">
                <CheckCircle2 size={28} />
              </div>
              <h2 className="text-base font-bold text-ink">Check Your Inbox</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                If an account exists with <strong className="text-slate-900">{email}</strong>, you will receive an email shortly with instructions to reset your password.
              </p>
              <div className="mt-4 rounded-lg bg-slate-50 p-3 text-[11px] text-slate-500 border border-slate-200 text-left leading-relaxed">
                <strong>Note:</strong> The link will expire in <strong>30 minutes</strong>. If you do not see it within 2 minutes, be sure to check your spam or junk folder.
              </div>

              <div className="mt-6 space-y-3">
                <button
                  onClick={() => setIsSuccess(false)}
                  className="w-full text-xs font-semibold text-brand hover:underline"
                >
                  Resend or try another email
                </button>
                <Link
                  href="/login"
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition"
                >
                  <ArrowLeft size={14} />
                  <span>Return to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Registered Email Address
                </label>
                <div className="mt-1 relative rounded-lg">
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="student@example.com"
                    required
                    autoFocus
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  />
                </div>
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
                      <span>Sending reset link...</span>
                    </>
                  ) : (
                    <>
                      <Mail size={16} />
                      <span>Send Password Reset Link</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back link */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Remembered your password?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

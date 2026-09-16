"use client";

import { useState, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Lock, ArrowRight, Loader2, CheckCircle2, AlertCircle, Eye, EyeOff } from "lucide-react";
import { confirmPasswordReset } from "@/lib/api";

function ResetPasswordFormContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token");

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage("Missing password reset token. Please request a new link from the forgot password page.");
      return;
    }

    if (newPassword.length < 8) {
      setErrorMessage("Password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMessage("Passwords do not match. Please re-enter.");
      return;
    }

    setIsLoading(true);

    try {
      await confirmPasswordReset(token, newPassword);
      setIsSuccess(true);
    } catch (err: unknown) {
      setErrorMessage(
        err instanceof Error ? err.message : "Unable to reset password. The link may have expired or already been used."
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
            Create New Password
          </h1>
          <p className="mt-1.5 text-xs text-slate-500">
            Please choose a strong, unique password for your account.
          </p>
        </div>

        {!token && (
          <div className="mt-6 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 p-3.5 text-xs text-amber-800">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <span>
              This password reset link is invalid or incomplete. Please{" "}
              <Link href="/forgot-password" className="font-bold underline">
                request a new link
              </Link>.
            </span>
          </div>
        )}

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
              <h2 className="text-base font-bold text-ink">Password Updated!</h2>
              <p className="mt-2 text-xs text-slate-600 leading-relaxed">
                Your password has been successfully reset. You can now log in to your account with your new credentials.
              </p>

              <div className="mt-6">
                <button
                  onClick={() => router.push("/login")}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition"
                >
                  <span>Sign In Now</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  New Password
                </label>
                <div className="mt-1 relative rounded-lg">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 8 characters"
                    required
                    minLength={8}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700">
                  Confirm New Password
                </label>
                <div className="mt-1 relative rounded-lg">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    required
                    minLength={8}
                    className="block w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-ink placeholder-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand pr-10"
                  />
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isLoading || !token}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-2.5 px-4 text-sm font-semibold text-white shadow-xs hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isLoading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Updating password...</span>
                    </>
                  ) : (
                    <>
                      <Lock size={16} />
                      <span>Update Password</span>
                      <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Back to sign in */}
        <p className="mt-6 text-center text-xs text-slate-500">
          Already know your password?{" "}
          <Link href="/login" className="font-semibold text-brand hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-50 flex items-center justify-center py-20 text-slate-400">
          <Loader2 size={28} className="animate-spin text-brand" />
        </div>
      }
    >
      <ResetPasswordFormContent />
    </Suspense>
  );
}


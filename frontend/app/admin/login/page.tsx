"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Shield, Lock, Mail, AlertCircle, ArrowRight, Loader2 } from "lucide-react";
import { login } from "@/lib/api";
import { setToken, setUser, getUser } from "@/lib/auth";
import GoogleSignInButton from "@/components/GoogleSignInButton";

export default function AdminLoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const response = await login(email.trim(), password);
      if (response.user.role !== "ADMIN") {
        setError("Access denied: Your account does not possess administrator privileges.");
        setIsLoading(false);
        return;
      }
      setToken(response.access_token);
      setUser(response.user);
      router.push("/admin");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Invalid email or password");
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemo = () => {
    setEmail("admin@aptitudearena.com");
    setPassword("Admin@AptitudeArena2026");
  };

  return (
    <main className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-bold tracking-tight text-ink">
          <span>AptitudeArena</span>
        </Link>
        <div className="mt-2 flex items-center justify-center gap-1.5 text-xs font-semibold text-brand uppercase tracking-wider">
          <Shield size={14} />
          <span>Staff & Admin Portal</span>
        </div>
        <h1 className="mt-4 text-xl font-bold text-slate-800">
          Sign in to Question Management
        </h1>
        <p className="mt-1 text-xs text-slate-500">
          Manage taxonomy, curate practice questions, and import exam sets.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-10">
          {error && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Google Sign-In for Admin */}
          <GoogleSignInButton
            textType="signin"
            redirectUrl="/admin"
            onError={(msg) => setError(msg)}
            onSuccess={() => {
              const u = getUser();
              if (u?.role === "ADMIN") {
                router.push("/admin");
              } else {
                setError("Access denied: Your Google account does not have administrator privileges.");
              }
            }}
          />

          <div className="relative my-5">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 uppercase font-semibold text-[10px]">
                or sign in with password
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Admin Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@aptitudearena.com"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="block w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="mt-2 flex w-full justify-center items-center gap-2 rounded-lg bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-60"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  <span>Verifying credentials...</span>
                </>
              ) : (
                <>
                  <span>Sign In as Admin</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Quick Fill Demo Credentials */}
          <div className="mt-6 border-t border-slate-100 pt-4 text-center">
            <button
              type="button"
              onClick={handleFillDemo}
              className="text-[11px] font-medium text-slate-500 hover:text-brand transition"
            >
              Fill default seed credentials (<span className="font-mono">admin@aptitudearena.com</span>)
            </button>
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-slate-400">
          Not an administrator? <Link href="/" className="font-semibold text-slate-600 hover:underline">Return to student portal</Link>
        </p>
      </div>
    </main>
  );
}


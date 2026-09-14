"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, ExternalLink, Shield } from "lucide-react";
import { clearAuth, getUser } from "@/lib/auth";

export default function Navbar() {
  const router = useRouter();
  const user = getUser();

  const handleLogout = () => {
    clearAuth();
    router.push("/admin/login");
  };

  return (
    <header className="border-b border-slate-200 bg-white sticky top-0 z-30">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/admin" className="flex items-center gap-2 font-bold text-xl tracking-tight text-ink">
              <span>AptitudeArena</span>
              <span className="flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs font-semibold text-brand border border-blue-200">
                <Shield size={12} />
                ADMIN
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/"
              target="_blank"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand transition"
            >
              <span>View Student Site</span>
              <ExternalLink size={13} />
            </Link>

            <div className="h-4 w-px bg-slate-200" />

            {user && (
              <div className="text-xs text-slate-600 hidden sm:block">
                <span className="text-slate-400">Signed in as </span>
                <span className="font-medium text-ink">{user.email}</span>
              </div>
            )}

            <button
              onClick={handleLogout}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition"
              title="Sign out of admin session"
            >
              <LogOut size={14} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}


"use client";

import React from "react";
import Link from "next/link";
import { Shield, ExternalLink } from "lucide-react";
import UserMenu from "./UserMenu";

interface NavbarProps {
  variant?: "default" | "admin";
}

export default function Navbar({ variant = "default" }: NavbarProps): React.JSX.Element {
  if (variant === "admin") {
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

              <UserMenu redirectAfterLogout="/admin/login" />
            </div>
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-brand text-white font-black text-xs shadow-xs">
              AA
            </span>
            <span className="text-base font-black tracking-tight text-ink">
              Aptitude<span className="text-brand">Arena</span>
            </span>
          </Link>
        </div>

        <div className="flex items-center gap-4 sm:gap-6 text-xs font-semibold">
          <Link
            href="/tests"
            className="text-slate-600 hover:text-ink transition hidden sm:inline-block"
          >
            Test Catalog
          </Link>
          <Link
            href="/pricing"
            className="text-slate-600 hover:text-ink transition hidden sm:inline-block"
          >
            Pricing
          </Link>
          <Link
            href="/dashboard"
            className="text-slate-600 hover:text-ink transition hidden md:inline-block"
          >
            Dashboard
          </Link>

          <UserMenu redirectAfterLogout="/login" />
        </div>
      </div>
    </header>
  );
}

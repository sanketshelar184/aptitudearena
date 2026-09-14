"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  LayoutDashboard,
  BookOpen,
  Sparkles,
  Shield,
  ChevronDown,
  User as UserIcon,
} from "lucide-react";
import { clearAuth, getUser } from "@/lib/auth";
import { User } from "@/types/admin";

interface UserMenuProps {
  redirectAfterLogout?: string;
  className?: string;
}

export default function UserMenu({ redirectAfterLogout = "/login", className = "" }: UserMenuProps) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUser(getUser());
    setMounted(true);
  }, []);

  // Close dropdown on outside click or escape key
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      document.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleLogout = () => {
    setIsOpen(false);
    clearAuth();
    router.push(redirectAfterLogout);
  };

  if (!mounted) {
    return <div className="h-8 w-8 rounded-full bg-slate-100 animate-pulse" />;
  }

  if (!user) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <Link
          href="/login"
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-brand transition"
        >
          Sign In
        </Link>
        <Link
          href="/tests/free"
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-3.5 py-1.5 text-xs font-bold text-white shadow-xs hover:bg-blue-700 transition"
        >
          Free Test
        </Link>
      </div>
    );
  }

  const displayName = user.full_name || user.email.split("@")[0];
  const initial = (user.full_name?.[0] || user.email[0] || "U").toUpperCase();
  const isAdmin = user.role === "ADMIN";

  return (
    <div className={`relative ${className}`} ref={menuRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 rounded-full p-1 pl-1 pr-2.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100/80 transition border border-slate-200/90 shadow-2xs focus:outline-none focus:ring-2 focus:ring-brand/20 bg-white"
        aria-expanded={isOpen}
        aria-label="Open profile menu"
      >
        <div className="flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-indigo-600 text-white font-black text-xs shadow-xs">
          {initial}
        </div>
        <span className="hidden sm:inline-block max-w-[120px] truncate font-semibold text-ink">
          {displayName}
        </span>
        <ChevronDown
          size={13}
          className={`text-slate-400 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 rounded-2xl bg-white p-2 shadow-xl ring-1 ring-slate-900/10 z-50 animate-in fade-in zoom-in-95 duration-150">
          {/* User Details Header */}
          <div className="flex items-center gap-3 p-2.5 border-b border-slate-100 pb-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-tr from-brand to-indigo-600 text-white font-black text-sm shadow-xs">
              {initial}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <p className="truncate text-xs font-bold text-ink">{displayName}</p>
                {isAdmin && (
                  <span className="inline-flex items-center gap-0.5 rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-bold text-brand border border-blue-200">
                    <Shield size={10} />
                    ADMIN
                  </span>
                )}
              </div>
              <p className="truncate text-[11px] text-slate-500">{user.email}</p>
            </div>
          </div>

          {/* Quick Navigation Links */}
          <div className="py-1.5 space-y-0.5">
            <Link
              href="/dashboard"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand transition"
            >
              <LayoutDashboard size={14} className="text-slate-400" />
              <span>Student Dashboard</span>
            </Link>

            <Link
              href="/tests"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand transition"
            >
              <BookOpen size={14} className="text-slate-400" />
              <span>Test Catalog</span>
            </Link>

            <Link
              href="/pricing"
              onClick={() => setIsOpen(false)}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-brand transition"
            >
              <Sparkles size={14} className="text-slate-400" />
              <span>Membership & Pricing</span>
            </Link>

            {isAdmin && (
              <Link
                href="/admin"
                onClick={() => setIsOpen(false)}
                className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-brand bg-blue-50/60 hover:bg-blue-50 transition"
              >
                <Shield size={14} className="text-brand" />
                <span>Admin Management</span>
              </Link>
            )}
          </div>

          {/* Logout Action */}
          <div className="border-t border-slate-100 pt-1.5">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50 hover:text-red-700 transition text-left"
            >
              <LogOut size={14} className="text-red-500" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}


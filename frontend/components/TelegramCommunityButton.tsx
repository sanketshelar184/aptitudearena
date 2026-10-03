"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { X } from "lucide-react";

export default function TelegramCommunityButton() {
  const pathname = usePathname();
  const [isDismissed, setIsDismissed] = useState(false);

  // Do not show on active timed test attempt pages so students are not distracted
  if (isDismissed || pathname?.startsWith("/attempt/")) {
    return null;
  }

  const telegramLink = "https://t.me/+u4yA-5lKgFhmMTk1";

  return (
    <aside
      aria-label="Telegram Community Channel"
      className="fixed bottom-5 right-5 z-40 flex items-center group animate-in fade-in slide-in-from-bottom-4 duration-300 select-none"
    >
      <div className="relative flex items-center shadow-lg hover:shadow-xl hover:shadow-[#229ED9]/30 transition-all duration-300 rounded-full">
        {/* Main Floating Button */}
        <a
          href={telegramLink}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2.5 bg-gradient-to-r from-[#2AABEE] via-[#229ED9] to-[#0088cc] hover:from-[#229ED9] hover:to-[#0077b5] text-white pl-3.5 pr-4 py-2.5 rounded-full font-medium text-xs sm:text-sm tracking-tight border border-white/20 active:scale-95 transition-transform"
        >
          {/* Telegram SVG Paper Plane Icon */}
          <div className="relative flex items-center justify-center">
            <svg
              className="w-5 h-5 fill-current text-white shrink-0 drop-shadow-xs"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.16.16-.295.295-.605.295l.213-3.053 5.56-5.023c.242-.213-.054-.333-.373-.121l-6.871 4.326-2.962-.924c-.643-.204-.657-.643.136-.953l11.57-4.461c.537-.194 1.006.131.832.942z" />
            </svg>

            {/* Active Community Pulse Dot */}
            <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-300 opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-400 border border-white" />
            </span>
          </div>

          <div className="flex flex-col text-left leading-tight">
            <span className="font-bold text-white text-[12px] sm:text-[13px] flex items-center gap-1.5">
              <span>Join Telegram</span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold bg-white/20 px-1.5 py-0.2 rounded-full text-white/90">
                Channel
              </span>
            </span>
            <span className="hidden sm:inline text-[10px] text-sky-100 font-normal">
              Placement Drives &amp; Solved Sets
            </span>
          </div>
        </a>

        {/* Small Session Dismiss Button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setIsDismissed(true);
          }}
          className="absolute -top-2 -left-2 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700/80 hover:bg-slate-900 text-white shadow-xs text-[10px] opacity-0 group-hover:opacity-100 transition-opacity"
          title="Dismiss for this session"
          aria-label="Dismiss Telegram button"
        >
          <X size={11} />
        </button>
      </div>
    </aside>
  );
}

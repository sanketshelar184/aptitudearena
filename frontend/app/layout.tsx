import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_APP_URL || "https://aptitudearena.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "AptitudeArena | Practice Faster. Score Better.",
    template: "%s | AptitudeArena",
  },
  description:
    "Timed aptitude practice engine built for campus placements and technical exams. Master Quantitative, Logical Reasoning, and Verbal Ability with realistic mock tests.",
  keywords: [
    "Aptitude Test",
    "Campus Placement Preparation",
    "TCS NQT",
    "Infosys Springboard",
    "Quantitative Aptitude",
    "Logical Reasoning",
    "Verbal Ability",
    "Timed Mock Tests",
    "Placement Practice",
  ],
  authors: [{ name: "AptitudeArena Team" }],
  creator: "AptitudeArena",
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteUrl,
    title: "AptitudeArena | Practice Faster. Score Better.",
    description:
      "Timed aptitude mock tests and weak-area diagnostics engineered for Indian campus placements.",
    siteName: "AptitudeArena",
  },
  twitter: {
    card: "summary_large_image",
    title: "AptitudeArena | Timed Aptitude Practice",
    description:
      "Realistic exam-level aptitude mock tests with instant scoring and speed analytics.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased text-slate-900 bg-slate-50 min-h-screen">
        {children}
      </body>
    </html>
  );
}

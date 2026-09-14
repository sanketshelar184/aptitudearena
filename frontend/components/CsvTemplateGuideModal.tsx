"use client";

import { X, Download, FileSpreadsheet, Info } from "lucide-react";
import { downloadCsvTemplate } from "@/lib/api";
import { useState } from "react";

interface CsvTemplateGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CsvTemplateGuideModal({ isOpen, onClose }: CsvTemplateGuideModalProps) {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadCsvTemplate();
    } catch {
      alert("Failed to download template. Please check backend connection.");
    } finally {
      setIsDownloading(false);
    }
  };

  if (!isOpen) return null;

  const columnGuide = [
    {
      name: "question_text",
      required: true,
      description: "Full question stem or problem statement.",
      example: "What is 20 percent of 200?",
    },
    {
      name: "option_a",
      required: true,
      description: "Text for choice A.",
      example: "20",
    },
    {
      name: "option_b",
      required: true,
      description: "Text for choice B.",
      example: "30",
    },
    {
      name: "option_c",
      required: true,
      description: "Text for choice C.",
      example: "40",
    },
    {
      name: "option_d",
      required: true,
      description: "Text for choice D.",
      example: "50",
    },
    {
      name: "correct_answer",
      required: true,
      description: "The correct choice letter. Must be A, B, C, or D.",
      example: "C",
    },
    {
      name: "explanation",
      required: true,
      description: "Clear step-by-step reasoning or formula breakdown.",
      example: "20 percent of 200 is 40.",
    },
    {
      name: "category",
      required: true,
      description: "Exact name of an existing category.",
      example: "Quantitative Aptitude, Logical Reasoning, Verbal Ability",
    },
    {
      name: "topic",
      required: true,
      description: "Exact name of an existing topic that belongs to the selected category.",
      example: "Percentage, Number Series, Synonyms",
    },
    {
      name: "difficulty",
      required: true,
      description: "Difficulty rating. Allowed values: EASY, MEDIUM, or HARD.",
      example: "EASY",
    },
    {
      name: "estimated_time_seconds",
      required: true,
      description: "Estimated solving time in seconds (integer between 5 and 900).",
      example: "30",
    },
    {
      name: "is_premium",
      required: true,
      description: "Access tier. true for premium, false for free.",
      example: "false",
    },
    {
      name: "source",
      required: false,
      description: "Optional origin or exam attribution (e.g. company placement drive, year).",
      example: "TCS NQT 2024",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 text-brand">
              <FileSpreadsheet size={20} />
            </div>
            <div>
              <h2 className="text-base font-bold text-ink">CSV Question Import Guide & Template</h2>
              <p className="text-xs text-slate-500">Format specifications for bulk question uploads</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Action bar */}
        <div className="mt-4 flex items-center justify-between bg-blue-50/70 border border-blue-100 p-3.5 rounded-xl">
          <div className="flex items-center gap-2 text-xs text-slate-700">
            <Info size={16} className="text-brand shrink-0" />
            <span>Download our official pre-formatted template with all 13 required headers and sample row.</span>
          </div>
          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-3.5 py-2 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 shrink-0"
          >
            <Download size={14} />
            <span>{isDownloading ? "Downloading..." : "Download CSV Template"}</span>
          </button>
        </div>

        {/* Column table */}
        <div className="mt-5">
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Column Specifications</p>
          <div className="overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="py-2.5 px-3">Column Name</th>
                  <th className="py-2.5 px-3">Required</th>
                  <th className="py-2.5 px-3">Rules & Description</th>
                  <th className="py-2.5 px-3">Example</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {columnGuide.map((col) => (
                  <tr key={col.name} className="hover:bg-slate-50/50">
                    <td className="py-2 px-3 font-mono font-semibold text-ink text-[11px]">{col.name}</td>
                    <td className="py-2 px-3">
                      {col.required ? (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-red-50 text-red-700 border border-red-200">
                          Yes
                        </span>
                      ) : (
                        <span className="inline-block rounded px-1.5 py-0.5 text-[10px] font-semibold bg-slate-100 text-slate-600">
                          Optional
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-slate-600">{col.description}</td>
                    <td className="py-2 px-3 font-mono text-[11px] text-slate-500">{col.example}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="mt-6 flex justify-end border-t border-slate-100 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Close Guide
          </button>
        </div>
      </div>
    </div>
  );
}


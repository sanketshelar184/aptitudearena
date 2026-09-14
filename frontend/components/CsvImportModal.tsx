"use client";

import { useRef, useState } from "react";
import {
  UploadCloud,
  X,
  AlertTriangle,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
} from "lucide-react";
import { ImportPreview } from "@/types/admin";
import { commitCsvImport, previewCsvImport } from "@/lib/api";

interface CsvImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImportSuccess: (count: number) => void;
}

export default function CsvImportModal({
  isOpen,
  onClose,
  onImportSuccess,
}: CsvImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetState = () => {
    setSelectedFile(null);
    setPreview(null);
    setIsValidating(false);
    setIsCommitting(false);
    setError(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please select a valid CSV file (.csv)");
      return;
    }

    setSelectedFile(file);
    setError(null);
    setIsValidating(true);

    try {
      const previewData = await previewCsvImport(file);
      setPreview(previewData);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to parse and validate CSV file.");
      setPreview(null);
    } finally {
      setIsValidating(false);
    }
  };

  const handleConfirmImport = async () => {
    if (!preview || preview.valid_rows.length === 0) return;

    setIsCommitting(true);
    setError(null);
    try {
      const result = await commitCsvImport(preview.valid_rows);
      onImportSuccess(result.imported_count);
      handleClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to commit question import.");
    } finally {
      setIsCommitting(false);
    }
  };

  const downloadErrorReport = () => {
    if (!preview || preview.invalid_rows.length === 0) return;

    const rows = [
      ["Row Number", "Validation Errors"].join(","),
      ...preview.invalid_rows.map((inv) =>
        [inv.row, `"${inv.errors.join("; ").replace(/"/g, '""')}"`].join(",")
      ),
    ];

    const csvContent = "data:text/csv;charset=utf-8," + rows.join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `import-error-report-${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
      <div
        className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div>
            <h2 className="text-lg font-bold text-ink">Bulk Question Import (CSV)</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Upload a standard CSV file to validate and import questions into the bank.
            </p>
          </div>
          <button
            onClick={handleClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            <AlertTriangle size={15} className="shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* File Dropzone */}
        {!preview && (
          <div className="mt-6">
            <label
              htmlFor="csv-file-input"
              className={`flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/50 p-8 text-center cursor-pointer transition hover:border-brand hover:bg-blue-50/20 ${
                isValidating ? "opacity-60 pointer-events-none" : ""
              }`}
            >
              {isValidating ? (
                <div className="flex flex-col items-center">
                  <Loader2 size={36} className="animate-spin text-brand" />
                  <p className="mt-3 text-sm font-semibold text-slate-700">Validating CSV rows against database...</p>
                  <p className="text-xs text-slate-400 mt-1">Verifying categories, topics, and question formats</p>
                </div>
              ) : (
                <>
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-50 text-brand">
                    <UploadCloud size={24} />
                  </div>
                  <p className="mt-3 text-sm font-semibold text-ink">
                    Click to browse or drag and drop CSV
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Accepts standard UTF-8 CSV with all 13 required columns
                  </p>
                </>
              )}
              <input
                ref={fileInputRef}
                id="csv-file-input"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
                className="hidden"
                disabled={isValidating}
              />
            </label>
          </div>
        )}

        {/* Import Preview Stage */}
        {preview && (
          <div className="mt-5 space-y-4">
            <div className="flex items-center justify-between bg-slate-50 p-3 rounded-lg border border-slate-200">
              <div className="flex items-center gap-2 text-xs font-medium text-slate-700">
                <FileText size={16} className="text-brand" />
                <span>{selectedFile?.name}</span>
              </div>
              <button
                onClick={resetState}
                className="text-xs font-semibold text-brand hover:underline"
              >
                Choose another file
              </button>
            </div>

            {/* Metrics cards */}
            <div className="grid grid-cols-3 gap-3 text-center">
              <div className="rounded-xl border border-slate-200 bg-white p-3">
                <p className="text-xs text-slate-500 font-medium">Total Rows</p>
                <p className="text-2xl font-bold text-ink mt-0.5">{preview.total_rows}</p>
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3">
                <p className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1">
                  <CheckCircle2 size={13} />
                  Valid Rows
                </p>
                <p className="text-2xl font-bold text-emerald-700 mt-0.5">
                  {preview.valid_rows.length}
                </p>
              </div>

              <div
                className={`rounded-xl border p-3 ${
                  preview.invalid_rows.length > 0
                    ? "border-red-200 bg-red-50/50"
                    : "border-slate-200 bg-slate-50/50"
                }`}
              >
                <p
                  className={`text-xs font-medium flex items-center justify-center gap-1 ${
                    preview.invalid_rows.length > 0 ? "text-red-700" : "text-slate-500"
                  }`}
                >
                  <AlertTriangle size={13} />
                  Invalid Rows
                </p>
                <p
                  className={`text-2xl font-bold mt-0.5 ${
                    preview.invalid_rows.length > 0 ? "text-red-700" : "text-slate-500"
                  }`}
                >
                  {preview.invalid_rows.length}
                </p>
              </div>
            </div>

            {/* Invalid rows details */}
            {preview.invalid_rows.length > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-red-800">
                    Errors detected in {preview.invalid_rows.length} row(s):
                  </span>
                  <button
                    onClick={downloadErrorReport}
                    className="inline-flex items-center gap-1.5 rounded-md bg-white border border-red-300 px-2.5 py-1 text-[11px] font-semibold text-red-700 hover:bg-red-50 transition"
                  >
                    <Download size={12} />
                    Download Error Report
                  </button>
                </div>
                <div className="max-h-40 overflow-y-auto space-y-1.5 pr-1 text-xs">
                  {preview.invalid_rows.map((rowErr) => (
                    <div
                      key={rowErr.row}
                      className="rounded bg-white p-2 border border-red-100 text-red-900 text-[11px]"
                    >
                      <strong className="font-semibold text-red-700">Row {rowErr.row}:</strong>{" "}
                      {rowErr.errors.join("; ")}
                    </div>
                  ))}
                </div>
                <p className="text-[11px] text-red-600 mt-2">
                  Invalid rows will NOT be inserted. Only the {preview.valid_rows.length} valid rows will be committed.
                </p>
              </div>
            )}

            {preview.valid_rows.length === 0 && (
              <p className="text-xs text-center text-red-600 font-medium py-2">
                No valid rows found in this file. Please resolve errors and re-upload.
              </p>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-2.5 border-t border-slate-100 pt-4 mt-4">
              <button
                type="button"
                onClick={handleClose}
                className="rounded-lg border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                disabled={isCommitting}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmImport}
                disabled={preview.valid_rows.length === 0 || isCommitting}
                className="rounded-lg bg-emerald-600 px-5 py-2 text-xs font-semibold text-white hover:bg-emerald-700 transition disabled:opacity-50 flex items-center gap-1.5"
              >
                {isCommitting ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Importing...</span>
                  </>
                ) : (
                  <span>Commit {preview.valid_rows.length} Valid Question(s)</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


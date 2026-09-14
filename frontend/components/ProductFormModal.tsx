"use client";

import { useState, useEffect } from "react";
import { X, Loader2 } from "lucide-react";
import { Product } from "@/types/commerce";
import { adminCreateProduct, adminUpdateProduct } from "@/lib/api";

interface ProductFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  product: Product | null;
}

export default function ProductFormModal({
  isOpen,
  onClose,
  onSaved,
  product,
}: ProductFormModalProps) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [productType, setProductType] = useState<"TEST" | "SUBSCRIPTION">("TEST");
  const [priceInr, setPriceInr] = useState<number>(10);
  const [questionLimit, setQuestionLimit] = useState<number | "">(20);
  const [durationMinutes, setDurationMinutes] = useState<number | "">(15);
  const [billingDays, setBillingDays] = useState<number | "">(30);
  const [isActive, setIsActive] = useState(true);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (product) {
      setName(product.name);
      setDescription(product.description || "");
      setProductType(product.product_type);
      setPriceInr(product.price_inr);
      setQuestionLimit(product.question_limit ?? "");
      setDurationMinutes(product.duration_seconds ? Math.round(product.duration_seconds / 60) : "");
      setBillingDays(product.billing_interval_days ?? "");
      setIsActive(product.is_active);
    } else {
      setName("");
      setDescription("");
      setProductType("TEST");
      setPriceInr(10);
      setQuestionLimit(20);
      setDurationMinutes(15);
      setBillingDays(30);
      setIsActive(true);
    }
    setError(null);
  }, [product, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const pricePaise = Math.round(priceInr * 100);
    const durationSeconds = durationMinutes ? Number(durationMinutes) * 60 : undefined;

    try {
      if (product) {
        await adminUpdateProduct(product.id, {
          name,
          description: description || undefined,
          price_paise: pricePaise,
          question_limit: questionLimit !== "" ? Number(questionLimit) : undefined,
          duration_seconds: durationSeconds,
          billing_interval_days: billingDays !== "" ? Number(billingDays) : undefined,
          is_active: isActive,
        });
      } else {
        await adminCreateProduct({
          name,
          description: description || undefined,
          product_type: productType,
          price_paise: pricePaise,
          currency: "INR",
          question_limit: questionLimit !== "" ? Number(questionLimit) : undefined,
          duration_seconds: durationSeconds,
          billing_interval_days: billingDays !== "" ? Number(billingDays) : undefined,
          is_active: isActive,
        });
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-xs font-sans">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h3 className="text-base font-bold text-ink">
            {product ? "Edit Product & Pricing" : "Create New Product"}
          </h3>
          <button
            onClick={onClose}
            className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700">Product Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 50 Question Sprint"
              required
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description for students..."
              rows={2}
              className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700">Product Type</label>
              <select
                value={productType}
                onChange={(e) => setProductType(e.target.value as "TEST" | "SUBSCRIPTION")}
                disabled={Boolean(product)}
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              >
                <option value="TEST">Single Test Pass</option>
                <option value="SUBSCRIPTION">Monthly Subscription</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700">Price (INR ₹)</label>
              <input
                type="number"
                min={0}
                value={priceInr}
                onChange={(e) => setPriceInr(Number(e.target.value))}
                required
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>
          </div>

          {productType === "TEST" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block font-semibold text-slate-700">Question Count</label>
                <input
                  type="number"
                  min={1}
                  value={questionLimit}
                  onChange={(e) => setQuestionLimit(e.target.value ? Number(e.target.value) : "")}
                  placeholder="20"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>
              <div>
                <label className="block font-semibold text-slate-700">Duration (Minutes)</label>
                <input
                  type="number"
                  min={1}
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(e.target.value ? Number(e.target.value) : "")}
                  placeholder="15"
                  className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
                />
              </div>
            </div>
          ) : (
            <div>
              <label className="block font-semibold text-slate-700">Billing Interval (Days)</label>
              <input
                type="number"
                min={1}
                value={billingDays}
                onChange={(e) => setBillingDays(e.target.value ? Number(e.target.value) : "")}
                placeholder="30"
                className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-xs text-ink focus:border-brand focus:outline-none"
              />
            </div>
          )}

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isActiveCheck"
              checked={isActive}
              onChange={(e) => setIsActive(e.target.checked)}
              className="h-4 w-4 rounded border-slate-300 text-brand focus:ring-brand"
            />
            <label htmlFor="isActiveCheck" className="text-xs font-semibold text-slate-700">
              Active for purchase on website
            </label>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-300 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="inline-flex items-center gap-1.5 rounded-lg bg-brand px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading && <Loader2 size={14} className="animate-spin" />}
              <span>{product ? "Update Product" : "Create Product"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

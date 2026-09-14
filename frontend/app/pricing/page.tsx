"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Check,
  Zap,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  Loader2,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getProducts, createPaymentOrder, verifyPayment } from "@/lib/api";
import { getToken, getUser } from "@/lib/auth";
import { Product, CreateOrderResponse } from "@/types/commerce";
import Navbar from "@/components/Navbar";

const loadRazorpayScript = (): Promise<boolean> => {
  return new Promise((resolve) => {
    if (typeof window === "undefined") return resolve(false);
    if ((window as unknown as { Razorpay: unknown }).Razorpay) {
      return resolve(true);
    }
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.body.appendChild(script);
  });
};

export default function PricingPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Checkout modal state
  const [isOrdering, setIsOrdering] = useState(false);
  const [activeOrder, setActiveOrder] = useState<CreateOrderResponse | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState<string | null>(null);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    getProducts()
      .then(setProducts)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Unable to load pricing options.");
      })
      .finally(() => setIsLoading(false));
  }, []);

  const handleSelectProduct = async (product: Product) => {
    const token = getToken();
    if (!token) {
      router.push(`/login?redirect=/pricing`);
      return;
    }

    setIsOrdering(true);
    setModalError(null);
    try {
      const order = await createPaymentOrder(product.id);
      setActiveOrder(order);

      // If Razorpay live/test credentials are active (not in mock mode)
      if (!order.is_mock_mode) {
        const isLoaded = await loadRazorpayScript();
        if (isLoaded && typeof window !== "undefined" && (window as unknown as { Razorpay: unknown }).Razorpay) {
          const currentUser = getUser();
          const RazorpayClient = (
            window as unknown as {
              Razorpay: new (options: unknown) => {
                open: () => void;
                on: (event: string, callback: (resp: unknown) => void) => void;
              };
            }
          ).Razorpay;
          const rzp = new RazorpayClient({
            key: order.razorpay_key_id,
            amount: order.amount_paise,
            currency: order.currency,
            name: "AptitudeArena",
            description: order.product_name,
            order_id: order.order_id,
            prefill: {
              name: currentUser?.full_name || "",
              email: currentUser?.email || "",
            },
            theme: { color: "#2563eb" },
            modal: {
              ondismiss: () => {
                setIsOrdering(false);
                setActiveOrder(null);
              },
            },
            handler: async (response: {
              razorpay_order_id: string;
              razorpay_payment_id: string;
              razorpay_signature: string;
            }) => {
              setIsVerifying(true);
              try {
                await verifyPayment({
                  order_id: response.razorpay_order_id,
                  payment_id: response.razorpay_payment_id,
                  signature: response.razorpay_signature,
                });
                setPaymentSuccessMessage("Payment verified successfully! Access granted.");
                setTimeout(() => {
                  setActiveOrder(null);
                  router.push("/dashboard");
                }, 1200);
              } catch (vErr: unknown) {
                setModalError(vErr instanceof Error ? vErr.message : "Payment verification failed.");
              } finally {
                setIsVerifying(false);
              }
            },
          });
          rzp.on("payment.failed", (response: unknown) => {
            const errResp = response as { error?: { description?: string } };
            setModalError(errResp?.error?.description || "Payment was not completed or was cancelled.");
            setIsVerifying(false);
          });
          rzp.open();
          setIsOrdering(false);
          return;
        }
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to initiate payment. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  // Mock Payment handlers for development
  const handleSimulateMockSuccess = async () => {
    if (!activeOrder) return;
    setIsVerifying(true);
    setModalError(null);
    try {
      await verifyPayment({
        order_id: activeOrder.order_id,
        payment_id: `pay_mock_${Date.now()}`,
        signature: "mock_signature_approved",
      });
      setPaymentSuccessMessage("Mock payment successful! Entitlements granted.");
      setTimeout(() => {
        setActiveOrder(null);
        router.push("/dashboard");
      }, 1200);
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Mock payment failed.");
    } finally {
      setIsVerifying(false);
    }
  };

  const handleSimulateMockFailure = async () => {
    if (!activeOrder) return;
    setIsVerifying(true);
    setModalError(null);
    try {
      await verifyPayment({
        order_id: activeOrder.order_id,
        payment_id: `pay_mock_failed_${Date.now()}`,
        signature: "mock_fail_signature",
      });
    } catch (err: unknown) {
      setModalError(err instanceof Error ? err.message : "Payment rejected as expected in test mode.");
    } finally {
      setIsVerifying(false);
    }
  };

  const subProduct = products.find((p) => p.product_type === "SUBSCRIPTION");
  const testProduct = products.find((p) => p.product_type === "TEST" && p.price_paise === 1000) || products.find((p) => p.product_type === "TEST");

  return (
    <main className="min-h-screen bg-slate-50 font-sans text-ink">
      {/* Navbar */}
      <nav className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link href="/" className="text-xl font-bold tracking-tight text-ink">
            AptitudeArena
          </Link>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <Link href="/tests" className="text-slate-600 hover:text-ink">
              Test Catalog
            </Link>
            <Link href="/dashboard" className="text-brand hover:underline">
              Student Dashboard
            </Link>
          </div>
        </div>
      </nav>
      <Navbar />

      <div className="mx-auto max-w-6xl px-6 py-12">
        {/* Page Hero */}
        <div className="text-center max-w-2xl mx-auto">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3.5 py-1 text-xs font-bold text-brand border border-blue-200 uppercase tracking-wider">
            <Zap size={13} /> Transparent Pricing
          </span>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
            Affordable Practice for College Placements
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            No expensive ₹10,000 coaching packages. Practice real placement questions with full solutions for ₹10 per test or ₹99/month.
          </p>
        </div>

        {error && (
          <div className="mt-6 max-w-md mx-auto rounded-xl border border-red-200 bg-red-50 p-4 text-xs text-red-700">
            {error}
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <Loader2 size={32} className="animate-spin text-brand" />
            <p className="mt-3 text-xs font-medium text-slate-500">Loading plan options...</p>
          </div>
        ) : (
          <div className="mt-12 grid grid-cols-1 gap-8 lg:grid-cols-3 max-w-5xl mx-auto items-stretch">
            {/* Free Tier */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  DIAGNOSTIC EXAM
                </span>
                <h3 className="mt-4 text-xl font-bold text-ink">Free First Test</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Evaluate arithmetic, logical reasoning, and verbal clarity in 15 minutes.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-ink">₹0</span>
                  <span className="text-xs text-slate-400">/ 1 test</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>20 standard placement questions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>Mixed categories (Math, Logic, Verbal)</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>Full solutions & weakest topic diagnostic</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>No credit card or login needed to start</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <Link
                  href="/tests/free"
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white py-2.5 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  <span>Take Free Test</span>
                  <ArrowRight size={14} />
                </Link>
              </div>
            </div>

            {/* Monthly Pro Plan (Featured) */}
            <div className="relative flex flex-col justify-between rounded-2xl border-2 border-brand bg-gradient-to-b from-blue-50/40 via-white to-white p-7 shadow-md">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand px-3 py-0.5 text-[11px] font-bold text-white uppercase tracking-wider shadow-xs">
                BEST VALUE FOR PLACEMENTS
              </div>

              <div>
                <span className="rounded-md bg-blue-100 px-2.5 py-1 text-xs font-bold text-brand">
                  PRO SUBSCRIPTION
                </span>
                <h3 className="mt-4 text-xl font-bold text-ink">Monthly Unlimited</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Complete access to all placement tests, topic sprints, and performance tracking.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-brand">
                    ₹{subProduct?.price_inr || 99}
                  </span>
                  <span className="text-xs text-slate-500">/ month</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-700 font-medium">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-brand shrink-0" />
                    <span><strong>Unlimited</strong> eligible tests & topic sprints</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-brand shrink-0" />
                    <span>All Quantitative, Reasoning, & Verbal questions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-brand shrink-0" />
                    <span>Detailed analytics & continuous score tracking</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-brand shrink-0" />
                    <span>Test attempt history & solution review anytime</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-brand shrink-0" />
                    <span>Cancel anytime with 1 click</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-blue-100">
                <button
                  onClick={() => subProduct && handleSelectProduct(subProduct)}
                  disabled={isOrdering}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand py-3 px-4 text-xs font-bold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {isOrdering ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={14} />
                      <span>Subscribe to Pro (₹{subProduct?.price_inr || 99}/mo)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Single ₹10 Test Pass */}
            <div className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-7 shadow-xs">
              <div>
                <span className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
                  TARGETED SPRINT PASS
                </span>
                <h3 className="mt-4 text-xl font-bold text-ink">Single Test Pass</h3>
                <p className="mt-1 text-xs text-slate-500">
                  Target a specific weak topic or category without a monthly commitment.
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="text-4xl font-extrabold text-ink">
                    ₹{testProduct?.price_inr || 10}
                  </span>
                  <span className="text-xs text-slate-400">/ 1 test</span>
                </div>

                <ul className="mt-6 space-y-3 text-xs text-slate-600">
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>20-question targeted sprint</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>Real-time 15-minute exam countdown</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>Instant score report & step-by-step solutions</span>
                  </li>
                  <li className="flex items-center gap-2.5">
                    <Check size={16} className="text-emerald-500 shrink-0" />
                    <span>Stored in your student dashboard</span>
                  </li>
                </ul>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <button
                  onClick={() => testProduct && handleSelectProduct(testProduct)}
                  disabled={isOrdering}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 py-2.5 px-4 text-xs font-semibold text-white hover:bg-slate-800 transition disabled:opacity-50"
                >
                  {isOrdering ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <>
                      <span>Buy ₹{testProduct?.price_inr || 10} Test Pass</span>
                      <ArrowRight size={14} />
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Security / Indian Payment Info */}
        <div className="mt-14 max-w-3xl mx-auto rounded-2xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <ShieldCheck size={28} className="text-emerald-600 shrink-0" />
            <div className="text-xs">
              <p className="font-bold text-ink">Secure Indian Payments via Razorpay</p>
              <p className="text-slate-500 mt-0.5">
                Supports UPI (Google Pay, PhonePe, Paytm), NetBanking, Credit/Debit cards.
              </p>
            </div>
          </div>
          <div className="text-[11px] text-slate-400 shrink-0">
            <span>256-bit encrypted checkout</span>
          </div>
        </div>
      </div>

      {/* Checkout / Development Payment Modal */}
      {activeOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2 text-ink font-bold text-sm">
                <CreditCard size={18} className="text-brand" />
                <span>Checkout: {activeOrder.product_name}</span>
              </div>
              <span className="text-lg font-extrabold text-ink">₹{activeOrder.amount_inr}</span>
            </div>

            {paymentSuccessMessage ? (
              <div className="py-8 text-center">
                <CheckCircle2 size={40} className="mx-auto text-emerald-600 mb-3" />
                <h4 className="text-base font-bold text-ink">Payment Successful!</h4>
                <p className="text-xs text-slate-500 mt-1">{paymentSuccessMessage}</p>
                <p className="text-[11px] text-slate-400 mt-3">Redirecting to your dashboard...</p>
              </div>
            ) : (
              <div className="py-4">
                {modalError && (
                  <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-xs text-red-700 flex items-start gap-2">
                    <AlertCircle size={15} className="shrink-0 mt-0.5" />
                    <span>{modalError}</span>
                  </div>
                )}

                {activeOrder.is_mock_mode ? (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
                    <p className="font-bold flex items-center gap-1.5">
                      <Zap size={14} className="text-brand" />
                      Safe Development Payment Mode Active
                    </p>
                    <p className="mt-1 text-[11px] text-blue-800 leading-normal">
                      Razorpay credentials are in development mode. You can simulate instant payment success or failure to verify backend signature processing and entitlement fulfillment without real transactions.
                    </p>
                    <div className="mt-3 text-[10px] text-slate-500 font-mono">
                      Order ID: {activeOrder.order_id}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">
                    Order created ({activeOrder.order_id}). Completing payment via gateway...
                  </p>
                )}

                <div className="mt-6 flex flex-col gap-2.5">
                  {activeOrder.is_mock_mode && (
                    <>
                      <button
                        onClick={handleSimulateMockSuccess}
                        disabled={isVerifying}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-2.5 px-4 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition disabled:opacity-50"
                      >
                        {isVerifying ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <>
                            <CheckCircle2 size={14} />
                            <span>Simulate Successful Payment (₹{activeOrder.amount_inr})</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={handleSimulateMockFailure}
                        disabled={isVerifying}
                        className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white py-2 px-4 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
                      >
                        <XCircle size={14} className="text-red-500" />
                        <span>Simulate Failed Payment</span>
                      </button>
                    </>
                  )}

                  <button
                    onClick={() => setActiveOrder(null)}
                    disabled={isVerifying}
                    className="mt-1 text-center text-xs text-slate-400 hover:text-slate-600"
                  >
                    Cancel Transaction
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

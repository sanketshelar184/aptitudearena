"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";
import { studentGoogleLogin } from "@/lib/api";
import { Loader2, AlertCircle } from "lucide-react";

interface GoogleSignInButtonProps {
  textType?: "signin" | "signup";
  guestAttemptId?: string | null;
  guestToken?: string | null;
  redirectUrl?: string;
  onError?: (error: string) => void;
  onSuccess?: () => void;
}

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
            cancel_on_tap_outside?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number | string;
            }
          ) => void;
          prompt?: () => void;
        };
      };
    };
  }
}

export default function GoogleSignInButton({
  textType = "signin",
  guestAttemptId,
  guestToken,
  redirectUrl = "/dashboard",
  onError,
  onSuccess,
}: GoogleSignInButtonProps) {
  const router = useRouter();
  const buttonContainerRef = useRef<HTMLDivElement>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [showConfigNotice, setShowConfigNotice] = useState(false);

  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

  const handleCredentialResponse = useCallback(
    async (response: { credential: string }) => {
      setIsAuthenticating(true);
      try {
        await studentGoogleLogin({
          credential: response.credential,
          guest_attempt_id: guestAttemptId || undefined,
          guest_token: guestToken || undefined,
        });

        if (onSuccess) {
          onSuccess();
        } else {
          router.push(redirectUrl);
        }
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : "Google authentication failed";
        if (onError) onError(msg);
      } finally {
        setIsAuthenticating(false);
      }
    },
    [guestAttemptId, guestToken, onError, onSuccess, redirectUrl, router]
  );

  const renderGoogleButton = useCallback(() => {
    if (!clientId || !window.google?.accounts?.id || !buttonContainerRef.current) {
      return;
    }

    try {
      window.google.accounts.id.initialize({
        client_id: clientId,
        callback: handleCredentialResponse,
        auto_select: false,
        cancel_on_tap_outside: true,
      });

      // Clear container before rendering
      buttonContainerRef.current.innerHTML = "";

      window.google.accounts.id.renderButton(buttonContainerRef.current, {
        theme: "outline",
        size: "large",
        text: textType === "signup" ? "signup_with" : "continue_with",
        shape: "rectangular",
        logo_alignment: "left",
        width: 360,
      });
    } catch {
      // Graceful fallback if Google initialization fails
    }
  }, [clientId, handleCredentialResponse, textType]);

  useEffect(() => {
    if (isScriptLoaded) {
      renderGoogleButton();
    }
  }, [isScriptLoaded, renderGoogleButton]);

  const handleDemoSignIn = async () => {
    setIsAuthenticating(true);
    try {
      const demoEmail = `student_${Math.floor(1000 + Math.random() * 9000)}@gmail.com`;
      await studentGoogleLogin({
        credential: `test-google-token:${demoEmail}:Placement Student`,
        guest_attempt_id: guestAttemptId || undefined,
        guest_token: guestToken || undefined,
      });

      if (onSuccess) {
        onSuccess();
      } else {
        router.push(redirectUrl);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Demo sign-in failed";
      if (onError) onError(msg);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Official Google GSI Script */}
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setIsScriptLoaded(true)}
      />

      {isAuthenticating && (
        <div className="mb-3 inline-flex items-center gap-2 text-xs font-semibold text-brand">
          <Loader2 size={15} className="animate-spin" />
          <span>Authenticating with Google...</span>
        </div>
      )}

      {clientId ? (
        <div
          ref={buttonContainerRef}
          className="w-full flex justify-center min-h-[44px]"
        />
      ) : (
        <div className="w-full flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={() => setShowConfigNotice((prev) => !prev)}
            className="w-full flex items-center justify-center gap-3 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-slate-50 transition"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>
              {textType === "signup" ? "Sign up with Google" : "Continue with Google"}
            </span>
          </button>

          {showConfigNotice && (
            <div className="w-full rounded-xl border border-blue-200 bg-blue-50/70 p-3.5 text-xs text-blue-900 shadow-2xs">
              <div className="flex items-start gap-2">
                <AlertCircle size={15} className="text-brand shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold">Google Client ID Setup</p>
                  <p className="text-[11px] text-blue-800 leading-relaxed">
                    To connect your official Google Cloud project, add{" "}
                    <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">
                      NEXT_PUBLIC_GOOGLE_CLIENT_ID
                    </code>{" "}
                    to <code className="bg-blue-100 px-1 py-0.5 rounded font-mono text-[10px]">frontend/.env.local</code>.
                  </p>
                  <button
                    type="button"
                    onClick={handleDemoSignIn}
                    disabled={isAuthenticating}
                    className="mt-2 inline-flex items-center gap-1 font-bold text-brand hover:underline"
                  >
                    <span>Click here to test 1-click Google Sign-In with Demo Account</span>
                    <span>&rarr;</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}


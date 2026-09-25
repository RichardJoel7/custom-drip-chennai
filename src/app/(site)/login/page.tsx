"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.63h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.87c2.27-2.09 3.58-5.17 3.58-8.81Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.94-2.92l-3.87-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.27a7.2 7.2 0 0 1 0-4.54v-3.1H1.27a12 12 0 0 0 0 10.74l4-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.34.6 4.58 1.79l3.44-3.44C17.95 1.19 15.24 0 12 0A12 12 0 0 0 1.27 6.63l4 3.1C6.22 6.87 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}

// Supabase lets a new code go out once a minute.
const RESEND_SECONDS = 60;

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  // "verify": an email sign-up is waiting for the code we emailed.
  const [mode, setMode] = useState<"signin" | "signup" | "verify">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Ticks the "Resend code in 42s" countdown while it's running.
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  function askForCode(message: string) {
    setMode("verify");
    setCode("");
    setInfo(message);
    setNow(Date.now());
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
  }

  function goTo(nextMode: "signin" | "signup") {
    setMode(nextMode);
    setError(null);
    setInfo(null);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: verifyError } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: "signup" });
    if (verifyError) {
      // Supabase gives the same error for a wrong code and an expired one.
      setError("That code is wrong or has expired. Check the latest email, or tap Resend code for a new one.");
      setLoading(false);
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleResend() {
    setError(null);
    const supabase = createClient();
    const { error: resendError } = await supabase.auth.resend({
      type: "signup",
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (resendError) {
      setError("Couldn't send a new code just now. Please wait a minute and try again.");
      return;
    }
    askForCode(`We've sent a new code to ${email}.`);
  }

  async function handleGoogle() {
    setError(null);
    const supabase = createClient();
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });
    if (oauthError) setError("Couldn't start Google sign-in. Please try again.");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);

    const supabase = createClient();

    if (mode === "signin") {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
      if (signInError?.code === "email_not_confirmed") {
        // Signed up but never entered the code: send a fresh one and ask for it.
        setLoading(false);
        await handleResend();
        return;
      }
      if (signInError) {
        setError("Incorrect email or password.");
        setLoading(false);
        return;
      }
      router.push(next);
      router.refresh();
      return;
    }

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}` },
    });

    if (signUpError) {
      if (signUpError.message.includes("already registered")) {
        setMode("signin");
        setError("An account with that email already exists. Sign in instead.");
      } else {
        setError("Couldn't create your account. Please try again.");
      }
      setLoading(false);
      return;
    }

    // Supabase answers a sign-up for an already-confirmed email with a user that has no
    // identities (so it doesn't reveal who has an account) — send them to sign in.
    if (data.user && data.user.identities?.length === 0) {
      setMode("signin");
      setError("An account with that email already exists. Sign in instead.");
      setLoading(false);
      return;
    }

    if (!data.session) {
      askForCode(`We've sent a 6-digit code to ${email}.`);
      setLoading(false);
      return;
    }

    router.push(next);
    router.refresh();
  }

  if (mode === "verify") {
    return (
      <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-10">
        <div className="w-full">
          <h1 className="font-display text-3xl tracking-wide">CHECK YOUR EMAIL</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {info ?? `We've sent a 6-digit code to ${email}.`} Enter it below to finish creating your account.
          </p>

          <form onSubmit={handleVerify} className="mt-6 space-y-4">
            <div>
              <Label htmlFor="code">Code</Label>
              <Input
                id="code"
                inputMode="numeric"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={10}
                placeholder="123456"
                className="text-center text-2xl font-semibold tracking-[0.4em]"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              />
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}

            <Button type="submit" size="lg" className="w-full" disabled={loading || code.length < 6}>
              {loading ? "Checking…" : "Verify & Create Account"}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            No email? Check spam, or{" "}
            {resendIn > 0 ? (
              <span>resend in {resendIn}s</span>
            ) : (
              <button type="button" onClick={handleResend} className="font-semibold text-foreground underline underline-offset-4">
                Resend code
              </button>
            )}
          </p>
          <button
            type="button"
            className="mt-3 w-full text-center text-sm font-semibold underline underline-offset-4"
            onClick={() => goTo("signup")}
          >
            Use a different email
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-10">
      <div className="w-full">
        <h1 className="font-display text-3xl tracking-wide">{mode === "signin" ? "SIGN IN" : "CREATE ACCOUNT"}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "signin" ? "Sign in to check out and track your orders." : "Sign up to check out and track your orders."}
        </p>

        <Button
          type="button"
          variant="outline"
          size="lg"
          className="mt-6 w-full gap-2.5"
          onClick={handleGoogle}
        >
          <GoogleIcon />
          Continue with Google
        </Button>

        <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              autoComplete="username"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete={mode === "signin" ? "current-password" : "new-password"}
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : mode === "signin" ? "Sign In" : "Create Account"}
          </Button>
        </form>

        <button
          type="button"
          className="mt-5 w-full text-center text-sm font-semibold underline underline-offset-4"
          onClick={() => goTo(mode === "signin" ? "signup" : "signin")}
        >
          {mode === "signin" ? "Don't have an account? Sign up" : "Already have an account? Sign in"}
        </button>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

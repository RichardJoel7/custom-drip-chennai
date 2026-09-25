"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { createClient } from "@/lib/supabase/client";
import { emailHasAccount } from "./actions";

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

// Supabase lets a new code go out to the same email once a minute.
const RESEND_SECONDS = 60;
const MIN_PASSWORD = 6;

type Mode = "signin" | "signup" | "forgot" | "verify" | "password";
/** Why a code was emailed: creating an account, or setting a new password. */
type Purpose = "signup" | "reset";

/** Turns Supabase's email errors into something a customer can act on. */
function sendErrorMessage(message: string) {
  const wait = message.match(/after (\d+) seconds?/i);
  if (wait) return Number(wait[1]) > 1 ? `Please wait ${wait[1]} seconds before asking for another code.` : "Please wait a moment and try again.";
  if (/rate limit/i.test(message)) return "Too many emails sent just now. Please try again in a few minutes.";
  if (/signups? not allowed/i.test(message)) return "There's no account with that email yet — create one instead.";
  if (/invalid.*email|email.*invalid/i.test(message)) return "Enter a valid email address.";
  return "We couldn't send the email right now. Please try again in a minute.";
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/";

  // signin / signup (email only) / forgot → "verify" (the emailed code) → "password" (set it)
  const [mode, setMode] = useState<Mode>("signin");
  const [purpose, setPurpose] = useState<Purpose>("signup");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [resendAt, setResendAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  // Sign-up found an existing account for this email.
  const [alreadyMember, setAlreadyMember] = useState(false);

  // Ticks the "resend in 42s" countdown while it's running.
  useEffect(() => {
    if (resendAt <= Date.now()) return;
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(timer);
  }, [resendAt]);
  const resendIn = Math.max(0, Math.ceil((resendAt - now) / 1000));

  function goTo(nextMode: Mode) {
    setMode(nextMode);
    setError(null);
    setInfo(null);
    setAlreadyMember(false);
    setPassword("");
    setConfirmPassword("");
  }

  /** Emails a 6-digit code. New emails get an account created (still without a password). */
  async function sendCode(forPurpose: Purpose) {
    setError(null);
    setLoading(true);
    const supabase = createClient();
    const { error: sendError } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { shouldCreateUser: forPurpose === "signup" },
    });
    setLoading(false);
    if (sendError) {
      console.error("sending the code failed:", sendError.message);
      setError(sendErrorMessage(sendError.message));
      return;
    }
    setPurpose(forPurpose);
    setMode("verify");
    setCode("");
    setInfo(`We've sent a 6-digit code to ${email.trim()}.`);
    setNow(Date.now());
    setResendAt(Date.now() + RESEND_SECONDS * 1000);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const supabase = createClient();
    // "email" covers both a new account's code and an existing account's code.
    const { error: verifyError } = await supabase.auth.verifyOtp({ email: email.trim(), token: code.trim(), type: "email" });
    setLoading(false);
    if (verifyError) {
      // Supabase gives the same error for a wrong code and an expired one.
      setError("That code is wrong or has expired. Check the latest email, or tap Resend code for a new one.");
      return;
    }
    // The code signed them in; now they choose a password for next time.
    setMode("password");
    setInfo(null);
  }

  async function handleSetPassword(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirmPassword) return setError("The two passwords don't match.");
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setLoading(false);
      setError(
        /different from the old/i.test(updateError.message)
          ? "That's your current password — choose a new one, or just continue."
          : /weak|short|characters/i.test(updateError.message)
            ? "That password is too weak. Try a longer one."
            : "Couldn't save your password. Please try again."
      );
      return;
    }
    router.push(next);
    router.refresh();
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

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    if (signInError) {
      setLoading(false);
      setError("Incorrect email or password. New here, or never set a password? Use Forgot password.");
      return;
    }
    router.push(next);
    router.refresh();
  }

  async function handleEmailStep(e: React.FormEvent) {
    e.preventDefault();
    if (mode === "forgot") return sendCode("reset");

    // Already signed up (and maybe forgotten)? Point them to sign in instead of a new code.
    setError(null);
    setLoading(true);
    const exists = await emailHasAccount(email);
    setLoading(false);
    if (exists) {
      setAlreadyMember(true);
      return;
    }
    sendCode("signup");
  }

  const emailField = (
    <div>
      <Label htmlFor="email">Email</Label>
      <Input
        id="email"
        type="email"
        autoComplete="username"
        required
        value={email}
        onChange={(e) => {
          setEmail(e.target.value);
          setAlreadyMember(false);
        }}
      />
    </div>
  );

  // --- step 2: the emailed code ---
  if (mode === "verify") {
    return (
      <Shell title="CHECK YOUR EMAIL" subtitle={`${info ?? `We've sent a 6-digit code to ${email}.`} Enter it below.`}>
        <form onSubmit={handleVerify} className="space-y-4">
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
            {loading ? "Checking…" : "Continue"}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-muted-foreground">
          No email? Check spam, or{" "}
          {resendIn > 0 ? (
            <span>resend in {resendIn}s</span>
          ) : (
            <button
              type="button"
              onClick={() => sendCode(purpose)}
              disabled={loading}
              className="font-semibold text-foreground underline underline-offset-4"
            >
              Resend code
            </button>
          )}
        </p>
        <button
          type="button"
          className="mt-3 w-full text-center text-sm font-semibold underline underline-offset-4"
          onClick={() => goTo(purpose === "reset" ? "forgot" : "signup")}
        >
          Use a different email
        </button>
      </Shell>
    );
  }

  // --- step 3: choose a password ---
  if (mode === "password") {
    return (
      <Shell
        title={purpose === "reset" ? "NEW PASSWORD" : "SET YOUR PASSWORD"}
        subtitle={`${email} is confirmed. Choose a password to sign in with next time.`}
      >
        <form onSubmit={handleSetPassword} className="space-y-4">
          <div>
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              autoFocus
              required
              minLength={MIN_PASSWORD}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <p className="mt-1 text-xs text-muted-foreground">At least {MIN_PASSWORD} characters.</p>
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <Input
              id="confirmPassword"
              type="password"
              autoComplete="new-password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Saving…" : purpose === "reset" ? "Save Password" : "Create Account"}
          </Button>
        </form>
      </Shell>
    );
  }

  // --- step 1: sign in, or an email to start sign-up / reset ---
  const titles: Record<"signin" | "signup" | "forgot", [string, string]> = {
    signin: ["SIGN IN", "Sign in to check out and track your orders."],
    signup: ["CREATE ACCOUNT", "Enter your email — we'll send you a code to confirm it, then you'll set a password."],
    forgot: ["FORGOT PASSWORD", "Enter your email and we'll send you a code to set a new password."],
  };
  const [title, subtitle] = titles[mode];

  return (
    <Shell title={title} subtitle={subtitle}>
      {mode !== "forgot" && (
        <>
          <Button type="button" variant="outline" size="lg" className="w-full gap-2.5" onClick={handleGoogle}>
            <GoogleIcon />
            Continue with Google
          </Button>

          <div className="my-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
        </>
      )}

      {mode === "signin" ? (
        <form onSubmit={handleSignIn} className="space-y-4">
          {emailField}
          <div>
            <div className="flex items-baseline justify-between">
              <Label htmlFor="password">Password</Label>
              <button
                type="button"
                onClick={() => goTo("forgot")}
                className="mb-1.5 text-xs font-semibold underline underline-offset-4"
              >
                Forgot password?
              </button>
            </div>
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}
          {info && <p className="text-sm text-success">{info}</p>}

          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Please wait…" : "Sign In"}
          </Button>
        </form>
      ) : (
        <form onSubmit={handleEmailStep} className="space-y-4">
          {emailField}
          {error && <p className="text-sm text-danger">{error}</p>}
          {alreadyMember && (
            <div className="rounded-2xl bg-muted p-4 text-sm" role="alert">
              <p className="font-semibold">You&apos;re already a member.</p>
              <p className="mt-1 text-muted-foreground">
                {email.trim()} already has an account. Sign in with your password or Google — or use Forgot password if
                you&apos;ve forgotten it.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button type="button" size="md" onClick={() => goTo("signin")}>
                  Sign In
                </Button>
                <Button type="button" size="md" variant="outline" onClick={() => goTo("forgot")}>
                  Forgot Password
                </Button>
              </div>
            </div>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? "Sending code…" : "Send Code"}
          </Button>
        </form>
      )}

      <button
        type="button"
        className="mt-5 w-full text-center text-sm font-semibold underline underline-offset-4"
        onClick={() => goTo(mode === "signin" ? "signup" : "signin")}
      >
        {mode === "signin" ? "Don't have an account? Sign up" : "Back to sign in"}
      </button>
    </Shell>
  );
}

function Shell({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm items-center px-4 py-10">
      <div className="w-full">
        <h1 className="font-display text-3xl tracking-wide">{title}</h1>
        <p className="mb-6 mt-1 text-sm text-muted-foreground">{subtitle}</p>
        {children}
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

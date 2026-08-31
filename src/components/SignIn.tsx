"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";

type Step = "signIn" | "signUp" | "verify";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [step, setStep] = useState<Step>("signIn");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onAuth(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", step === "signUp" ? "signUp" : "signIn");
    const emailVal = String(form.get("email") ?? "");
    try {
      await signIn("password", form);
      if (step === "signUp") {
        // account created — a code was emailed; move to verification.
        setEmail(emailVal);
        setStep("verify");
        setBusy(false);
      }
      // signIn success navigates away (Authenticated renders the app).
    } catch {
      setError(step === "signIn" ? "Wrong email or password." : "Could not create account (already registered?).");
      setBusy(false);
    }
  }

  async function onVerify(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const form = new FormData(e.currentTarget);
    form.set("flow", "email-verification");
    form.set("email", email);
    try {
      await signIn("password", form);
      // verified — Authenticated renders the app.
    } catch {
      setError("That code isn't right or has expired.");
      setBusy(false);
    }
  }

  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 via-amber-300 to-violet-400 text-base font-bold text-black">P</span>
          <span className="text-xl font-semibold tracking-tight">Prism</span>
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          {step === "verify" ? (
            <>
              <h1 className="text-lg font-semibold">Check your email</h1>
              <p className="mt-1 text-sm text-white/50">We sent a 6-digit code to <span className="text-white/80">{email}</span>.</p>
              <form className="mt-5 space-y-3" onSubmit={onVerify}>
                <input
                  name="code"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  required
                  placeholder="123456"
                  className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-center text-lg tracking-[0.4em] outline-none placeholder:text-white/25 focus:border-white/30"
                />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <button disabled={busy} className="w-full rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
                  {busy ? "…" : "Verify & continue"}
                </button>
              </form>
              <button onClick={() => { setError(null); setStep("signUp"); }} className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80">
                Use a different email
              </button>
            </>
          ) : (
            <>
              <h1 className="text-lg font-semibold">{step === "signIn" ? "Sign in" : "Create your account"}</h1>
              <p className="mt-1 text-sm text-white/50">Access your Prism workspace.</p>
              <form className="mt-5 space-y-3" onSubmit={onAuth}>
                <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
                <input name="password" type="password" required minLength={6} placeholder="Password (min 6 chars)" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
                {error && <p className="text-sm text-rose-400">{error}</p>}
                <button disabled={busy} className="w-full rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
                  {busy ? "…" : step === "signIn" ? "Sign in" : "Create account"}
                </button>
              </form>
              <button
                onClick={() => { setError(null); setStep(step === "signIn" ? "signUp" : "signIn"); }}
                className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80"
              >
                {step === "signIn" ? "New here? Create an account" : "Have an account? Sign in"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

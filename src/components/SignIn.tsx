"use client";

import { useState } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import Link from "next/link";

export function SignIn() {
  const { signIn } = useAuthActions();
  const [flow, setFlow] = useState<"signIn" | "signUp">("signIn");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  return (
    <div className="grid min-h-[70vh] place-items-center px-6">
      <div className="w-full max-w-sm">
        <Link href="/" className="mb-8 flex items-center justify-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-rose-400 via-amber-300 to-violet-400 text-base font-bold text-black">P</span>
          <span className="text-xl font-semibold tracking-tight">Prism</span>
        </Link>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <h1 className="text-lg font-semibold">{flow === "signIn" ? "Sign in" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-white/50">Access your Prism workspace.</p>
          <form
            className="mt-5 space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              setError(null);
              setBusy(true);
              const form = new FormData(e.currentTarget);
              form.set("flow", flow);
              try {
                await signIn("password", form);
              } catch {
                setError(flow === "signIn" ? "Wrong email or password." : "Could not create account (is it already registered?).");
                setBusy(false);
              }
            }}
          >
            <input name="email" type="email" required placeholder="you@example.com" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
            <input name="password" type="password" required minLength={6} placeholder="Password (min 6 chars)" className="w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none placeholder:text-white/30 focus:border-white/30" />
            {error && <p className="text-sm text-rose-400">{error}</p>}
            <button disabled={busy} className="w-full rounded-lg bg-white py-2 text-sm font-medium text-black transition hover:bg-white/90 disabled:opacity-60">
              {busy ? "…" : flow === "signIn" ? "Sign in" : "Create account"}
            </button>
          </form>
          <button
            onClick={() => { setError(null); setFlow(flow === "signIn" ? "signUp" : "signIn"); }}
            className="mt-4 w-full text-center text-sm text-white/50 hover:text-white/80"
          >
            {flow === "signIn" ? "New here? Create an account" : "Have an account? Sign in"}
          </button>
        </div>
      </div>
    </div>
  );
}

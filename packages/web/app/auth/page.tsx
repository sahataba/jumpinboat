"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

import {
  clearPersistedAuthSession,
  persistAuthSession,
  readPersistedAuthSession,
  submitAuthForm,
  type AuthMode,
  type AuthSession,
} from "../../lib/auth";

const emptyFeedback = "Use this screen to create an owner account or sign back in.";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    setSession(readPersistedAuthSession());
    setIsHydrated(true);
  }, []);

  const submitLabel = useMemo(
    () => (mode === "sign-up" ? "Create owner account" : "Sign in"),
    [mode],
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setFeedback("Working...");

    try {
      const nextSession = await submitAuthForm(mode, {
        email,
        password,
        rolePrimary: "owner",
      });

      persistAuthSession(nextSession);
      setSession(nextSession);
      setFeedback(
        mode === "sign-up"
          ? "Owner account created. Token stored locally for this browser."
          : "Signed in successfully. Token stored locally for this browser.",
      );
      setPassword("");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignOut = () => {
    clearPersistedAuthSession();
    setSession(null);
    setFeedback("Signed out and cleared local session state.");
  };

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(251,191,36,0.18),_transparent_32%),linear-gradient(180deg,_#fffdf5_0%,_#f5efe2_48%,_#f8fafc_100%)] text-slate-900">
      <section className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-8 px-6 py-10 md:px-10 lg:grid lg:grid-cols-[0.92fr_1.08fr] lg:items-center lg:px-12 lg:py-16">
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-amber-200 bg-white/80 px-4 py-2 text-sm font-medium text-amber-900 shadow-sm backdrop-blur"
          >
            Back to discovery
          </Link>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-amber-800">
              Owner access
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
              Start managing listings with a lightweight auth flow.
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 md:text-lg">
              This slice wires the new API auth endpoints into the web app so owner onboarding,
              sign-in, and local token persistence are testable end to end.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(71,85,105,0.12)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Role model</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">`owner` and `admin` only</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Booking is available to any signed-in user; elevated permissions stay intentionally small.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(71,85,105,0.12)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Current behavior</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Local session only</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Tokens are stored in browser local storage until we add shared auth state and guarded routes.
              </p>
            </div>
          </div>
        </div>

        <section className="rounded-[32px] border border-white/70 bg-white/85 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.14)] backdrop-blur md:p-8">
          <div className="flex flex-wrap gap-3">
            {([
              ["sign-up", "Create account"],
              ["sign-in", "Sign in"],
            ] as const).map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setMode(value)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  mode === value
                    ? "bg-slate-950 text-white"
                    : "border border-slate-200 bg-slate-50 text-slate-700"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Email</span>
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="owner@jumpinboat.test"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                required
              />
            </label>

            <label className="block">
              <span className="mb-2 block text-sm font-medium text-slate-700">Password</span>
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-amber-500 focus:bg-white"
                required
              />
            </label>

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? "Working..." : submitLabel}
            </button>
          </form>

          <div className="mt-6 rounded-[28px] border border-amber-100 bg-amber-50/80 p-4 text-sm leading-6 text-amber-950">
            {feedback}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Session state</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {!isHydrated ? "Loading local session..." : session ? "Authenticated" : "Signed out"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={!session}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Clear session
              </button>
            </div>

            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <p>
                <span className="font-medium text-slate-900">Email:</span>{" "}
                {session?.user.email ?? "-"}
              </p>
              <p>
                <span className="font-medium text-slate-900">Role:</span>{" "}
                {session?.user.rolePrimary ?? "-"}
              </p>
              <p className="break-all">
                <span className="font-medium text-slate-900">Token:</span>{" "}
                {session?.token ?? "-"}
              </p>
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}

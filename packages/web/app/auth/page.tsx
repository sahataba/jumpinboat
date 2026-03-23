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

const emptyFeedback =
  "Create an account to list boats and manage booking requests, or sign in to continue.";

export default function AuthPage() {
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [canBook, setCanBook] = useState(true);
  const [canListBoats, setCanListBoats] = useState(true);

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
        canBook,
        canListBoats,
      });

      persistAuthSession(nextSession);
      setSession(nextSession);
      setFeedback(
        mode === "sign-up"
          ? "Account created. You're signed in on this device."
          : "You're signed in on this device.",
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
    setFeedback("You're signed out.");
  };

  return (
    <main className="jb-page">
      <section className="jb-section-wide min-h-screen">
        <div className="space-y-6">
          <Link
            href="/"
            className="inline-flex items-center rounded-full border border-teal-200 bg-white/80 px-4 py-2 text-sm font-medium text-teal-900 shadow-sm backdrop-blur"
          >
            Back to discovery
          </Link>

          <div className="space-y-4">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-teal-800">
              Owner access
            </p>
            <h1 className="max-w-xl text-5xl font-semibold tracking-[-0.04em] text-slate-950 md:text-6xl">
              Manage your listings and booking requests
            </h1>
            <p className="max-w-xl text-base leading-7 text-slate-600 md:text-lg">
              Create an account to publish skipper-led routes and respond to travelers. Sign in anytime to
              pick up where you left off.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(71,85,105,0.12)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Who can use this</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">Boat owners and administrators</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                Travelers who only book trips use the same sign-up flow with booking enabled.
              </p>
            </div>
            <div className="rounded-[28px] border border-white/80 bg-white/75 p-5 shadow-[0_20px_60px_rgba(71,85,105,0.12)] backdrop-blur">
              <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Staying signed in</p>
              <p className="mt-3 text-lg font-semibold text-slate-950">This browser remembers you</p>
              <p className="mt-2 text-sm leading-6 text-slate-600">
                For your convenience, you stay signed in on this device until you sign out.
              </p>
            </div>
          </div>
        </div>

        <section className="jb-panel md:p-8">
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
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
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
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                required
              />
            </label>

            {mode === "sign-up" ? (
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-sm font-medium text-slate-800">Account capabilities</p>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={canBook}
                    onChange={(e) => setCanBook(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  Book skipper-led transport
                </label>
                <label className="flex items-center gap-3 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={canListBoats}
                    onChange={(e) => setCanListBoats(e.target.checked)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  List boats / manage departures
                </label>
                <p className="text-xs text-slate-500">Choose at least one: book trips or list boats.</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-slate-950 px-5 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-wait disabled:opacity-70"
            >
              {isSubmitting ? "Working..." : submitLabel}
            </button>
          </form>

          <div className="mt-6 rounded-[28px] border border-teal-100 bg-teal-50/80 p-4 text-sm leading-6 text-teal-950">
            {feedback}
          </div>

          <div className="mt-6 rounded-[28px] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-slate-500">Account</p>
                <p className="mt-2 text-lg font-semibold text-slate-950">
                  {!isHydrated ? "Checking sign-in status…" : session ? "Signed in" : "Signed out"}
                </p>
              </div>
              <button
                type="button"
                onClick={handleSignOut}
                disabled={!session}
                className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Sign out
              </button>
            </div>

            {session ? (
              <div className="mt-4 space-y-2 text-sm text-slate-600">
                <p>
                  <span className="font-medium text-slate-900">Email:</span> {session.user.email}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Role:</span> {session.user.rolePrimary}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Can book:</span>{" "}
                  {session.user.canBook ? "Yes" : "No"}
                </p>
                <p>
                  <span className="font-medium text-slate-900">Can list boats:</span>{" "}
                  {session.user.canListBoats ? "Yes" : "No"}
                </p>
              </div>
            ) : null}
          </div>
        </section>
      </section>
    </main>
  );
}

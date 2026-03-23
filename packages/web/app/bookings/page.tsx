"use client";

import type { Booking } from "@jumpinboat/shared";
import Link from "next/link";
import { useEffect, useState } from "react";

import { readPersistedAuthSession } from "../../lib/auth";

export default function MyBookingsPage() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const session = readPersistedAuthSession();
    if (!session) {
      setErr("Sign in on the auth page first.");
      setItems([]);
      return;
    }
    void (async () => {
      try {
        const r = await fetch("/api/bookings/mine", {
          headers: { Authorization: `Bearer ${session.token}` },
        });
        if (!r.ok) {
          const j = await r.json().catch(() => ({}));
          throw new Error(j.error ?? r.statusText);
        }
        const data = (await r.json()) as { items: Booking[] };
        setItems(data.items);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Failed");
        setItems([]);
      }
    })();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 px-6 py-10 text-slate-900">
      <div className="mx-auto max-w-2xl space-y-6">
        <Link href="/" className="text-sm text-teal-700 underline">
          ← Discovery
        </Link>
        <h1 className="text-3xl font-semibold">My bookings</h1>
        {err ? <p className="text-rose-600">{err}</p> : null}
        {items === null ? <p>Loading…</p> : null}
        {items && items.length === 0 && !err ? <p>No bookings yet.</p> : null}
        <ul className="space-y-4">
          {(items ?? []).map((b) => (
            <li
              key={b.id}
              className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <p className="font-medium">
                {b.status} · {b.passengerCount} pax
              </p>
              <p className="text-sm text-slate-600">
                Total {b.price.totalPrice.amount} {b.price.totalPrice.currency} · pay on arrival
              </p>
              <p className="text-xs text-slate-400">{b.createdAt}</p>
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

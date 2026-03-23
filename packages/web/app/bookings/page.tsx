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
      setErr("Sign in to see your bookings.");
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
    <main className="jb-page">
      <div className="jb-section-narrow">
        <Link href="/" className="text-sm text-teal-700 underline">
          ← Discovery
        </Link>
        <h1 className="text-3xl font-semibold">My bookings</h1>
        {err ? <p className="text-rose-600">{err}</p> : null}
        {items === null ? <p>Loading…</p> : null}
        {items && items.length === 0 && !err ? <p>No bookings yet.</p> : null}
        <ul className="space-y-4">
          {(items ?? []).map((b) => (
            <li key={b.id} className="jb-card">
              <p className="font-medium">
                {b.status} · {b.passengerCount}{" "}
                {b.passengerCount === 1 ? "passenger" : "passengers"}
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

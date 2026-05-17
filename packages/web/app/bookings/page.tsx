"use client";

import type { Booking } from "@jumpinboat/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { readPersistedAuthSession } from "../../lib/auth";

export default function MyBookingsPage() {
  const [items, setItems] = useState<Booking[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState("");
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    const session = readPersistedAuthSession();
    if (!session) {
      setErr("Sign in to see your bookings.");
      setItems([]);
      return;
    }
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
      setErr(null);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Failed");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelBooking = async (bookingId: string) => {
    setMsg("");
    setBusyBookingId(bookingId);
    const session = readPersistedAuthSession();
    if (!session) {
      setErr("Sign in to cancel bookings.");
      setBusyBookingId(null);
      return;
    }
    try {
      const r = await fetch("/api/bookings/cancel", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? r.statusText);
      }
      setMsg("Booking cancelled.");
      await load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <main className="jb-page">
      <div className="jb-section-narrow">
        <Link href="/" className="text-sm text-teal-700 underline">
          ← Discovery
        </Link>
        <h1 className="text-3xl font-semibold">My bookings</h1>
        {err ? <p className="text-rose-600">{err}</p> : null}
        {msg ? <p className="text-teal-800">{msg}</p> : null}
        {items === null ? <p>Loading…</p> : null}
        {items && items.length === 0 && !err ? <p>No bookings yet.</p> : null}
        <ul className="space-y-4">
          {(items ?? []).map((b) => {
            const canCancel = b.status === "pending" || b.status === "confirmed";
            const isBusy = busyBookingId === b.id;

            return (
              <li key={b.id} className="jb-card">
                <p className="font-medium">
                  {b.status} · {b.passengerCount}{" "}
                  {b.passengerCount === 1 ? "passenger" : "passengers"}
                </p>
                <p className="text-sm text-slate-600">
                  Total {b.price.totalPrice.amount} {b.price.totalPrice.currency} · pay on arrival
                </p>
                <p className="text-xs text-slate-400">{b.createdAt}</p>
                {canCancel ? (
                  <button
                    type="button"
                    onClick={() => void cancelBooking(b.id)}
                    disabled={isBusy}
                    className="mt-3 rounded-full border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 disabled:cursor-wait disabled:opacity-60"
                  >
                    {isBusy ? "Cancelling..." : "Cancel booking"}
                  </button>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </main>
  );
}

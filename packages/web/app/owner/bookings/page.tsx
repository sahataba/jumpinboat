"use client";

import type { Booking } from "@jumpinboat/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { readPersistedAuthSession } from "../../../lib/auth";

type Row = { booking: Booking; customerEmail: string; boatId: string };

export default function OwnerBookingsPage() {
  const [items, setItems] = useState<Row[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    const session = readPersistedAuthSession();
    if (!session) {
      setErr("Sign in with an account that can list boats.");
      setItems([]);
      return;
    }
    try {
      const r = await fetch("/api/bookings/owner", {
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? r.statusText);
      }
      const data = (await r.json()) as { items: Row[] };
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

  const act = async (bookingId: string, status: "confirmed" | "declined") => {
    setMsg("");
    const session = readPersistedAuthSession();
    if (!session) return;
    try {
      const r = await fetch("/api/bookings/owner-status", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ bookingId, status }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? r.statusText);
      }
      setMsg(`Updated to ${status}.`);
      void load();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Failed");
    }
  };

  return (
    <main className="jb-page">
      <div className="jb-section-narrow">
        <Link href="/" className="text-sm text-teal-700 underline">
          ← Discovery
        </Link>
        <Link href="/owner/listings" className="text-sm text-amber-700 underline">
          Manage listings
        </Link>
        <h1 className="text-3xl font-semibold">Owner booking inbox</h1>
        <p className="text-sm text-slate-600">
          New requests appear here. Email notifications are coming soon—you’ll see requests in this inbox for
          now.
        </p>
        {err ? <p className="text-rose-600">{err}</p> : null}
        {msg ? <p className="text-teal-800">{msg}</p> : null}
        {items === null ? <p>Loading…</p> : null}
        <ul className="space-y-4">
          {(items ?? []).map((row) => (
            <li key={row.booking.id} className="jb-card">
              <p className="font-medium">{row.customerEmail}</p>
              <p className="text-sm text-slate-600">
                Booking ref {row.boatId.slice(0, 8)}… · {row.booking.passengerCount}{" "}
                {row.booking.passengerCount === 1 ? "passenger" : "passengers"} · {row.booking.status}
              </p>
              <p className="text-sm text-slate-600">
                {row.booking.price.totalPrice.amount} {row.booking.price.totalPrice.currency}
              </p>
              {row.booking.status === "pending" ? (
                <div className="mt-3 flex gap-2">
                  <button
                    type="button"
                    onClick={() => void act(row.booking.id, "confirmed")}
                    className="rounded-full bg-teal-600 px-4 py-2 text-sm text-white"
                  >
                    Accept
                  </button>
                  <button
                    type="button"
                    onClick={() => void act(row.booking.id, "declined")}
                    className="rounded-full border border-slate-300 px-4 py-2 text-sm"
                  >
                    Decline
                  </button>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}

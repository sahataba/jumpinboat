"use client";

import type { BoatListingSummary } from "@jumpinboat/shared";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { BoatRouteMap } from "../../../components/BoatRouteMap";
import { readPersistedAuthSession } from "../../../lib/auth";

type DepRow = {
  id: string;
  routeId: string;
  departureTimeUtc: string;
  maxPassengersOverride: number | null;
  maxCargoWeightKgOverride: number | null;
  status: string;
};

export default function BoatDetailPage() {
  const params = useParams();
  const boatId = typeof params.boatId === "string" ? params.boatId : "";
  const [boat, setBoat] = useState<BoatListingSummary | null>(null);
  const [deps, setDeps] = useState<DepRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [departureId, setDepartureId] = useState("");
  const [passengers, setPassengers] = useState(1);
  const [selectedStops, setSelectedStops] = useState<Record<string, boolean>>({});
  const [cargoKg, setCargoKg] = useState(0);
  const [cargoPk, setCargoPk] = useState(0);
  const [bookMsg, setBookMsg] = useState("");

  const load = useCallback(async () => {
    if (!boatId) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/boats/detail?boatId=${encodeURIComponent(boatId)}`);
      if (!r.ok) {
        throw new Error((await r.json()).error ?? r.statusText);
      }
      const data = (await r.json()) as { boat: BoatListingSummary };
      setBoat(data.boat);
      const d = await fetch(`/api/boats/departures?boatId=${encodeURIComponent(boatId)}`);
      const dj = (await d.json()) as { items: DepRow[] };
      setDeps(dj.items ?? []);
      if (dj.items?.[0]) setDepartureId(dj.items[0].id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [boatId]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleStop = (id: string) => {
    setSelectedStops((s) => ({ ...s, [id]: !s[id] }));
  };

  const submitBooking = async () => {
    setBookMsg("");
    const session = readPersistedAuthSession();
    if (!session) {
      setBookMsg("Sign in first (auth page) with an account that can book.");
      return;
    }
    if (!boat || !departureId) {
      setBookMsg("Select a departure.");
      return;
    }
    const selectedStopsPayload = Object.entries(selectedStops)
      .filter(([, v]) => v)
      .map(([stopId]) => ({
        stopId,
        routeId: boat.route.id,
      }));
    try {
      const r = await fetch("/api/bookings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          boatId: boat.id,
          departureId,
          passengerCount: passengers,
          selectedStops: selectedStopsPayload,
          estimatedCargoWeightKg: cargoKg || undefined,
          estimatedCargoPackages: cargoPk || undefined,
        }),
      });
      if (!r.ok) {
        const j = await r.json().catch(() => ({}));
        throw new Error(j.error ?? r.statusText);
      }
      setBookMsg("Booking request sent. Pay on arrival. Check My bookings.");
    } catch (e) {
      setBookMsg(e instanceof Error ? e.message : "Booking failed");
    }
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 p-8 text-slate-600">Loading…</main>
    );
  }

  if (error || !boat) {
    return (
      <main className="min-h-screen bg-slate-50 p-8">
        <p className="text-rose-600">{error ?? "Not found"}</p>
        <Link href="/" className="mt-4 inline-block text-teal-700 underline">
          Back to listings
        </Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,_#f8fafc_0%,_#ecfeff_100%)] text-slate-900">
      <div className="mx-auto max-w-4xl space-y-8 px-6 py-10">
        <Link href="/" className="text-sm font-medium text-teal-800 underline">
          ← All listings
        </Link>

        <header className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-teal-700">
            Skippered transport · OpenStreetMap route
          </p>
          <h1 className="text-4xl font-semibold tracking-tight">{boat.translation.name}</h1>
          <p className="text-slate-600">{boat.translation.description}</p>
          <p className="text-sm text-slate-500">
            {boat.translation.startLocationLabel} → {boat.translation.endLocationLabel} ·{" "}
            {boat.freePassengers ?? 0} seats free (of {boat.capacity.maxPassengers}) · Weather
            cancellation risk ~{boat.weatherRiskPercent ?? 0}%
          </p>
        </header>

        <BoatRouteMap boat={boat} />

        <section className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Book a departure</h2>
          <p className="mt-1 text-sm text-slate-500">Pay on arrival only. Captain included.</p>

          <label className="mt-4 block text-sm font-medium">
            Departure
            <select
              value={departureId}
              onChange={(e) => setDepartureId(e.target.value)}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            >
              {deps.map((d) => (
                <option key={d.id} value={d.id}>
                  {new Date(d.departureTimeUtc).toLocaleString()} (UTC stored)
                </option>
              ))}
            </select>
          </label>

          <label className="mt-4 block text-sm font-medium">
            Passengers
            <input
              type="number"
              min={1}
              max={boat.capacity.maxPassengers}
              value={passengers}
              onChange={(e) => setPassengers(Number(e.target.value))}
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
            />
          </label>

          {boat.route.stops.length > 0 ? (
            <div className="mt-4">
              <p className="text-sm font-medium">Optional intermediate stops (adds per-stop price)</p>
              <ul className="mt-2 space-y-2">
                {boat.route.stops.map((s) => (
                  <li key={s.id}>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!selectedStops[s.id]}
                        onChange={() => toggleStop(s.id)}
                      />
                      Stop {s.orderIndex}{" "}
                      {s.perStopPrice
                        ? `(+${s.perStopPrice.amount} ${s.perStopPrice.currency})`
                        : ""}
                    </label>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {boat.offersCargo ? (
            <div className="mt-4 grid gap-4 sm:grid-cols-2">
              <label className="block text-sm font-medium">
                Est. cargo kg
                <input
                  type="number"
                  min={0}
                  value={cargoKg}
                  onChange={(e) => setCargoKg(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <label className="block text-sm font-medium">
                Est. packages
                <input
                  type="number"
                  min={0}
                  value={cargoPk}
                  onChange={(e) => setCargoPk(Number(e.target.value))}
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                />
              </label>
              <p className="sm:col-span-2 text-xs text-slate-500">
                {boat.translation.allowedGoodsDescription}
              </p>
            </div>
          ) : null}

          <button
            type="button"
            onClick={() => void submitBooking()}
            className="mt-6 w-full rounded-2xl bg-slate-950 py-3 text-sm font-medium text-white hover:bg-slate-800"
          >
            Request booking
          </button>
          {bookMsg ? <p className="mt-3 text-sm text-teal-800">{bookMsg}</p> : null}
        </section>
      </div>
    </main>
  );
}

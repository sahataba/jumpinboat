"use client";

import { Result } from "@effect-atom/atom-react";
import { Cause } from "effect";

import { usePublicBoatFilters, usePublicBoatList } from "../lib/public-boats";
import type { BoatListingSummary, PublicBoatListFilters } from "@jumpinboat/shared";

const formatRouteSummary = (boat: BoatListingSummary) => {
  const start = boat.translation.startLocationLabel ?? "Departure";
  const end = boat.translation.endLocationLabel ?? "Arrival";
  return `${start} -> ${end}`;
};

const formatPricingSummary = (boat: BoatListingSummary) => {
  const base = `${boat.route.pricing.basePricePerTrip.amount} ${boat.route.pricing.basePricePerTrip.currency} / trip`;

  if (!boat.route.pricing.hasUniformPerStopPricing) {
    const customPrices = boat.route.stops
      .map((stop) => stop.perStopPrice?.amount)
      .filter((price): price is number => typeof price === "number");

    if (customPrices.length === 0) {
      return base;
    }

    return `${base} - from ${Math.min(...customPrices)} ${boat.route.pricing.basePricePerTrip.currency} / stop`;
  }

  return `${base} - ${boat.route.pricing.uniformPricePerStop?.amount ?? 0} ${boat.route.pricing.basePricePerTrip.currency} / stop`;
};

const BoatCard = ({ boat }: { boat: BoatListingSummary }) => (
  <article className="rounded-[28px] border border-slate-200 bg-white/90 p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)] backdrop-blur">
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">
          Public route
        </p>
        <h2 className="text-2xl font-semibold text-slate-950">
          {boat.translation.name}
        </h2>
        <p className="max-w-xl text-sm leading-6 text-slate-600">
          {boat.translation.description}
        </p>
      </div>
      <div className="rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
        {boat.weatherRiskPercent ?? 0}% weather risk
      </div>
    </div>

    <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Route</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{formatRouteSummary(boat)}</p>
        <p className="mt-1 text-sm text-slate-500">{boat.route.stops.length} stop{boat.route.stops.length === 1 ? "" : "s"}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Pricing</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{formatPricingSummary(boat)}</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Capacity</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{boat.capacity.maxPassengers} passengers</p>
        <p className="mt-1 text-sm text-slate-500">{boat.capacity.maxTotalLoadKg} kg total legal load</p>
      </div>
      <div className="rounded-2xl bg-slate-50 p-4">
        <p className="text-xs uppercase tracking-[0.2em] text-slate-500">Availability</p>
        <p className="mt-2 text-sm font-medium text-slate-900">{boat.freePassengers ?? boat.capacity.maxPassengers} seats open</p>
        <p className="mt-1 text-sm text-slate-500">
          {boat.offersCargo
            ? `${boat.capacity.maxCargoWeightKg ?? 0} kg cargo supported`
            : "Passenger transfer only"}
        </p>
      </div>
    </div>
  </article>
);

export default function HomePage() {
  const { filters, setFilters } = usePublicBoatFilters();
  const { activeFilterCount, result } = usePublicBoatList();
  const updateFilters = (
    nextFilters:
      | PublicBoatListFilters
      | ((current: PublicBoatListFilters) => PublicBoatListFilters),
  ) => setFilters(nextFilters);

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(45,212,191,0.2),_transparent_35%),linear-gradient(180deg,_#f8fafc_0%,_#eef6f4_45%,_#ffffff_100%)] text-slate-900">
      <section className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-6 py-10 md:px-10 lg:px-12 lg:py-14">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_0.8fr] lg:items-end">
          <div className="space-y-5">
            <p className="text-sm font-semibold uppercase tracking-[0.34em] text-teal-700">
              JumpInBoat discovery
            </p>
            <div className="space-y-4">
              <h1 className="max-w-4xl text-5xl font-semibold leading-tight tracking-[-0.04em] text-slate-950 md:text-6xl">
                Public boat listings backed by a tiny in-memory API and shared effect-atom state.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-slate-600 md:text-lg">
                This slice validates customer-side discovery on web: shared contracts,
                backend filtering, and reactive state flowing through Effect Atom.
              </p>
            </div>
          </div>

          <div className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_20px_80px_rgba(15,23,42,0.12)] backdrop-blur">
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Filters
            </p>
            <div className="mt-5 space-y-4">
              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Search route, town, or cargo notes</span>
                <input
                  value={filters.query}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      query: event.target.value,
                    }))
                  }
                  placeholder="Try Rovinj, market, sunset..."
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-teal-500 focus:bg-white"
                />
              </label>

              <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <div>
                  <span className="block text-sm font-medium text-slate-800">Goods transport only</span>
                  <span className="text-sm text-slate-500">Show boats with cargo capacity and goods rules.</span>
                </div>
                <input
                  type="checkbox"
                  checked={filters.goodsTransportOnly}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      goodsTransportOnly: event.target.checked,
                    }))
                  }
                  className="h-5 w-5 rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-medium text-slate-700">Minimum free spots</span>
                <input
                  type="range"
                  min={0}
                  max={8}
                  step={1}
                  value={filters.minFreeSpots}
                  onChange={(event) =>
                    updateFilters((current) => ({
                      ...current,
                      minFreeSpots: Number(event.target.value),
                    }))
                  }
                  className="w-full accent-teal-600"
                />
                <div className="mt-2 flex items-center justify-between text-sm text-slate-500">
                  <span>0</span>
                  <span className="font-medium text-slate-700">{filters.minFreeSpots} seats</span>
                  <span>8+</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-between gap-4 rounded-[28px] border border-teal-100 bg-teal-50/70 px-5 py-4 text-sm text-teal-950">
          <p>
            Shared atoms live in `@jumpinboat/shared`, so web and mobile both read the same boat list state model.
          </p>
          <p className="rounded-full bg-white px-3 py-1 font-medium text-teal-700">
            {activeFilterCount} active filter{activeFilterCount === 1 ? "" : "s"}
          </p>
        </div>

        {Result.builder(result)
          .onInitial(() => (
            <section className="rounded-[32px] border border-slate-200 bg-white p-8 text-sm text-slate-500 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
              Loading public boats...
            </section>
          ))
          .onFailure((cause) => (
            <section className="rounded-[32px] border border-rose-200 bg-rose-50 p-8 text-sm text-rose-700 shadow-[0_16px_60px_rgba(15,23,42,0.08)]">
              {Cause.pretty(cause as Cause.Cause<unknown>)}
            </section>
          ))
          .onSuccess((boats: ReadonlyArray<BoatListingSummary>) => (
            <section className="space-y-5">
              <div className="flex items-end justify-between gap-4">
                <div>
                  <p className="text-sm uppercase tracking-[0.24em] text-slate-500">Available listings</p>
                  <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-slate-950">
                    {boats.length} public boat option{boats.length === 1 ? "" : "s"}
                  </h2>
                </div>
                <p className="max-w-md text-right text-sm leading-6 text-slate-500">
                  The backend filters query text, cargo support, and free seats before the list reaches the page.
                </p>
              </div>

              <div className="grid gap-5">
                {boats.map((boat) => (
                  <BoatCard key={boat.id} boat={boat} />
                ))}
              </div>

              {boats.length === 0 ? (
                <div className="rounded-[28px] border border-dashed border-slate-300 bg-white/80 p-10 text-center text-sm text-slate-500">
                  No boats match the current filters yet. Try widening the seat count or clearing the search.
                </div>
              ) : null}
            </section>
          ))
          .render()}
      </section>
    </main>
  );
}

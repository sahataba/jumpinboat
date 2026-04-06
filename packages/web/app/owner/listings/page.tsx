"use client";

import type {
  BoatDeparture,
  BoatListingDetail,
  BoatListingPayload,
  OwnerBoatListingSummary,
} from "@jumpinboat/shared";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { readPersistedAuthSession } from "../../../lib/auth";

type TranslationFormState = {
  readonly name: string;
  readonly description: string;
  readonly allowedGoodsDescription: string;
  readonly startLocationLabel: string;
  readonly endLocationLabel: string;
};

type StopFormState = {
  readonly lat: string;
  readonly lng: string;
  readonly perStopPrice: string;
};

type DepartureFormState = {
  readonly departureTimeLocal: string;
  readonly maxPassengersOverride: string;
  readonly maxCargoWeightKgOverride: string;
  readonly status: "scheduled" | "cancelled";
};

type ListingFormState = {
  readonly slug: string;
  readonly isActive: boolean;
  readonly photosText: string;
  readonly currency: string;
  readonly startLat: string;
  readonly startLng: string;
  readonly endLat: string;
  readonly endLng: string;
  readonly basePricePerTrip: string;
  readonly hasUniformPerStopPricing: boolean;
  readonly uniformPricePerStop: string;
  readonly maxPassengers: string;
  readonly maxTotalLoadKg: string;
  readonly offersCargo: boolean;
  readonly maxCargoPackages: string;
  readonly maxCargoWeightKg: string;
  readonly cargoPricePerKg: string;
  readonly stops: ReadonlyArray<StopFormState>;
  readonly departures: ReadonlyArray<DepartureFormState>;
  readonly translations: {
    readonly en: TranslationFormState;
    readonly hr: TranslationFormState;
  };
};

type OwnerListingRecord = {
  readonly boat: BoatListingDetail;
  readonly departures: ReadonlyArray<BoatDeparture>;
};

const emptyTranslation = (): TranslationFormState => ({
  name: "",
  description: "",
  allowedGoodsDescription: "",
  startLocationLabel: "",
  endLocationLabel: "",
});

const createEmptyFormState = (): ListingFormState => ({
  slug: "",
  isActive: true,
  photosText: "",
  currency: "EUR",
  startLat: "",
  startLng: "",
  endLat: "",
  endLng: "",
  basePricePerTrip: "",
  hasUniformPerStopPricing: false,
  uniformPricePerStop: "",
  maxPassengers: "",
  maxTotalLoadKg: "",
  offersCargo: false,
  maxCargoPackages: "",
  maxCargoWeightKg: "",
  cargoPricePerKg: "",
  stops: [],
  departures: [],
  translations: {
    en: emptyTranslation(),
    hr: emptyTranslation(),
  },
});

const formatRouteSummary = (item: Pick<OwnerBoatListingSummary, "route" | "translation">) => {
  const start = item.translation.startLocationLabel || "Departure";
  const end = item.translation.endLocationLabel || "Arrival";
  return `${start} -> ${end}`;
};

const formatPricingSummary = (item: Pick<OwnerBoatListingSummary, "route">) => {
  const currency = item.route.pricing.basePricePerTrip.currency;
  const base = `${item.route.pricing.basePricePerTrip.amount} ${currency} / trip`;
  if (!item.route.pricing.hasUniformPerStopPricing) {
    const custom = item.route.stops
      .map((stop) => stop.perStopPrice?.amount)
      .filter((amount): amount is number => typeof amount === "number");
    return custom.length > 0
      ? `${base} · custom stop pricing`
      : base;
  }
  return `${base} · ${item.route.pricing.uniformPricePerStop?.amount ?? 0} ${currency} / stop`;
};

const readApiError = async (response: Response) => {
  try {
    const body = (await response.json()) as { error?: string };
    return body.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const isoToLocalInput = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  const pad = (part: number) => String(part).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
};

const localInputToIso = (value: string) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Departure time must be a valid date and time.");
  }
  return date.toISOString();
};

const translationOrEmpty = (
  boat: BoatListingDetail,
  locale: "en" | "hr",
): TranslationFormState => {
  const translation = boat.translations.find((entry) => entry.locale === locale);
  if (!translation) {
    return emptyTranslation();
  }
  return {
    name: translation.name,
    description: translation.description,
    allowedGoodsDescription: translation.allowedGoodsDescription ?? "",
    startLocationLabel: translation.startLocationLabel ?? "",
    endLocationLabel: translation.endLocationLabel ?? "",
  };
};

const detailToFormState = (
  boat: BoatListingDetail,
  departures: ReadonlyArray<BoatDeparture>,
): ListingFormState => ({
  slug: boat.slug ?? "",
  isActive: boat.isActive,
  photosText: boat.photos.join("\n"),
  currency: boat.route.pricing.basePricePerTrip.currency,
  startLat: String(boat.route.start.lat),
  startLng: String(boat.route.start.lng),
  endLat: String(boat.route.end.lat),
  endLng: String(boat.route.end.lng),
  basePricePerTrip: String(boat.route.pricing.basePricePerTrip.amount),
  hasUniformPerStopPricing: boat.route.pricing.hasUniformPerStopPricing,
  uniformPricePerStop: boat.route.pricing.uniformPricePerStop
    ? String(boat.route.pricing.uniformPricePerStop.amount)
    : "",
  maxPassengers: String(boat.capacity.maxPassengers),
  maxTotalLoadKg: String(boat.capacity.maxTotalLoadKg),
  offersCargo: boat.capacity.offersCargo,
  maxCargoPackages:
    boat.capacity.maxCargoPackages === undefined ? "" : String(boat.capacity.maxCargoPackages),
  maxCargoWeightKg:
    boat.capacity.maxCargoWeightKg === undefined ? "" : String(boat.capacity.maxCargoWeightKg),
  cargoPricePerKg:
    boat.capacity.cargoPricePerKg === undefined ? "" : String(boat.capacity.cargoPricePerKg.amount),
  stops: boat.route.stops.map((stop) => ({
    lat: String(stop.coordinate.lat),
    lng: String(stop.coordinate.lng),
    perStopPrice: stop.perStopPrice ? String(stop.perStopPrice.amount) : "",
  })),
  departures: departures.map((departure) => ({
    departureTimeLocal: isoToLocalInput(departure.departureTimeUtc),
    maxPassengersOverride:
      departure.maxPassengersOverride === undefined ? "" : String(departure.maxPassengersOverride),
    maxCargoWeightKgOverride:
      departure.maxCargoWeightKgOverride === undefined
        ? ""
        : String(departure.maxCargoWeightKgOverride),
    status: departure.status,
  })),
  translations: {
    en: translationOrEmpty(boat, "en"),
    hr: translationOrEmpty(boat, "hr"),
  },
});

const requireNumber = (value: string, field: string, min?: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    throw new Error(`${field} must be a valid number.`);
  }
  if (typeof min === "number" && parsed < min) {
    throw new Error(`${field} must be at least ${min}.`);
  }
  return parsed;
};

const optionalNumber = (value: string, field: string, min?: number) => {
  if (value.trim().length === 0) {
    return undefined;
  }
  return requireNumber(value, field, min);
};

const formToPayload = (form: ListingFormState): BoatListingPayload => {
  const english = form.translations.en;
  if (english.name.trim().length === 0 || english.description.trim().length === 0) {
    throw new Error("English name and description are required.");
  }

  const translations: Array<BoatListingPayload["translations"][number]> = [
    {
      locale: "en",
      name: english.name.trim(),
      description: english.description.trim(),
      allowedGoodsDescription: english.allowedGoodsDescription.trim() || undefined,
      startLocationLabel: english.startLocationLabel.trim() || undefined,
      endLocationLabel: english.endLocationLabel.trim() || undefined,
    },
  ];

  const croatian = form.translations.hr;
  const hasCroatianContent = Object.values(croatian).some((value) => value.trim().length > 0);
  if (hasCroatianContent) {
    if (croatian.name.trim().length === 0 || croatian.description.trim().length === 0) {
      throw new Error("Croatian translation needs both name and description when used.");
    }
    translations.push({
      locale: "hr",
      name: croatian.name.trim(),
      description: croatian.description.trim(),
      allowedGoodsDescription: croatian.allowedGoodsDescription.trim() || undefined,
      startLocationLabel: croatian.startLocationLabel.trim() || undefined,
      endLocationLabel: croatian.endLocationLabel.trim() || undefined,
    });
  }

  const currency = form.currency.trim().toUpperCase() || "EUR";

  const stops = form.stops.flatMap((stop, index) => {
    const lat = stop.lat.trim();
    const lng = stop.lng.trim();
    const price = stop.perStopPrice.trim();
    if (lat.length === 0 && lng.length === 0 && price.length === 0) {
      return [];
    }
    if (lat.length === 0 || lng.length === 0) {
      throw new Error(`Stop ${index + 1} needs both latitude and longitude.`);
    }
    return [
      {
        orderIndex: index + 1,
        coordinate: {
          lat: requireNumber(lat, `Stop ${index + 1} latitude`),
          lng: requireNumber(lng, `Stop ${index + 1} longitude`),
        },
        perStopPrice:
          price.length === 0
            ? undefined
            : {
                amount: requireNumber(price, `Stop ${index + 1} price`, 0),
                currency,
              },
      },
    ];
  });

  const departures = form.departures.flatMap((departure, index) => {
    const time = departure.departureTimeLocal.trim();
    if (time.length === 0) {
      return [];
    }
    return [
      {
        departureTimeUtc: localInputToIso(time),
        maxPassengersOverride: optionalNumber(
          departure.maxPassengersOverride,
          `Departure ${index + 1} passenger override`,
          1,
        ),
        maxCargoWeightKgOverride: optionalNumber(
          departure.maxCargoWeightKgOverride,
          `Departure ${index + 1} cargo override`,
          0,
        ),
        status: departure.status,
      },
    ];
  });

  const payload: BoatListingPayload = {
    slug: form.slug.trim() || undefined,
    translations,
    route: {
      start: {
        lat: requireNumber(form.startLat, "Start latitude"),
        lng: requireNumber(form.startLng, "Start longitude"),
      },
      end: {
        lat: requireNumber(form.endLat, "End latitude"),
        lng: requireNumber(form.endLng, "End longitude"),
      },
      stops,
      pricing: {
        basePricePerTrip: {
          amount: requireNumber(form.basePricePerTrip, "Base price", 0),
          currency,
        },
        hasUniformPerStopPricing: form.hasUniformPerStopPricing,
        uniformPricePerStop: form.hasUniformPerStopPricing
          ? {
              amount: requireNumber(form.uniformPricePerStop, "Uniform stop price", 0),
              currency,
            }
          : undefined,
      },
    },
    capacity: {
      maxPassengers: Math.floor(requireNumber(form.maxPassengers, "Max passengers", 1)),
      maxTotalLoadKg: Math.floor(requireNumber(form.maxTotalLoadKg, "Max total load", 1)),
      offersCargo: form.offersCargo,
      maxCargoPackages: form.offersCargo
        ? optionalNumber(form.maxCargoPackages, "Max cargo packages", 0)
        : undefined,
      maxCargoWeightKg: form.offersCargo
        ? optionalNumber(form.maxCargoWeightKg, "Max cargo weight", 0)
        : undefined,
      cargoPricePerKg: form.offersCargo
        ? optionalNumber(form.cargoPricePerKg, "Cargo price per kg", 0) === undefined
          ? undefined
          : {
              amount: optionalNumber(form.cargoPricePerKg, "Cargo price per kg", 0) ?? 0,
              currency,
            }
        : undefined,
    },
    departures,
    photos: form.photosText
      .split("\n")
      .map((value) => value.trim())
      .filter((value) => value.length > 0),
    isActive: form.isActive,
  };

  return payload;
};

export default function OwnerListingsPage() {
  const [items, setItems] = useState<ReadonlyArray<OwnerBoatListingSummary> | null>(null);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingFormState>(createEmptyFormState);
  const [localeTab, setLocaleTab] = useState<"en" | "hr">("en");
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const getSession = useCallback(() => {
    const session = readPersistedAuthSession();
    if (!session) {
      throw new Error("Sign in with an account that can manage listings.");
    }
    if (!session.user.canListBoats) {
      throw new Error("This account cannot manage listings.");
    }
    return session;
  }, []);

  const authorizedFetch = useCallback(
    async (input: RequestInfo, init?: RequestInit) => {
      const session = getSession();
      const headers = new Headers(init?.headers);
      headers.set("Authorization", `Bearer ${session.token}`);
      return fetch(input, {
        ...init,
        headers,
      });
    },
    [getSession],
  );

  const loadListingDetail = useCallback(
    async (boatId: string) => {
      setLoadingDetail(true);
      try {
        const response = await authorizedFetch(`/api/owner/listings/${boatId}`);
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        const record = (await response.json()) as OwnerListingRecord;
        setSelectedBoatId(record.boat.id);
        setForm(detailToFormState(record.boat, record.departures));
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load listing.");
      } finally {
        setLoadingDetail(false);
      }
    },
    [authorizedFetch],
  );

  const refreshListings = useCallback(
    async (preferredBoatId?: string | null) => {
      setLoadingList(true);
      try {
        const response = await authorizedFetch("/api/owner/listings");
        if (!response.ok) {
          throw new Error(await readApiError(response));
        }
        const data = (await response.json()) as { items: ReadonlyArray<OwnerBoatListingSummary> };
        setItems(data.items);
        setError(null);

        if (preferredBoatId === null) {
          setSelectedBoatId(null);
          setForm(createEmptyFormState());
          return;
        }

        const nextBoatId =
          preferredBoatId ??
          (selectedBoatId && data.items.some((item) => item.id === selectedBoatId)
            ? selectedBoatId
            : data.items[0]?.id ?? null);

        if (nextBoatId) {
          await loadListingDetail(nextBoatId);
        } else {
          setSelectedBoatId(null);
          setForm(createEmptyFormState());
        }
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load listings.");
        setItems([]);
      } finally {
        setLoadingList(false);
      }
    },
    [authorizedFetch, loadListingDetail, selectedBoatId],
  );

  useEffect(() => {
    void refreshListings();
  }, [refreshListings]);

  const startNewListing = () => {
    setSelectedBoatId(null);
    setForm(createEmptyFormState());
    setFeedback(null);
    setError(null);
    setLocaleTab("en");
  };

  const saveListing = async () => {
    setSaving(true);
    setFeedback(null);
    try {
      const payload = formToPayload(form);
      const response = await authorizedFetch(
        selectedBoatId ? `/api/owner/listings/${selectedBoatId}` : "/api/owner/listings",
        {
          method: selectedBoatId ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        },
      );

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      const record = (await response.json()) as OwnerListingRecord;
      setSelectedBoatId(record.boat.id);
      setForm(detailToFormState(record.boat, record.departures));
      setFeedback(selectedBoatId ? "Listing updated." : "Listing created.");
      await refreshListings(record.boat.id);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save listing.");
    } finally {
      setSaving(false);
    }
  };

  const updateTranslation = (field: keyof TranslationFormState, value: string) => {
    setForm((current) => ({
      ...current,
      translations: {
        ...current.translations,
        [localeTab]: {
          ...current.translations[localeTab],
          [field]: value,
        },
      },
    }));
  };

  const updateField = <K extends keyof ListingFormState>(field: K, value: ListingFormState[K]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const updateStop = (index: number, patch: Partial<StopFormState>) => {
    setForm((current) => ({
      ...current,
      stops: current.stops.map((stop, currentIndex) =>
        currentIndex === index ? { ...stop, ...patch } : stop,
      ),
    }));
  };

  const moveStop = (index: number, direction: -1 | 1) => {
    setForm((current) => {
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.stops.length) {
        return current;
      }
      const nextStops = [...current.stops];
      const [item] = nextStops.splice(index, 1);
      nextStops.splice(nextIndex, 0, item);
      return { ...current, stops: nextStops };
    });
  };

  const updateDeparture = (index: number, patch: Partial<DepartureFormState>) => {
    setForm((current) => ({
      ...current,
      departures: current.departures.map((departure, currentIndex) =>
        currentIndex === index ? { ...departure, ...patch } : departure,
      ),
    }));
  };

  return (
    <main className="jb-page">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-6 py-10 md:px-10 lg:px-12">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="flex flex-wrap gap-3 text-sm">
              <Link href="/" className="text-teal-800 underline">
                ← Discovery
              </Link>
              <Link href="/owner/bookings" className="text-amber-800 underline">
                Owner inbox
              </Link>
            </div>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight text-slate-950">
              Manage your listings
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
              Create a new boat route or update an existing one. This MVP supports full editing for
              listings without bookings already attached.
            </p>
          </div>
          <button
            type="button"
            onClick={startNewListing}
            className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white"
          >
            New listing
          </button>
        </div>

        {error ? <p className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p> : null}
        {feedback ? (
          <p className="rounded-2xl bg-teal-50 px-4 py-3 text-sm text-teal-800">{feedback}</p>
        ) : null}

        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.35fr]">
          <aside className="jb-panel h-fit">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  My boats
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  {loadingList ? "Loading listings..." : `${items?.length ?? 0} listings`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => void refreshListings(selectedBoatId)}
                className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
              >
                Refresh
              </button>
            </div>

            <div className="mt-5 space-y-3">
              {(items ?? []).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => void loadListingDetail(item.id)}
                  className={`w-full rounded-[24px] border p-4 text-left transition ${
                    selectedBoatId === item.id
                      ? "border-teal-400 bg-teal-50/80 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-lg font-semibold text-slate-950">{item.translation.name}</p>
                      <p className="mt-1 text-sm text-slate-600">{formatRouteSummary(item)}</p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${
                        item.isActive
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {item.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <p className="mt-3 text-sm text-slate-600">{item.translation.description}</p>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Capacity</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {item.capacity.maxPassengers} passengers
                      </p>
                      <p className="text-xs text-slate-500">
                        {item.capacity.maxTotalLoadKg} kg total load
                      </p>
                    </div>
                    <div className="rounded-2xl bg-slate-50 p-3">
                      <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Pricing</p>
                      <p className="mt-1 text-sm font-medium text-slate-900">
                        {formatPricingSummary(item)}
                      </p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-slate-500">
                    {item.departures.length} scheduled departures · {item.route.stops.length} stops
                  </p>
                </button>
              ))}

              {!loadingList && (items?.length ?? 0) === 0 ? (
                <div className="rounded-[24px] border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-600">
                  No listings yet. Start with your first route on the right.
                </div>
              ) : null}
            </div>
          </aside>

          <section className="jb-panel">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
                  {selectedBoatId ? "Edit listing" : "Create listing"}
                </p>
                <h2 className="mt-1 text-2xl font-semibold text-slate-950">
                  {selectedBoatId ? "Update route details" : "Set up a new boat route"}
                </h2>
              </div>
              {loadingDetail ? <p className="text-sm text-slate-500">Loading listing...</p> : null}
            </div>

            <div className="mt-6 space-y-8">
              <section className="space-y-4">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-lg font-semibold text-slate-950">Basics</h3>
                  <div className="flex rounded-full bg-slate-100 p-1 text-sm">
                    {(["en", "hr"] as const).map((locale) => (
                      <button
                        key={locale}
                        type="button"
                        onClick={() => setLocaleTab(locale)}
                        className={`rounded-full px-3 py-1.5 ${
                          localeTab === locale
                            ? "bg-white font-medium text-slate-950 shadow-sm"
                            : "text-slate-500"
                        }`}
                      >
                        {locale.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Listing slug
                    <input
                      value={form.slug}
                      onChange={(event) => updateField("slug", event.target.value)}
                      placeholder="split-sunset-line"
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.isActive}
                      onChange={(event) => updateField("isActive", event.target.checked)}
                    />
                    Listing is active and visible in discovery
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    {localeTab.toUpperCase()} name
                    <input
                      value={form.translations[localeTab].name}
                      onChange={(event) => updateTranslation("name", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Currency
                    <input
                      value={form.currency}
                      onChange={(event) => updateField("currency", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm uppercase"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  {localeTab.toUpperCase()} description
                  <textarea
                    value={form.translations[localeTab].description}
                    onChange={(event) => updateTranslation("description", event.target.value)}
                    rows={4}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Start label ({localeTab.toUpperCase()})
                    <input
                      value={form.translations[localeTab].startLocationLabel}
                      onChange={(event) => updateTranslation("startLocationLabel", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    End label ({localeTab.toUpperCase()})
                    <input
                      value={form.translations[localeTab].endLocationLabel}
                      onChange={(event) => updateTranslation("endLocationLabel", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                <label className="block text-sm font-medium text-slate-700">
                  Allowed goods copy ({localeTab.toUpperCase()})
                  <textarea
                    value={form.translations[localeTab].allowedGoodsDescription}
                    onChange={(event) =>
                      updateTranslation("allowedGoodsDescription", event.target.value)
                    }
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>

                <label className="block text-sm font-medium text-slate-700">
                  Photo URLs (one per line)
                  <textarea
                    value={form.photosText}
                    onChange={(event) => updateField("photosText", event.target.value)}
                    rows={3}
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                  />
                </label>
              </section>

              <section className="space-y-4 border-t border-slate-200 pt-8">
                <h3 className="text-lg font-semibold text-slate-950">Route and pricing</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Start latitude
                    <input
                      value={form.startLat}
                      onChange={(event) => updateField("startLat", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Start longitude
                    <input
                      value={form.startLng}
                      onChange={(event) => updateField("startLng", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    End latitude
                    <input
                      value={form.endLat}
                      onChange={(event) => updateField("endLat", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    End longitude
                    <input
                      value={form.endLng}
                      onChange={(event) => updateField("endLng", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Base price per trip
                    <input
                      value={form.basePricePerTrip}
                      onChange={(event) => updateField("basePricePerTrip", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={form.hasUniformPerStopPricing}
                      onChange={(event) =>
                        updateField("hasUniformPerStopPricing", event.target.checked)
                      }
                    />
                    Use one shared stop price for all intermediate stops
                  </label>
                </div>

                {form.hasUniformPerStopPricing ? (
                  <label className="block text-sm font-medium text-slate-700">
                    Uniform stop price
                    <input
                      value={form.uniformPricePerStop}
                      onChange={(event) => updateField("uniformPricePerStop", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                ) : null}

                <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Intermediate stops</p>
                      <p className="text-xs text-slate-500">
                        Add optional stop coordinates and price each stop individually if needed.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        setForm((current) => ({
                          ...current,
                          stops: [...current.stops, { lat: "", lng: "", perStopPrice: "" }],
                        }))
                      }
                      className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700"
                    >
                      Add stop
                    </button>
                  </div>

                  <div className="mt-4 space-y-3">
                    {form.stops.map((stop, index) => (
                      <div key={`${index}-${stop.lat}-${stop.lng}`} className="rounded-2xl bg-white p-4">
                        <div className="flex items-center justify-between gap-3">
                          <p className="text-sm font-medium text-slate-900">Stop {index + 1}</p>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => moveStop(index, -1)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                            >
                              Up
                            </button>
                            <button
                              type="button"
                              onClick={() => moveStop(index, 1)}
                              className="rounded-full border border-slate-200 px-3 py-1 text-xs text-slate-600"
                            >
                              Down
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setForm((current) => ({
                                  ...current,
                                  stops: current.stops.filter((_, currentIndex) => currentIndex !== index),
                                }))
                              }
                              className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-700"
                            >
                              Remove
                            </button>
                          </div>
                        </div>
                        <div className="mt-3 grid gap-3 md:grid-cols-3">
                          <input
                            value={stop.lat}
                            onChange={(event) => updateStop(index, { lat: event.target.value })}
                            placeholder="Latitude"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                          />
                          <input
                            value={stop.lng}
                            onChange={(event) => updateStop(index, { lng: event.target.value })}
                            placeholder="Longitude"
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                          />
                          <input
                            value={stop.perStopPrice}
                            onChange={(event) =>
                              updateStop(index, { perStopPrice: event.target.value })
                            }
                            placeholder={form.hasUniformPerStopPricing ? "Optional override" : "Stop price"}
                            className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </section>

              <section className="space-y-4 border-t border-slate-200 pt-8">
                <h3 className="text-lg font-semibold text-slate-950">Capacity and cargo</h3>

                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block text-sm font-medium text-slate-700">
                    Max passengers
                    <input
                      value={form.maxPassengers}
                      onChange={(event) => updateField("maxPassengers", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                  <label className="block text-sm font-medium text-slate-700">
                    Max total load (kg)
                    <input
                      value={form.maxTotalLoadKg}
                      onChange={(event) => updateField("maxTotalLoadKg", event.target.value)}
                      className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                    />
                  </label>
                </div>

                <label className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.offersCargo}
                    onChange={(event) => updateField("offersCargo", event.target.checked)}
                  />
                  Offer cargo or food transport on this route
                </label>

                {form.offersCargo ? (
                  <div className="grid gap-4 md:grid-cols-3">
                    <label className="block text-sm font-medium text-slate-700">
                      Max cargo packages
                      <input
                        value={form.maxCargoPackages}
                        onChange={(event) => updateField("maxCargoPackages", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Max cargo weight (kg)
                      <input
                        value={form.maxCargoWeightKg}
                        onChange={(event) => updateField("maxCargoWeightKg", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      />
                    </label>
                    <label className="block text-sm font-medium text-slate-700">
                      Cargo price per kg
                      <input
                        value={form.cargoPricePerKg}
                        onChange={(event) => updateField("cargoPricePerKg", event.target.value)}
                        className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm"
                      />
                    </label>
                  </div>
                ) : null}
              </section>

              <section className="space-y-4 border-t border-slate-200 pt-8">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="text-lg font-semibold text-slate-950">Departures</h3>
                    <p className="text-xs text-slate-500">
                      Add future departures in your local time. They are stored in UTC.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setForm((current) => ({
                        ...current,
                        departures: [
                          ...current.departures,
                          {
                            departureTimeLocal: "",
                            maxPassengersOverride: "",
                            maxCargoWeightKgOverride: "",
                            status: "scheduled",
                          },
                        ],
                      }))
                    }
                    className="rounded-full border border-slate-200 px-3 py-2 text-xs font-medium text-slate-700"
                  >
                    Add departure
                  </button>
                </div>

                <div className="space-y-3">
                  {form.departures.map((departure, index) => (
                    <div key={`${index}-${departure.departureTimeLocal}`} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center justify-between gap-3">
                        <p className="text-sm font-medium text-slate-900">Departure {index + 1}</p>
                        <button
                          type="button"
                          onClick={() =>
                            setForm((current) => ({
                              ...current,
                              departures: current.departures.filter(
                                (_, currentIndex) => currentIndex !== index,
                              ),
                            }))
                          }
                          className="rounded-full border border-rose-200 px-3 py-1 text-xs text-rose-700"
                        >
                          Remove
                        </button>
                      </div>
                      <div className="mt-3 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                        <label className="block text-sm font-medium text-slate-700">
                          Date and time
                          <input
                            type="datetime-local"
                            value={departure.departureTimeLocal}
                            onChange={(event) =>
                              updateDeparture(index, { departureTimeLocal: event.target.value })
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Passenger override
                          <input
                            value={departure.maxPassengersOverride}
                            onChange={(event) =>
                              updateDeparture(index, {
                                maxPassengersOverride: event.target.value,
                              })
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Cargo override (kg)
                          <input
                            value={departure.maxCargoWeightKgOverride}
                            onChange={(event) =>
                              updateDeparture(index, {
                                maxCargoWeightKgOverride: event.target.value,
                              })
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          />
                        </label>
                        <label className="block text-sm font-medium text-slate-700">
                          Status
                          <select
                            value={departure.status}
                            onChange={(event) =>
                              updateDeparture(index, {
                                status: event.target.value as DepartureFormState["status"],
                              })
                            }
                            className="mt-2 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm"
                          >
                            <option value="scheduled">Scheduled</option>
                            <option value="cancelled">Cancelled</option>
                          </select>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-8">
                <p className="text-sm text-slate-500">
                  Save publishes the listing immediately when active is enabled.
                </p>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={startNewListing}
                    className="rounded-full border border-slate-200 px-5 py-3 text-sm font-medium text-slate-700"
                  >
                    Reset form
                  </button>
                  <button
                    type="button"
                    onClick={() => void saveListing()}
                    disabled={saving}
                    className="rounded-full bg-slate-950 px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving ? "Saving..." : selectedBoatId ? "Save changes" : "Create listing"}
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  );
}

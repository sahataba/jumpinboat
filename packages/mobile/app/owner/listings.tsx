import type {
  BoatDeparture,
  BoatListingDetail,
  BoatListingPayload,
  OwnerBoatListingSummary,
} from "@jumpinboat/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import type { KeyboardTypeOptions } from "react-native";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import {
  clearPersistedAuthSession,
  readPersistedAuthSession,
  type AuthSession,
} from "../../lib/auth";
import {
  getOwnerListing,
  listOwnerListings,
  saveOwnerListing,
} from "../../lib/owner-listings";

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
  return `${start} to ${end}`;
};

const formatPricingSummary = (item: Pick<OwnerBoatListingSummary, "route">) => {
  const currency = item.route.pricing.basePricePerTrip.currency;
  const base = `${item.route.pricing.basePricePerTrip.amount} ${currency}`;
  if (item.route.pricing.hasUniformPerStopPricing) {
    return `${base} + ${item.route.pricing.uniformPricePerStop?.amount ?? 0} ${currency}/stop`;
  }

  const prices = item.route.stops
    .map((stop) => stop.perStopPrice?.amount)
    .filter((amount): amount is number => typeof amount === "number");
  return prices.length > 0 ? `${base} + stops from ${Math.min(...prices)} ${currency}` : base;
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
    throw new Error("Trip time must be a valid date and time.");
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
  const maxPassengers = Math.floor(requireNumber(form.maxPassengers, "Passenger seats", 1));
  const maxTotalLoadKg = Math.floor(requireNumber(form.maxTotalLoadKg, "Total load", 1));
  const maxCargoWeightKg = form.offersCargo
    ? optionalNumber(form.maxCargoWeightKg, "Cargo weight limit", 0)
    : undefined;

  if (maxCargoWeightKg !== undefined && maxCargoWeightKg > maxTotalLoadKg) {
    throw new Error("Cargo weight limit cannot be greater than the total load.");
  }

  return {
    slug: form.slug.trim() || undefined,
    translations,
    route: {
      start: {
        lat: requireNumber(form.startLat, "Starting latitude"),
        lng: requireNumber(form.startLng, "Starting longitude"),
      },
      end: {
        lat: requireNumber(form.endLat, "Destination latitude"),
        lng: requireNumber(form.endLng, "Destination longitude"),
      },
      stops: form.stops.flatMap((stop, index) => {
        const lat = stop.lat.trim();
        const lng = stop.lng.trim();
        const price = stop.perStopPrice.trim();
        if (lat.length === 0 && lng.length === 0 && price.length === 0) {
          return [];
        }
        if (lat.length === 0 || lng.length === 0) {
          throw new Error(`Stop ${index + 1} needs latitude and longitude.`);
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
      }),
      pricing: {
        basePricePerTrip: {
          amount: requireNumber(form.basePricePerTrip, "Trip price", 0),
          currency,
        },
        hasUniformPerStopPricing: form.hasUniformPerStopPricing,
        uniformPricePerStop: form.hasUniformPerStopPricing
          ? {
              amount: requireNumber(form.uniformPricePerStop, "Stop price", 0),
              currency,
            }
          : undefined,
      },
    },
    capacity: {
      maxPassengers,
      maxTotalLoadKg,
      offersCargo: form.offersCargo,
      maxCargoPackages: form.offersCargo
        ? optionalNumber(form.maxCargoPackages, "Package limit", 0)
        : undefined,
      maxCargoWeightKg,
      cargoPricePerKg: form.offersCargo
        ? optionalNumber(form.cargoPricePerKg, "Cargo price per kg", 0) === undefined
          ? undefined
          : {
              amount: optionalNumber(form.cargoPricePerKg, "Cargo price per kg", 0) ?? 0,
              currency,
            }
        : undefined,
    },
    departures: form.departures.flatMap((departure, index) => {
      const time = departure.departureTimeLocal.trim();
      if (time.length === 0) {
        return [];
      }
      return [
        {
          departureTimeUtc: localInputToIso(time),
          maxPassengersOverride: optionalNumber(
            departure.maxPassengersOverride,
            `Trip time ${index + 1} seats`,
            1,
          ),
          maxCargoWeightKgOverride: optionalNumber(
            departure.maxCargoWeightKgOverride,
            `Trip time ${index + 1} cargo weight`,
            0,
          ),
          status: departure.status,
        },
      ];
    }),
    photos: form.photosText
      .split("\n")
      .map((photo) => photo.trim())
      .filter((photo) => photo.length > 0),
    isActive: form.isActive,
  };
};

const FormField = ({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  multiline,
}: {
  readonly label: string;
  readonly value: string;
  readonly onChangeText: (value: string) => void;
  readonly placeholder?: string;
  readonly keyboardType?: KeyboardTypeOptions;
  readonly multiline?: boolean;
}) => (
  <View style={styles.field}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TextInput
      keyboardType={keyboardType}
      multiline={multiline}
      onChangeText={onChangeText}
      placeholder={placeholder}
      placeholderTextColor={jb.subtle}
      style={[styles.input, multiline ? styles.textArea : undefined]}
      value={value}
    />
  </View>
);

export default function OwnerListingsScreen() {
  const router = useRouter();
  const [session, setSession] = useState<AuthSession | null>(null);
  const [items, setItems] = useState<ReadonlyArray<OwnerBoatListingSummary>>([]);
  const [selectedBoatId, setSelectedBoatId] = useState<string | null>(null);
  const [form, setForm] = useState<ListingFormState>(createEmptyFormState);
  const [localeTab, setLocaleTab] = useState<"en" | "hr">("en");
  const [loading, setLoading] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);

  const startNewListing = useCallback(() => {
    setSelectedBoatId(null);
    setForm(createEmptyFormState());
    setLocaleTab("en");
    setError(null);
    setFeedback(null);
  }, []);

  const loadListingDetail = useCallback(
    async (boatId: string, activeSession = session) => {
      if (!activeSession) {
        setError("Sign in with an account that can add boat trips.");
        return;
      }

      setLoadingDetail(true);
      setFeedback(null);
      try {
        const record = await getOwnerListing(activeSession, boatId);
        setSelectedBoatId(record.boat.id);
        setForm(detailToFormState(record.boat, record.departures));
        setLocaleTab("en");
        setError(null);
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Could not load this trip.");
      } finally {
        setLoadingDetail(false);
      }
    },
    [session],
  );

  const refreshListings = useCallback(
    async (preferredBoatId?: string | null, activeSession = session) => {
      setLoading(true);
      setFeedback(null);
      try {
        const nextSession = activeSession ?? (await readPersistedAuthSession());
        setSession(nextSession);

        if (!nextSession) {
          setItems([]);
          setSelectedBoatId(null);
          setForm(createEmptyFormState());
          setError("Sign in with an account that can add boat trips.");
          return;
        }

        if (!nextSession.user.canListBoats) {
          setItems([]);
          setSelectedBoatId(null);
          setForm(createEmptyFormState());
          setError("This account cannot add boat trips.");
          return;
        }

        const nextItems = await listOwnerListings(nextSession);
        setItems(nextItems);
        setError(null);

        if (preferredBoatId === null) {
          startNewListing();
          return;
        }

        const nextBoatId =
          preferredBoatId ??
          (selectedBoatId && nextItems.some((item) => item.id === selectedBoatId)
            ? selectedBoatId
            : nextItems[0]?.id ?? null);

        if (nextBoatId) {
          await loadListingDetail(nextBoatId, nextSession);
        } else {
          startNewListing();
        }
      } catch (loadError) {
        setItems([]);
        setError(loadError instanceof Error ? loadError.message : "Could not load your trips.");
      } finally {
        setLoading(false);
      }
    },
    [loadListingDetail, selectedBoatId, session, startNewListing],
  );

  useEffect(() => {
    void refreshListings();
  }, []);

  const signOut = async () => {
    await clearPersistedAuthSession();
    setSession(null);
    setItems([]);
    setSelectedBoatId(null);
    setForm(createEmptyFormState());
    setError("You're signed out.");
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

  const saveListing = async () => {
    if (!session) {
      setError("Sign in with an account that can add boat trips.");
      return;
    }

    setSaving(true);
    setError(null);
    setFeedback(null);
    try {
      const payload = formToPayload(form);
      const record = await saveOwnerListing(session, selectedBoatId, payload);
      setSelectedBoatId(record.boat.id);
      setForm(detailToFormState(record.boat, record.departures));
      setFeedback(selectedBoatId ? "Trip updated." : "Trip created.");
      await refreshListings(record.boat.id, session);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Could not save this trip.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Back</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/")} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Discover</Text>
        </Pressable>
        <Pressable onPress={() => void refreshListings(selectedBoatId)} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Owner</Text>
        <Text style={styles.title}>Manage boat trips</Text>
        <Text style={styles.body}>
          {session ? session.user.email : "Sign in to add trips and keep availability current."}
        </Text>
      </View>

      {error ? (
        <View style={styles.feedbackPanel}>
          <Text style={styles.errorText}>{error}</Text>
          <View style={styles.inlineActions}>
            <Pressable onPress={() => router.push("/auth")} style={styles.primarySmallButton}>
              <Text style={styles.primarySmallButtonLabel}>Account</Text>
            </Pressable>
            {session ? (
              <Pressable onPress={() => void signOut()} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Sign out</Text>
              </Pressable>
            ) : null}
          </View>
        </View>
      ) : null}

      {feedback ? <Text style={styles.successText}>{feedback}</Text> : null}

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>My trips</Text>
            <Text style={styles.sectionTitle}>
              {loading ? "Loading..." : `${items.length} trip${items.length === 1 ? "" : "s"}`}
            </Text>
          </View>
          <Pressable onPress={startNewListing} style={styles.primarySmallButton}>
            <Text style={styles.primarySmallButtonLabel}>New trip</Text>
          </Pressable>
        </View>

        {loading ? (
          <View style={styles.loadingRow}>
            <ActivityIndicator color={jb.teal700} />
            <Text style={styles.body}>Loading trips...</Text>
          </View>
        ) : null}

        {!loading && items.length === 0 ? (
          <Text style={styles.emptyText}>No owner trips yet.</Text>
        ) : null}

        <View style={styles.list}>
          {items.map((item) => {
            const isSelected = selectedBoatId === item.id;
            return (
              <Pressable
                key={item.id}
                onPress={() => void loadListingDetail(item.id)}
                style={[styles.tripRow, isSelected ? styles.tripRowActive : undefined]}
              >
                <View style={styles.tripHeader}>
                  <View style={styles.tripCopy}>
                    <Text style={styles.tripTitle}>{item.translation.name}</Text>
                    <Text style={styles.tripMeta}>{formatRouteSummary(item)}</Text>
                  </View>
                  <Text style={[styles.statusBadge, item.isActive ? styles.activeBadge : undefined]}>
                    {item.isActive ? "Active" : "Hidden"}
                  </Text>
                </View>
                <Text style={styles.tripDescription}>{item.translation.description}</Text>
                <Text style={styles.tripMeta}>
                  {item.capacity.maxPassengers} seats · {item.departures.length} times ·{" "}
                  {formatPricingSummary(item)}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View>
            <Text style={styles.eyebrow}>{selectedBoatId ? "Edit trip" : "Create trip"}</Text>
            <Text style={styles.sectionTitle}>
              {selectedBoatId ? "Trip details" : "New boat trip"}
            </Text>
          </View>
          {loadingDetail ? <ActivityIndicator color={jb.teal700} /> : null}
        </View>

        <View style={styles.segmented}>
          {(["en", "hr"] as const).map((locale) => (
            <Pressable
              key={locale}
              onPress={() => setLocaleTab(locale)}
              style={[styles.segment, localeTab === locale ? styles.segmentActive : undefined]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  localeTab === locale ? styles.segmentLabelActive : undefined,
                ]}
              >
                {locale.toUpperCase()}
              </Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Basics</Text>
          <FormField
            label={`${localeTab.toUpperCase()} name`}
            onChangeText={(value) => updateTranslation("name", value)}
            value={form.translations[localeTab].name}
          />
          <FormField
            label={`${localeTab.toUpperCase()} description`}
            multiline
            onChangeText={(value) => updateTranslation("description", value)}
            value={form.translations[localeTab].description}
          />
          <FormField
            label={`Starting point (${localeTab.toUpperCase()})`}
            onChangeText={(value) => updateTranslation("startLocationLabel", value)}
            value={form.translations[localeTab].startLocationLabel}
          />
          <FormField
            label={`Destination (${localeTab.toUpperCase()})`}
            onChangeText={(value) => updateTranslation("endLocationLabel", value)}
            value={form.translations[localeTab].endLocationLabel}
          />
          <FormField
            label={`Cargo note (${localeTab.toUpperCase()})`}
            multiline
            onChangeText={(value) => updateTranslation("allowedGoodsDescription", value)}
            value={form.translations[localeTab].allowedGoodsDescription}
          />
          <FormField
            label="Short web link"
            onChangeText={(value) => updateField("slug", value)}
            placeholder="split-sunset-line"
            value={form.slug}
          />
          <FormField
            label="Photo links"
            multiline
            onChangeText={(value) => updateField("photosText", value)}
            placeholder="https://..."
            value={form.photosText}
          />
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Visible to travelers</Text>
              <Text style={styles.toggleBody}>Active trips appear in discovery.</Text>
            </View>
            <Switch
              onValueChange={(value) => updateField("isActive", value)}
              trackColor={{ false: jb.border, true: jb.teal300 }}
              value={form.isActive}
            />
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Route and price</Text>
          <View style={styles.twoColumn}>
            <FormField
              keyboardType="decimal-pad"
              label="Start latitude"
              onChangeText={(value) => updateField("startLat", value)}
              value={form.startLat}
            />
            <FormField
              keyboardType="decimal-pad"
              label="Start longitude"
              onChangeText={(value) => updateField("startLng", value)}
              value={form.startLng}
            />
            <FormField
              keyboardType="decimal-pad"
              label="End latitude"
              onChangeText={(value) => updateField("endLat", value)}
              value={form.endLat}
            />
            <FormField
              keyboardType="decimal-pad"
              label="End longitude"
              onChangeText={(value) => updateField("endLng", value)}
              value={form.endLng}
            />
          </View>
          <View style={styles.twoColumn}>
            <FormField
              keyboardType="decimal-pad"
              label="Trip price"
              onChangeText={(value) => updateField("basePricePerTrip", value)}
              value={form.basePricePerTrip}
            />
            <FormField
              label="Currency"
              onChangeText={(value) => updateField("currency", value)}
              value={form.currency}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Same stop price</Text>
              <Text style={styles.toggleBody}>Use one price for every intermediate stop.</Text>
            </View>
            <Switch
              onValueChange={(value) => updateField("hasUniformPerStopPricing", value)}
              trackColor={{ false: jb.border, true: jb.teal300 }}
              value={form.hasUniformPerStopPricing}
            />
          </View>
          {form.hasUniformPerStopPricing ? (
            <FormField
              keyboardType="decimal-pad"
              label="Price per stop"
              onChangeText={(value) => updateField("uniformPricePerStop", value)}
              value={form.uniformPricePerStop}
            />
          ) : null}
          <View style={styles.subsectionHeader}>
            <Text style={styles.subsectionTitle}>Stops</Text>
            <Pressable
              onPress={() =>
                setForm((current) => ({
                  ...current,
                  stops: [...current.stops, { lat: "", lng: "", perStopPrice: "" }],
                }))
              }
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Add stop</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {form.stops.map((stop, index) => (
              <View key={`stop-${index}`} style={styles.editRow}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle}>Stop {index + 1}</Text>
                  <View style={styles.inlineActions}>
                    <Pressable onPress={() => moveStop(index, -1)} style={styles.miniButton}>
                      <Text style={styles.miniButtonLabel}>Up</Text>
                    </Pressable>
                    <Pressable onPress={() => moveStop(index, 1)} style={styles.miniButton}>
                      <Text style={styles.miniButtonLabel}>Down</Text>
                    </Pressable>
                    <Pressable
                      onPress={() =>
                        setForm((current) => ({
                          ...current,
                          stops: current.stops.filter((_, currentIndex) => currentIndex !== index),
                        }))
                      }
                      style={styles.removeButton}
                    >
                      <Text style={styles.removeButtonLabel}>Remove</Text>
                    </Pressable>
                  </View>
                </View>
                <FormField
                  keyboardType="decimal-pad"
                  label="Latitude"
                  onChangeText={(value) => updateStop(index, { lat: value })}
                  value={stop.lat}
                />
                <FormField
                  keyboardType="decimal-pad"
                  label="Longitude"
                  onChangeText={(value) => updateStop(index, { lng: value })}
                  value={stop.lng}
                />
                {!form.hasUniformPerStopPricing ? (
                  <FormField
                    keyboardType="decimal-pad"
                    label="Stop price"
                    onChangeText={(value) => updateStop(index, { perStopPrice: value })}
                    value={stop.perStopPrice}
                  />
                ) : null}
              </View>
            ))}
          </View>
        </View>

        <View style={styles.formSection}>
          <Text style={styles.formSectionTitle}>Capacity and cargo</Text>
          <View style={styles.twoColumn}>
            <FormField
              keyboardType="number-pad"
              label="Passenger seats"
              onChangeText={(value) => updateField("maxPassengers", value)}
              value={form.maxPassengers}
            />
            <FormField
              keyboardType="number-pad"
              label="Total load kg"
              onChangeText={(value) => updateField("maxTotalLoadKg", value)}
              value={form.maxTotalLoadKg}
            />
          </View>
          <View style={styles.toggleRow}>
            <View style={styles.toggleCopy}>
              <Text style={styles.toggleTitle}>Carry cargo</Text>
              <Text style={styles.toggleBody}>Allow supplies, bags, or food transport.</Text>
            </View>
            <Switch
              onValueChange={(value) => updateField("offersCargo", value)}
              trackColor={{ false: jb.border, true: jb.amber200 }}
              value={form.offersCargo}
            />
          </View>
          {form.offersCargo ? (
            <View style={styles.twoColumn}>
              <FormField
                keyboardType="number-pad"
                label="Package limit"
                onChangeText={(value) => updateField("maxCargoPackages", value)}
                value={form.maxCargoPackages}
              />
              <FormField
                keyboardType="number-pad"
                label="Cargo kg limit"
                onChangeText={(value) => updateField("maxCargoWeightKg", value)}
                value={form.maxCargoWeightKg}
              />
              <FormField
                keyboardType="decimal-pad"
                label="Price per kg"
                onChangeText={(value) => updateField("cargoPricePerKg", value)}
                value={form.cargoPricePerKg}
              />
            </View>
          ) : null}
        </View>

        <View style={styles.formSection}>
          <View style={styles.subsectionHeader}>
            <Text style={styles.formSectionTitle}>Trip times</Text>
            <Pressable
              onPress={() =>
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
              style={styles.secondaryButton}
            >
              <Text style={styles.secondaryButtonLabel}>Add time</Text>
            </Pressable>
          </View>
          <View style={styles.list}>
            {form.departures.map((departure, index) => (
              <View key={`departure-${index}`} style={styles.editRow}>
                <View style={styles.rowTitleLine}>
                  <Text style={styles.rowTitle}>Trip time {index + 1}</Text>
                  <Pressable
                    onPress={() =>
                      setForm((current) => ({
                        ...current,
                        departures: current.departures.filter(
                          (_, currentIndex) => currentIndex !== index,
                        ),
                      }))
                    }
                    style={styles.removeButton}
                  >
                    <Text style={styles.removeButtonLabel}>Remove</Text>
                  </Pressable>
                </View>
                <FormField
                  label="Date and time"
                  onChangeText={(value) => updateDeparture(index, { departureTimeLocal: value })}
                  placeholder="2026-06-01T09:00"
                  value={departure.departureTimeLocal}
                />
                <FormField
                  keyboardType="number-pad"
                  label="Seats for this time"
                  onChangeText={(value) => updateDeparture(index, { maxPassengersOverride: value })}
                  value={departure.maxPassengersOverride}
                />
                <FormField
                  keyboardType="number-pad"
                  label="Cargo kg for this time"
                  onChangeText={(value) =>
                    updateDeparture(index, { maxCargoWeightKgOverride: value })
                  }
                  value={departure.maxCargoWeightKgOverride}
                />
                <View style={styles.statusRow}>
                  {([
                    ["scheduled", "Taking bookings"],
                    ["cancelled", "Cancelled"],
                  ] as const).map(([status, label]) => (
                    <Pressable
                      key={status}
                      onPress={() => updateDeparture(index, { status })}
                      style={[
                        styles.statusChoice,
                        departure.status === status ? styles.statusChoiceActive : undefined,
                      ]}
                    >
                      <Text
                        style={[
                          styles.statusChoiceLabel,
                          departure.status === status
                            ? styles.statusChoiceLabelActive
                            : undefined,
                        ]}
                      >
                        {label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.saveRow}>
          <Pressable onPress={startNewListing} style={styles.secondaryButton}>
            <Text style={styles.secondaryButtonLabel}>Start over</Text>
          </Pressable>
          <Pressable
            disabled={saving || !session}
            onPress={() => void saveListing()}
            style={[styles.primaryButton, saving || !session ? styles.buttonDisabled : undefined]}
          >
            <Text style={styles.primaryButtonLabel}>
              {saving ? "Saving..." : selectedBoatId ? "Save changes" : "Create trip"}
            </Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

const jb = {
  amber200: "#fde68a",
  border: "#e2e8f0",
  canvas: "#f8fafc",
  ink: "#0f172a",
  muted: "#64748b",
  panel: "#ffffff",
  rose700: "#be123c",
  roseSoft: "#fff1f2",
  subtle: "#94a3b8",
  teal50: "#f0fdfa",
  teal300: "#5eead4",
  teal700: "#0f766e",
  tealSoft: "#ccfbf1",
};

const styles = StyleSheet.create({
  activeBadge: {
    backgroundColor: jb.tealSoft,
    color: "#115e59",
  },
  body: {
    color: jb.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 44,
  },
  editRow: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  emptyText: {
    color: jb.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: jb.rose700,
    fontSize: 14,
    lineHeight: 21,
  },
  eyebrow: {
    color: jb.teal700,
    fontSize: 12,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  feedbackPanel: {
    backgroundColor: jb.roseSoft,
    borderColor: "#fecdd3",
    borderRadius: 22,
    borderWidth: 1,
    gap: 12,
    padding: 16,
  },
  field: {
    gap: 7,
  },
  fieldLabel: {
    color: jb.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  formSection: {
    borderTopColor: jb.border,
    borderTopWidth: 1,
    gap: 14,
    paddingTop: 18,
  },
  formSectionTitle: {
    color: jb.ink,
    fontSize: 18,
    fontWeight: "800",
  },
  hero: {
    gap: 8,
  },
  inlineActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 16,
    borderWidth: 1,
    color: jb.ink,
    fontSize: 15,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  list: {
    gap: 10,
  },
  loadingRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 10,
  },
  miniButton: {
    borderColor: jb.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  miniButtonLabel: {
    color: jb.muted,
    fontSize: 12,
    fontWeight: "800",
  },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  panel: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: jb.ink,
    borderRadius: 18,
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  primarySmallButton: {
    alignItems: "center",
    backgroundColor: jb.ink,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  primarySmallButtonLabel: {
    color: "#ffffff",
    fontSize: 13,
    fontWeight: "800",
  },
  removeButton: {
    backgroundColor: jb.roseSoft,
    borderColor: "#fecdd3",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  removeButtonLabel: {
    color: jb.rose700,
    fontSize: 12,
    fontWeight: "800",
  },
  rowTitle: {
    color: jb.ink,
    fontSize: 15,
    fontWeight: "800",
  },
  rowTitleLine: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    justifyContent: "space-between",
  },
  saveRow: {
    borderTopColor: jb.border,
    borderTopWidth: 1,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    paddingTop: 18,
  },
  screen: {
    backgroundColor: jb.canvas,
    flex: 1,
  },
  secondaryButton: {
    alignItems: "center",
    borderColor: jb.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  secondaryButtonLabel: {
    color: jb.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  sectionTitle: {
    color: jb.ink,
    fontSize: 22,
    fontWeight: "800",
    marginTop: 3,
  },
  segment: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 10,
  },
  segmentActive: {
    backgroundColor: jb.ink,
  },
  segmented: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    flexDirection: "row",
    padding: 4,
  },
  segmentLabel: {
    color: jb.muted,
    fontSize: 13,
    fontWeight: "800",
  },
  segmentLabelActive: {
    color: "#ffffff",
  },
  statusBadge: {
    backgroundColor: "#f1f5f9",
    borderRadius: 999,
    color: jb.muted,
    fontSize: 11,
    fontWeight: "800",
    overflow: "hidden",
    paddingHorizontal: 9,
    paddingVertical: 6,
  },
  statusChoice: {
    alignItems: "center",
    borderColor: jb.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  statusChoiceActive: {
    backgroundColor: jb.ink,
    borderColor: jb.ink,
  },
  statusChoiceLabel: {
    color: jb.ink,
    fontSize: 13,
    fontWeight: "800",
  },
  statusChoiceLabelActive: {
    color: "#ffffff",
  },
  statusRow: {
    flexDirection: "row",
    gap: 8,
  },
  subsectionHeader: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  subsectionTitle: {
    color: jb.ink,
    fontSize: 16,
    fontWeight: "800",
  },
  successText: {
    backgroundColor: jb.tealSoft,
    borderRadius: 18,
    color: jb.teal700,
    fontSize: 14,
    fontWeight: "800",
    paddingHorizontal: 14,
    paddingVertical: 11,
  },
  textArea: {
    minHeight: 92,
    textAlignVertical: "top",
  },
  textButton: {
    alignSelf: "flex-start",
    borderColor: "#99f6e4",
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  textButtonLabel: {
    color: jb.teal700,
    fontSize: 14,
    fontWeight: "800",
  },
  title: {
    color: jb.ink,
    fontSize: 32,
    fontWeight: "800",
    lineHeight: 37,
  },
  toggleBody: {
    color: jb.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  toggleCopy: {
    flex: 1,
    gap: 3,
  },
  toggleRow: {
    alignItems: "center",
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
    padding: 14,
  },
  toggleTitle: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  tripCopy: {
    flex: 1,
    gap: 4,
  },
  tripDescription: {
    color: jb.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  tripHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 10,
    justifyContent: "space-between",
  },
  tripMeta: {
    color: jb.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  tripRow: {
    backgroundColor: "#ffffff",
    borderColor: jb.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 10,
    padding: 14,
  },
  tripRowActive: {
    backgroundColor: jb.teal50,
    borderColor: "#5eead4",
  },
  tripTitle: {
    color: jb.ink,
    fontSize: 17,
    fontWeight: "800",
  },
  twoColumn: {
    gap: 12,
  },
});

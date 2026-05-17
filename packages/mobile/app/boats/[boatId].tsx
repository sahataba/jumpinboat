import type { BoatListingSummary } from "@jumpinboat/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

import { getApiBaseUrl } from "../../lib/api-base";
import { readPersistedAuthSession } from "../../lib/auth";

type DepartureRow = {
  readonly id: string;
  readonly routeId: string;
  readonly departureTimeUtc: string;
  readonly maxPassengersOverride: number | null;
  readonly maxCargoWeightKgOverride: number | null;
  readonly status: string;
};

const readApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const formatMoney = (amount: number, currency: string) =>
  `${amount.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${currency}`;

const formatPricingSummary = (boat: BoatListingSummary) => {
  const currency = boat.route.pricing.basePricePerTrip.currency;
  const base = `${formatMoney(boat.route.pricing.basePricePerTrip.amount, currency)} for the trip`;

  if (!boat.route.pricing.hasUniformPerStopPricing) {
    const prices = boat.route.stops
      .map((stop) => stop.perStopPrice?.amount)
      .filter((price): price is number => typeof price === "number");
    return prices.length > 0
      ? `${base} + stops from ${formatMoney(Math.min(...prices), currency)}`
      : base;
  }

  return `${base} + ${formatMoney(
    boat.route.pricing.uniformPricePerStop?.amount ?? 0,
    currency,
  )} per stop`;
};

const parseWholeNumber = (value: string, field: string, min: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < min) {
    throw new Error(`${field} must be at least ${min}.`);
  }
  return Math.floor(parsed);
};

const parseOptionalWholeNumber = (value: string, field: string) => {
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  return parseWholeNumber(trimmed, field, 0);
};

export default function BoatDetailScreen() {
  const { boatId } = useLocalSearchParams<{ boatId: string }>();
  const router = useRouter();
  const [boat, setBoat] = useState<BoatListingSummary | null>(null);
  const [departures, setDepartures] = useState<ReadonlyArray<DepartureRow>>([]);
  const [departureId, setDepartureId] = useState("");
  const [passengers, setPassengers] = useState("1");
  const [selectedStops, setSelectedStops] = useState<Record<string, boolean>>({});
  const [cargoKg, setCargoKg] = useState("");
  const [cargoPackages, setCargoPackages] = useState("");
  const [feedback, setFeedback] = useState("");
  const [authNeeded, setAuthNeeded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!boatId) return;
    setLoading(true);
    setErr(null);
    setFeedback("");
    try {
      const [boatResponse, departuresResponse] = await Promise.all([
        fetch(`${getApiBaseUrl()}/api/boats/detail?boatId=${encodeURIComponent(boatId)}`),
        fetch(`${getApiBaseUrl()}/api/boats/departures?boatId=${encodeURIComponent(boatId)}`),
      ]);

      if (!boatResponse.ok) {
        throw new Error(await readApiError(boatResponse));
      }
      if (!departuresResponse.ok) {
        throw new Error(await readApiError(departuresResponse));
      }

      const boatPayload = (await boatResponse.json()) as { boat: BoatListingSummary };
      const departuresPayload = (await departuresResponse.json()) as {
        items: ReadonlyArray<DepartureRow>;
      };
      setBoat(boatPayload.boat);
      setDepartures(departuresPayload.items);
      setDepartureId(departuresPayload.items[0]?.id ?? "");
      setSelectedStops({});
    } catch (error) {
      setErr(error instanceof Error ? error.message : "Could not load this trip.");
    } finally {
      setLoading(false);
    }
  }, [boatId]);

  useEffect(() => {
    void load();
  }, [load]);

  const selectedStopTotal = useMemo(() => {
    if (!boat) {
      return 0;
    }

    return boat.route.stops.reduce((total, stop) => {
      if (!selectedStops[stop.id]) {
        return total;
      }
      if (
        boat.route.pricing.hasUniformPerStopPricing &&
        boat.route.pricing.uniformPricePerStop
      ) {
        return total + boat.route.pricing.uniformPricePerStop.amount;
      }
      return total + (stop.perStopPrice?.amount ?? 0);
    }, 0);
  }, [boat, selectedStops]);

  const estimatedTotal = useMemo(() => {
    if (!boat) {
      return null;
    }
    const cargoWeight = Number(cargoKg.trim() || "0");
    const cargoPrice =
      boat.offersCargo && Number.isFinite(cargoWeight)
        ? (boat.capacity.cargoPricePerKg?.amount ?? 0) * cargoWeight
        : 0;
    return boat.route.pricing.basePricePerTrip.amount + selectedStopTotal + cargoPrice;
  }, [boat, cargoKg, selectedStopTotal]);

  const toggleStop = (stopId: string) => {
    setSelectedStops((current) => ({
      ...current,
      [stopId]: !current[stopId],
    }));
  };

  const submitBooking = async () => {
    setFeedback("");
    setAuthNeeded(false);

    const session = await readPersistedAuthSession();
    if (!session) {
      setAuthNeeded(true);
      setFeedback("Sign in to request this trip.");
      return;
    }

    if (!boat || !departureId) {
      setFeedback("Choose a departure time.");
      return;
    }

    setIsSubmitting(true);
    try {
      const passengerCount = parseWholeNumber(passengers, "Passengers", 1);
      if (passengerCount > boat.capacity.maxPassengers) {
        throw new Error(`Passengers cannot be more than ${boat.capacity.maxPassengers}.`);
      }

      const response = await fetch(`${getApiBaseUrl()}/api/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({
          boatId: boat.id,
          departureId,
          passengerCount,
          selectedStops: boat.route.stops
            .filter((stop) => selectedStops[stop.id])
            .map((stop) => ({
              stopId: stop.id,
              routeId: boat.route.id,
            })),
          estimatedCargoWeightKg: parseOptionalWholeNumber(cargoKg, "Cargo weight"),
          estimatedCargoPackages: parseOptionalWholeNumber(
            cargoPackages,
            "Bags or boxes",
          ),
        }),
      });

      if (!response.ok) {
        throw new Error(await readApiError(response));
      }

      setFeedback("Booking request sent. Pay on arrival after the captain confirms.");
      await load();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Booking failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (err) {
    return (
      <View style={styles.centeredScreen}>
        <Text style={styles.errorText}>{err}</Text>
        <Pressable onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (loading || !boat) {
    return (
      <View style={styles.centeredScreen}>
        <ActivityIndicator color={jb.teal700} />
      </View>
    );
  }

  const currency = boat.route.pricing.basePricePerTrip.currency;

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Back</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/bookings")} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>My bookings</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Captain included</Text>
        <Text style={styles.title}>{boat.translation.name}</Text>
        <Text style={styles.body}>{boat.translation.description}</Text>
        <Text style={styles.routeLine}>
          {boat.translation.startLocationLabel ?? "Departure"} to{" "}
          {boat.translation.endLocationLabel ?? "Arrival"} ·{" "}
          {boat.freePassengers ?? boat.capacity.maxPassengers} seats open
        </Text>
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Pricing</Text>
          <Text style={styles.metricValue}>{formatPricingSummary(boat)}</Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Capacity</Text>
          <Text style={styles.metricValue}>
            {boat.capacity.maxPassengers} passengers · {boat.capacity.maxTotalLoadKg} kg
          </Text>
        </View>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>Route</Text>
          <Text style={styles.metricValue}>
            Start {boat.route.start.lat.toFixed(4)}, {boat.route.start.lng.toFixed(4)}
          </Text>
          <Text style={styles.metricHint}>
            End {boat.route.end.lat.toFixed(4)}, {boat.route.end.lng.toFixed(4)}
          </Text>
        </View>
      </View>

      <View style={styles.panel}>
        <Text style={styles.sectionTitle}>Request this trip</Text>
        <Text style={styles.body}>Choose a time, passengers, and any stops or cargo.</Text>

        {departures.length === 0 ? (
          <View style={styles.feedbackPanel}>
            <Text style={styles.body}>No upcoming departures are available right now.</Text>
          </View>
        ) : (
          <View style={styles.choiceGroup}>
            {departures.map((departure) => {
              const isSelected = departureId === departure.id;
              return (
                <Pressable
                  key={departure.id}
                  onPress={() => setDepartureId(departure.id)}
                  style={[styles.choiceChip, isSelected ? styles.choiceChipActive : undefined]}
                >
                  <Text
                    style={[
                      styles.choiceChipText,
                      isSelected ? styles.choiceChipTextActive : undefined,
                    ]}
                  >
                    {new Date(departure.departureTimeUtc).toLocaleString()}
                  </Text>
                </Pressable>
              );
            })}
          </View>
        )}

        <View style={styles.inputGroup}>
          <Text style={styles.inputLabel}>Passengers</Text>
          <TextInput
            keyboardType="number-pad"
            onChangeText={setPassengers}
            style={styles.input}
            value={passengers}
          />
        </View>

        {boat.route.stops.length > 0 ? (
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Add a stop along the way</Text>
            <View style={styles.stopList}>
              {boat.route.stops.map((stop) => {
                const isSelected = !!selectedStops[stop.id];
                const stopPrice =
                  boat.route.pricing.hasUniformPerStopPricing &&
                  boat.route.pricing.uniformPricePerStop
                    ? boat.route.pricing.uniformPricePerStop
                    : stop.perStopPrice;
                return (
                  <Pressable
                    key={stop.id}
                    onPress={() => toggleStop(stop.id)}
                    style={[styles.stopChip, isSelected ? styles.stopChipActive : undefined]}
                  >
                    <Text
                      style={[
                        styles.stopChipTitle,
                        isSelected ? styles.stopChipTitleActive : undefined,
                      ]}
                    >
                      Stop {stop.orderIndex}
                    </Text>
                    <Text
                      style={[
                        styles.stopChipMeta,
                        isSelected ? styles.stopChipMetaActive : undefined,
                      ]}
                    >
                      {stop.coordinate.lat.toFixed(4)}, {stop.coordinate.lng.toFixed(4)}
                      {stopPrice ? ` · +${formatMoney(stopPrice.amount, stopPrice.currency)}` : ""}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}

        {boat.offersCargo ? (
          <View style={styles.cargoGrid}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Cargo weight kg</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setCargoKg}
                placeholder="0"
                placeholderTextColor={jb.subtle}
                style={styles.input}
                value={cargoKg}
              />
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Bags or boxes</Text>
              <TextInput
                keyboardType="number-pad"
                onChangeText={setCargoPackages}
                placeholder="0"
                placeholderTextColor={jb.subtle}
                style={styles.input}
                value={cargoPackages}
              />
            </View>
            {boat.translation.allowedGoodsDescription ? (
              <Text style={styles.metricHint}>{boat.translation.allowedGoodsDescription}</Text>
            ) : null}
          </View>
        ) : null}

        <View style={styles.totalPanel}>
          <Text style={styles.metricLabel}>Estimated total</Text>
          <Text style={styles.totalText}>
            {estimatedTotal === null ? "-" : formatMoney(estimatedTotal, currency)}
          </Text>
          <Text style={styles.metricHint}>Pay on arrival. Captain confirms before you go.</Text>
        </View>

        <Pressable
          disabled={isSubmitting || !departureId}
          onPress={() => void submitBooking()}
          style={[
            styles.primaryButton,
            isSubmitting || !departureId ? styles.buttonDisabled : undefined,
          ]}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSubmitting ? "Sending..." : "Request booking"}
          </Text>
        </Pressable>

        {feedback ? (
          <View style={styles.feedbackPanel}>
            <Text style={authNeeded ? styles.errorText : styles.successText}>{feedback}</Text>
            {authNeeded ? (
              <Pressable onPress={() => router.push("/auth")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>Sign in</Text>
              </Pressable>
            ) : null}
            {!authNeeded && feedback.startsWith("Booking request sent") ? (
              <Pressable onPress={() => router.push("/bookings")} style={styles.secondaryButton}>
                <Text style={styles.secondaryButtonLabel}>View my bookings</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const jb = {
  border: "#e2e8f0",
  canvas: "#f8fafc",
  ink: "#0f172a",
  muted: "#64748b",
  panel: "#ffffff",
  rose700: "#be123c",
  roseSoft: "#fff1f2",
  subtle: "#94a3b8",
  teal50: "#f0fdfa",
  teal700: "#0f766e",
  tealSoft: "#ccfbf1",
};

const styles = StyleSheet.create({
  body: {
    color: jb.muted,
    fontSize: 15,
    lineHeight: 22,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  cargoGrid: {
    gap: 12,
  },
  centeredScreen: {
    alignItems: "center",
    backgroundColor: jb.canvas,
    flex: 1,
    gap: 16,
    justifyContent: "center",
    padding: 24,
  },
  choiceChip: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 16,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  choiceChipActive: {
    backgroundColor: jb.ink,
    borderColor: jb.ink,
  },
  choiceChipText: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "700",
  },
  choiceChipTextActive: {
    color: "#ffffff",
  },
  choiceGroup: {
    gap: 8,
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 44,
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
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 12,
    padding: 14,
  },
  hero: {
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
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  metricBox: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 22,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  metricHint: {
    color: jb.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  metricLabel: {
    color: jb.muted,
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0,
    textTransform: "uppercase",
  },
  metrics: {
    gap: 10,
  },
  metricValue: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "700",
    lineHeight: 20,
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
    gap: 16,
    padding: 18,
  },
  primaryButton: {
    alignItems: "center",
    backgroundColor: jb.ink,
    borderRadius: 18,
    paddingVertical: 15,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 15,
    fontWeight: "800",
  },
  routeLine: {
    color: jb.muted,
    fontSize: 13,
    lineHeight: 20,
  },
  screen: {
    backgroundColor: jb.canvas,
    flex: 1,
  },
  secondaryButton: {
    alignSelf: "flex-start",
    backgroundColor: jb.tealSoft,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonLabel: {
    color: jb.teal700,
    fontSize: 13,
    fontWeight: "800",
  },
  sectionTitle: {
    color: jb.ink,
    fontSize: 22,
    fontWeight: "800",
  },
  stopChip: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 18,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  stopChipActive: {
    backgroundColor: jb.teal50,
    borderColor: "#5eead4",
  },
  stopChipMeta: {
    color: jb.muted,
    fontSize: 12,
    lineHeight: 18,
  },
  stopChipMetaActive: {
    color: "#115e59",
  },
  stopChipTitle: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "800",
  },
  stopChipTitleActive: {
    color: "#115e59",
  },
  stopList: {
    gap: 8,
  },
  successText: {
    color: jb.teal700,
    fontSize: 14,
    lineHeight: 21,
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
  totalPanel: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 20,
    borderWidth: 1,
    gap: 5,
    padding: 14,
  },
  totalText: {
    color: jb.ink,
    fontSize: 24,
    fontWeight: "800",
  },
});

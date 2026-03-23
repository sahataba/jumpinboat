import { Result } from "@effect-atom/atom-react";
import { useRouter } from "expo-router";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

import { usePublicBoatFilters, usePublicBoatList } from "../lib/public-boats";
import {
  type BoatListingSummary,
  type PublicBoatListFilters,
  userFacingListLoadError,
} from "@jumpinboat/shared";

const formatRouteSummary = (boat: BoatListingSummary) => {
  const start = boat.translation.startLocationLabel ?? "Departure";
  const end = boat.translation.endLocationLabel ?? "Arrival";
  return `${start} -> ${end}`;
};

const formatPricingSummary = (boat: BoatListingSummary) => {
  const currency = boat.route.pricing.basePricePerTrip.currency;
  const base = `${boat.route.pricing.basePricePerTrip.amount} ${currency}/trip`;

  if (!boat.route.pricing.hasUniformPerStopPricing) {
    const prices = boat.route.stops
      .map((stop) => stop.perStopPrice?.amount)
      .filter((price): price is number => typeof price === "number");

    return prices.length > 0 ? `${base} + from ${Math.min(...prices)} ${currency}/stop` : base;
  }

  return `${base} + ${boat.route.pricing.uniformPricePerStop?.amount ?? 0} ${currency}/stop`;
};

const BoatCard = ({
  boat,
  onOpen,
}: {
  boat: BoatListingSummary;
  onOpen: () => void;
}) => (
  <Pressable onPress={onOpen} style={styles.card}>
    <View style={styles.cardHeader}>
      <View style={styles.cardHeaderCopy}>
        <Text style={styles.eyebrow}>Public route</Text>
        <Text style={styles.cardTitle}>{boat.translation.name}</Text>
        <Text style={styles.cardDescription}>{boat.translation.description}</Text>
      </View>
      <View style={styles.riskBadge}>
        <Text style={styles.riskBadgeText}>{boat.weatherRiskPercent ?? 0}% risk</Text>
      </View>
    </View>

    <View style={styles.metricGrid}>
      <View style={styles.metricBox}>
        <Text style={styles.metricLabel}>Route</Text>
        <Text style={styles.metricValue}>{formatRouteSummary(boat)}</Text>
        <Text style={styles.metricHint}>{boat.route.stops.length} stops in route</Text>
      </View>
      <View style={styles.metricBox}>
        <Text style={styles.metricLabel}>Pricing</Text>
        <Text style={styles.metricValue}>{formatPricingSummary(boat)}</Text>
      </View>
      <View style={styles.metricBox}>
        <Text style={styles.metricLabel}>Capacity</Text>
        <Text style={styles.metricValue}>{boat.capacity.maxPassengers} passengers</Text>
        <Text style={styles.metricHint}>{boat.capacity.maxTotalLoadKg} kg legal load</Text>
      </View>
      <View style={styles.metricBox}>
        <Text style={styles.metricLabel}>Availability</Text>
        <Text style={styles.metricValue}>{boat.freePassengers ?? boat.capacity.maxPassengers} seats open</Text>
        <Text style={styles.metricHint}>
          {boat.offersCargo
            ? `${boat.capacity.maxCargoWeightKg ?? 0} kg cargo support`
            : "Passenger transfer only"}
        </Text>
      </View>
    </View>
  </Pressable>
);

export default function HomeScreen() {
  const router = useRouter();
  const { filters, setFilters } = usePublicBoatFilters();
  const { activeFilterCount, result } = usePublicBoatList();
  const updateFilters = (
    nextFilters:
      | PublicBoatListFilters
      | ((current: PublicBoatListFilters) => PublicBoatListFilters),
  ) => setFilters(nextFilters);

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>JumpInBoat discovery</Text>
        <Text style={styles.heroTitle}>Licensed skipper-led routes near you</Text>
        <Text style={styles.heroBody}>
          Browse listings shared with our website. Tap a card for route details and next steps.
        </Text>
      </View>

      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Filters</Text>
        <TextInput
          style={styles.input}
          placeholder="Search route, town, cargo..."
          placeholderTextColor="#6b7280"
          value={filters.query}
          onChangeText={(value) =>
            updateFilters((current) => ({
              ...current,
              query: value,
            }))
          }
        />

        <View style={styles.toggleRow}>
          <View style={styles.toggleCopy}>
            <Text style={styles.toggleTitle}>Goods transport only</Text>
            <Text style={styles.toggleBody}>Only show boats that can carry provisions or cargo.</Text>
          </View>
          <Switch
            value={filters.goodsTransportOnly}
            onValueChange={(value) =>
              updateFilters((current) => ({
                ...current,
                goodsTransportOnly: value,
              }))
            }
            trackColor={{ false: "#cbd5e1", true: "#14b8a6" }}
          />
        </View>

        <View style={styles.seatStepper}>
          <Text style={styles.toggleTitle}>Minimum free spots</Text>
          <View style={styles.seatActions}>
            {[0, 2, 4, 6].map((count) => (
              <Text
                key={count}
                onPress={() =>
                  updateFilters((current) => ({
                    ...current,
                    minFreeSpots: count,
                  }))
                }
                style={[
                  styles.seatChip,
                  filters.minFreeSpots === count ? styles.seatChipActive : undefined,
                ]}
              >
                {count}+
              </Text>
            ))}
          </View>
        </View>
      </View>

      <View style={styles.banner}>
        <Text style={styles.bannerText}>Listings update as captains publish routes.</Text>
        <Text style={styles.bannerCount}>{activeFilterCount} active</Text>
      </View>

      {Result.builder(result)
        .onInitial(() => <Text style={styles.feedback}>Loading public boats...</Text>)
        .onFailure((cause) => (
          <Text style={[styles.feedback, styles.feedbackError]}>
            {userFacingListLoadError(cause)}
          </Text>
        ))
        .onSuccess((boats: ReadonlyArray<BoatListingSummary>) => (
          <View style={styles.listSection}>
            <Text style={styles.listTitle}>{boats.length} public boat options</Text>
            <Text style={styles.listSubtitle}>Same listings as the JumpInBoat website.</Text>

            {boats.length === 0 ? (
              <Text style={styles.feedback}>No boats match these filters right now.</Text>
            ) : (
              boats.map((boat) => (
                <BoatCard
                  key={boat.id}
                  boat={boat}
                  onOpen={() => router.push(`/boats/${boat.id}`)}
                />
              ))
            )}
          </View>
        ))
        .render()}
    </ScrollView>
  );
}

const jb = {
  canvas: "#f8fafc",
  ink: "#0f172a",
  muted: "#64748b",
  border: "#e2e8f0",
  panel: "#ffffff",
  teal700: "#0f766e",
  teal950: "#042f2e",
  tealSoftBg: "rgba(204, 251, 241, 0.85)",
  tealSoftBorder: "#99f6e4",
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: jb.tealSoftBg,
    borderColor: jb.tealSoftBorder,
    borderRadius: 24,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  bannerCount: {
    color: jb.teal700,
    fontSize: 14,
    fontWeight: "700",
  },
  bannerText: {
    color: jb.teal950,
    flex: 1,
    fontSize: 14,
    marginRight: 12,
  },
  card: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 18,
    padding: 20,
  },
  cardDescription: {
    color: jb.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  cardHeader: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardHeaderCopy: {
    flex: 1,
    gap: 6,
  },
  cardTitle: {
    color: jb.ink,
    fontSize: 24,
    fontWeight: "700",
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 40,
  },
  eyebrow: {
    color: jb.teal700,
    fontSize: 12,
    fontWeight: "700",
    letterSpacing: 1.6,
    textTransform: "uppercase",
  },
  feedback: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 22,
    borderWidth: 1,
    color: jb.muted,
    fontSize: 15,
    overflow: "hidden",
    padding: 18,
  },
  feedbackError: {
    backgroundColor: "#fff1f2",
    borderColor: "#fecdd3",
    color: "#be123c",
  },
  hero: {
    backgroundColor: jb.panel,
    borderColor: "rgba(255,255,255,0.7)",
    borderRadius: 32,
    borderWidth: 1,
    gap: 10,
    padding: 24,
    shadowColor: "#0f172a",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  heroBody: {
    color: jb.muted,
    fontSize: 15,
    lineHeight: 24,
  },
  heroTitle: {
    color: jb.ink,
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 34,
  },
  input: {
    backgroundColor: jb.canvas,
    borderColor: jb.border,
    borderRadius: 18,
    borderWidth: 1,
    color: jb.ink,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listSection: {
    gap: 12,
  },
  listSubtitle: {
    color: jb.muted,
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 4,
  },
  listTitle: {
    color: jb.ink,
    fontSize: 28,
    fontWeight: "700",
  },
  metricBox: {
    backgroundColor: jb.canvas,
    borderRadius: 18,
    gap: 6,
    padding: 14,
  },
  metricGrid: {
    gap: 12,
  },
  metricHint: {
    color: jb.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  metricLabel: {
    color: jb.muted,
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1.4,
    textTransform: "uppercase",
  },
  metricValue: {
    color: jb.ink,
    fontSize: 15,
    fontWeight: "600",
    lineHeight: 22,
  },
  panel: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 16,
    padding: 20,
  },
  panelTitle: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  riskBadge: {
    alignSelf: "flex-start",
    backgroundColor: "#fffbeb",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  riskBadgeText: {
    color: "#a16207",
    fontSize: 12,
    fontWeight: "700",
  },
  screen: {
    backgroundColor: jb.canvas,
    flex: 1,
  },
  seatActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  seatChip: {
    backgroundColor: "#e2e8f0",
    borderRadius: 999,
    color: "#334155",
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  seatChipActive: {
    backgroundColor: jb.teal700,
    color: "#f8fafc",
  },
  seatStepper: {
    gap: 4,
  },
  toggleBody: {
    color: jb.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  toggleCopy: {
    flex: 1,
    gap: 4,
    marginRight: 12,
  },
  toggleRow: {
    alignItems: "center",
    backgroundColor: jb.canvas,
    borderColor: jb.border,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 16,
  },
  toggleTitle: {
    color: jb.ink,
    fontSize: 15,
    fontWeight: "600",
  },
});

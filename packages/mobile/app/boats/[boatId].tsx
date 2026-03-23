import type { BoatListingSummary } from "@jumpinboat/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { getApiBaseUrl } from "../../lib/api-base";

export default function BoatDetailScreen() {
  const { boatId } = useLocalSearchParams<{ boatId: string }>();
  const router = useRouter();
  const [boat, setBoat] = useState<BoatListingSummary | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (!boatId) return;
    void (async () => {
      try {
        const r = await fetch(
          `${getApiBaseUrl()}/api/boats/detail?boatId=${encodeURIComponent(boatId)}`,
        );
        if (!r.ok) throw new Error(await r.text());
        const j = (await r.json()) as { boat: BoatListingSummary };
        setBoat(j.boat);
      } catch (e) {
        setErr(e instanceof Error ? e.message : "Error");
      }
    })();
  }, [boatId]);

  if (err) {
    return (
      <View style={{ padding: 24 }}>
        <Text style={{ color: "#b91c1c" }}>{err}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ marginTop: 16, color: "#0f766e" }}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!boat) {
    return (
      <View style={{ padding: 48, alignItems: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={{ padding: 20, gap: 12 }}>
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: "#0f766e", marginBottom: 8 }}>← Back</Text>
      </Pressable>
      <Text style={{ fontSize: 28, fontWeight: "700", color: "#0f172a" }}>
        {boat.translation.name}
      </Text>
      <Text style={{ color: "#475569", lineHeight: 22 }}>{boat.translation.description}</Text>
      <Text style={{ color: "#64748b", fontSize: 13 }}>
        {boat.translation.startLocationLabel} → {boat.translation.endLocationLabel} · skipper
        included · OSM route on web
      </Text>
      <Text style={{ color: "#0f766e", fontSize: 13 }}>
        Use the web app for map + booking (Expo map wiring optional follow-up).
      </Text>
    </ScrollView>
  );
}

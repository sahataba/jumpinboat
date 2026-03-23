import type { BoatListingSummary } from "@jumpinboat/shared";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

import { getApiBaseUrl } from "../../lib/api-base";

const jb = {
  canvas: "#f8fafc",
  ink: "#0f172a",
  muted: "#64748b",
  teal700: "#0f766e",
  rose600: "#e11d48",
};

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
      <View style={{ flex: 1, backgroundColor: jb.canvas, padding: 24 }}>
        <Text style={{ color: jb.rose600 }}>{err}</Text>
        <Pressable onPress={() => router.back()}>
          <Text style={{ marginTop: 16, color: jb.teal700, fontWeight: "600" }}>Back</Text>
        </Pressable>
      </View>
    );
  }

  if (!boat) {
    return (
      <View style={{ flex: 1, backgroundColor: jb.canvas, padding: 48, alignItems: "center" }}>
        <ActivityIndicator color={jb.teal700} />
      </View>
    );
  }

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: jb.canvas }}
      contentContainerStyle={{ padding: 20, gap: 12, paddingBottom: 40 }}
    >
      <Pressable onPress={() => router.back()}>
        <Text style={{ color: jb.teal700, marginBottom: 8, fontWeight: "600" }}>← Back</Text>
      </Pressable>
      <Text style={{ fontSize: 28, fontWeight: "700", color: jb.ink }}>{boat.translation.name}</Text>
      <Text style={{ color: jb.muted, lineHeight: 22 }}>{boat.translation.description}</Text>
      <Text style={{ color: jb.muted, fontSize: 13 }}>
        {boat.translation.startLocationLabel} → {boat.translation.endLocationLabel} · licensed skipper
        included
      </Text>
      <Text style={{ color: jb.teal700, fontSize: 14, lineHeight: 22, marginTop: 4 }}>
        For the full route map and booking, open this listing on the JumpInBoat website.
      </Text>
    </ScrollView>
  );
}

import type { Booking } from "@jumpinboat/shared";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

import { getApiBaseUrl } from "../lib/api-base";
import { readPersistedAuthSession } from "../lib/auth";

const formatBookingStatus = (status: Booking["status"]) => {
  switch (status) {
    case "pending":
      return "Waiting for captain";
    case "confirmed":
      return "Confirmed";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return "Declined";
  }
};

const readApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export default function BookingsScreen() {
  const router = useRouter();
  const [items, setItems] = useState<ReadonlyArray<Booking> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [busyBookingId, setBusyBookingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setMessage("");
    const session = await readPersistedAuthSession();
    if (!session) {
      setError("Sign in to see your bookings.");
      setItems([]);
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/bookings/mine`, {
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      const data = (await response.json()) as { items: ReadonlyArray<Booking> };
      setItems(data.items);
      setError(null);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Could not load bookings.");
      setItems([]);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancelBooking = async (bookingId: string) => {
    setMessage("");
    setBusyBookingId(bookingId);
    const session = await readPersistedAuthSession();
    if (!session) {
      setError("Sign in to cancel bookings.");
      setBusyBookingId(null);
      return;
    }

    try {
      const response = await fetch(`${getApiBaseUrl()}/api/bookings/cancel`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.token}`,
        },
        body: JSON.stringify({ bookingId }),
      });
      if (!response.ok) {
        throw new Error(await readApiError(response));
      }
      setMessage("Booking cancelled.");
      await load();
    } catch (cancelError) {
      setMessage(cancelError instanceof Error ? cancelError.message : "Could not cancel booking.");
    } finally {
      setBusyBookingId(null);
    }
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <View style={styles.navRow}>
        <Pressable onPress={() => router.back()} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Back</Text>
        </Pressable>
        <Pressable onPress={() => void load()} style={styles.textButton}>
          <Text style={styles.textButtonLabel}>Refresh</Text>
        </Pressable>
      </View>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>My bookings</Text>
        <Text style={styles.title}>Your trip requests</Text>
        <Text style={styles.body}>
          Check the captain's response and cancel requests that are still pending or confirmed.
        </Text>
      </View>

      {error ? (
        <View style={styles.feedbackPanel}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable onPress={() => router.push("/auth")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Sign in</Text>
          </Pressable>
        </View>
      ) : null}

      {message ? <Text style={styles.successText}>{message}</Text> : null}

      {items === null ? (
        <View style={styles.loadingPanel}>
          <ActivityIndicator color={jb.teal700} />
          <Text style={styles.body}>Loading bookings...</Text>
        </View>
      ) : null}

      {items && items.length === 0 && !error ? (
        <View style={styles.feedbackPanel}>
          <Text style={styles.body}>No bookings yet.</Text>
          <Pressable onPress={() => router.push("/")} style={styles.primaryButton}>
            <Text style={styles.primaryButtonLabel}>Find trips</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.list}>
        {(items ?? []).map((booking) => {
          const canCancel = booking.status === "pending" || booking.status === "confirmed";
          const isBusy = busyBookingId === booking.id;

          return (
            <View key={booking.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardCopy}>
                  <Text style={styles.cardTitle}>{formatBookingStatus(booking.status)}</Text>
                  <Text style={styles.cardBody}>
                    {booking.passengerCount}{" "}
                    {booking.passengerCount === 1 ? "passenger" : "passengers"} ·{" "}
                    {booking.price.totalPrice.amount} {booking.price.totalPrice.currency}
                  </Text>
                  <Text style={styles.cardHint}>
                    Requested {new Date(booking.createdAt).toLocaleString()}
                  </Text>
                </View>
                <View style={styles.priceBadge}>
                  <Text style={styles.priceBadgeLabel}>Pay on arrival</Text>
                </View>
              </View>

              {canCancel ? (
                <Pressable
                  disabled={isBusy}
                  onPress={() => void cancelBooking(booking.id)}
                  style={[styles.cancelButton, isBusy ? styles.buttonDisabled : undefined]}
                >
                  <Text style={styles.cancelButtonLabel}>
                    {isBusy ? "Cancelling..." : "Cancel booking"}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          );
        })}
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
  cancelButton: {
    alignSelf: "flex-start",
    backgroundColor: jb.roseSoft,
    borderColor: "#fecdd3",
    borderRadius: 999,
    borderWidth: 1,
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  cancelButtonLabel: {
    color: jb.rose700,
    fontSize: 13,
    fontWeight: "800",
  },
  card: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 24,
    borderWidth: 1,
    padding: 18,
  },
  cardBody: {
    color: jb.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  cardCopy: {
    flex: 1,
    gap: 5,
  },
  cardHeader: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 12,
    justifyContent: "space-between",
  },
  cardHint: {
    color: "#94a3b8",
    fontSize: 12,
  },
  cardTitle: {
    color: jb.ink,
    fontSize: 18,
    fontWeight: "800",
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
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 18,
  },
  hero: {
    gap: 8,
  },
  list: {
    gap: 12,
  },
  loadingPanel: {
    alignItems: "center",
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    padding: 22,
  },
  navRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  priceBadge: {
    backgroundColor: jb.tealSoft,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  priceBadgeLabel: {
    color: jb.teal700,
    fontSize: 11,
    fontWeight: "800",
  },
  primaryButton: {
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: jb.ink,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 11,
  },
  primaryButtonLabel: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "800",
  },
  screen: {
    backgroundColor: jb.canvas,
    flex: 1,
  },
  successText: {
    backgroundColor: jb.tealSoft,
    borderRadius: 18,
    color: jb.teal700,
    fontSize: 14,
    fontWeight: "700",
    paddingHorizontal: 14,
    paddingVertical: 11,
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
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 39,
  },
});

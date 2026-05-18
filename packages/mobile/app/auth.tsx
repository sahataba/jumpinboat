import { useRouter } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import {
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
  persistAuthSession,
  readPersistedAuthSession,
  submitAuthForm,
  type AuthMode,
  type AuthSession,
} from "../lib/auth";

const emptyFeedback =
  "Create an account to request trips, add your boat, or sign in to continue.";

export default function AuthScreen() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [session, setSession] = useState<AuthSession | null>(null);
  const [feedback, setFeedback] = useState(emptyFeedback);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);
  const [canBook, setCanBook] = useState(true);
  const [canListBoats, setCanListBoats] = useState(false);

  useEffect(() => {
    void (async () => {
      setSession(await readPersistedAuthSession());
      setIsHydrated(true);
    })();
  }, []);

  const submitLabel = useMemo(
    () => (mode === "sign-up" ? "Create account" : "Sign in"),
    [mode],
  );

  const submit = async () => {
    if (mode === "sign-up" && !canBook && !canListBoats) {
      setFeedback("Choose at least one account use.");
      return;
    }

    setIsSubmitting(true);
    setFeedback("Working...");

    try {
      const nextSession = await submitAuthForm(mode, {
        email,
        password,
        rolePrimary: "owner",
        canBook,
        canListBoats,
      });
      await persistAuthSession(nextSession);
      setSession(nextSession);
      setPassword("");
      setFeedback(
        mode === "sign-up"
          ? "Account created. You're signed in on this device."
          : "You're signed in on this device.",
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "Authentication failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const signOut = async () => {
    await clearPersistedAuthSession();
    setSession(null);
    setFeedback("You're signed out.");
  };

  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Pressable onPress={() => router.back()} style={styles.textButton}>
        <Text style={styles.textButtonLabel}>Back</Text>
      </Pressable>

      <View style={styles.hero}>
        <Text style={styles.eyebrow}>JumpInBoat account</Text>
        <Text style={styles.title}>Sign in to keep trips moving</Text>
        <Text style={styles.body}>
          Request rides, check booking status, and use the same account when you add boat trips.
        </Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.segmented}>
          {([
            ["sign-up", "Create"],
            ["sign-in", "Sign in"],
          ] as const).map(([value, label]) => (
            <Pressable
              key={value}
              onPress={() => setMode(value)}
              style={[styles.segment, mode === value ? styles.segmentActive : undefined]}
            >
              <Text
                style={[
                  styles.segmentLabel,
                  mode === value ? styles.segmentLabelActive : undefined,
                ]}
              >
                {label}
              </Text>
            </Pressable>
          ))}
        </View>

        <TextInput
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={jb.subtle}
          style={styles.input}
          value={email}
        />
        <TextInput
          onChangeText={setPassword}
          placeholder="Password"
          placeholderTextColor={jb.subtle}
          secureTextEntry
          style={styles.input}
          value={password}
        />

        {mode === "sign-up" ? (
          <View style={styles.choicePanel}>
            <Text style={styles.choiceTitle}>What will you use JumpInBoat for?</Text>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Book boat trips</Text>
                <Text style={styles.toggleBody}>Request rides and manage your bookings.</Text>
              </View>
              <Switch
                value={canBook}
                onValueChange={setCanBook}
                trackColor={{ false: jb.border, true: jb.teal300 }}
              />
            </View>
            <View style={styles.toggleRow}>
              <View style={styles.toggleCopy}>
                <Text style={styles.toggleTitle}>Add boat trips</Text>
                <Text style={styles.toggleBody}>List trips and respond to traveler requests.</Text>
              </View>
              <Switch
                value={canListBoats}
                onValueChange={setCanListBoats}
                trackColor={{ false: jb.border, true: jb.amber200 }}
              />
            </View>
          </View>
        ) : null}

        <Pressable
          disabled={isSubmitting}
          onPress={() => void submit()}
          style={[styles.primaryButton, isSubmitting ? styles.buttonDisabled : undefined]}
        >
          <Text style={styles.primaryButtonLabel}>
            {isSubmitting ? "Working..." : submitLabel}
          </Text>
        </Pressable>

        <Text style={styles.feedback}>{feedback}</Text>
      </View>

      <View style={styles.panel}>
        <View style={styles.accountHeader}>
          <View>
            <Text style={styles.eyebrow}>Account</Text>
            <Text style={styles.accountTitle}>
              {!isHydrated ? "Checking..." : session ? "Signed in" : "Signed out"}
            </Text>
          </View>
          <Pressable
            disabled={!session}
            onPress={() => void signOut()}
            style={[styles.secondaryButton, !session ? styles.buttonDisabled : undefined]}
          >
            <Text style={styles.secondaryButtonLabel}>Sign out</Text>
          </Pressable>
        </View>

        {session ? (
          <View style={styles.accountDetails}>
            <Text style={styles.detailText}>{session.user.email}</Text>
            <Text style={styles.detailText}>
              Book trips: {session.user.canBook ? "Yes" : "No"}
            </Text>
            <Text style={styles.detailText}>
              Add boat trips: {session.user.canListBoats ? "Yes" : "No"}
            </Text>
            <View style={styles.linkRow}>
              <Pressable onPress={() => router.push("/bookings")} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>My bookings</Text>
              </Pressable>
              {session.user.canListBoats ? (
                <Pressable onPress={() => router.push("/owner/listings")} style={styles.textButton}>
                  <Text style={styles.textButtonLabel}>Owner trips</Text>
                </Pressable>
              ) : null}
              <Pressable onPress={() => router.push("/")} style={styles.textButton}>
                <Text style={styles.textButtonLabel}>Find trips</Text>
              </Pressable>
            </View>
          </View>
        ) : null}
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
  subtle: "#94a3b8",
  teal300: "#5eead4",
  teal700: "#0f766e",
};

const styles = StyleSheet.create({
  accountDetails: {
    gap: 8,
    marginTop: 16,
  },
  accountHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  accountTitle: {
    color: jb.ink,
    fontSize: 20,
    fontWeight: "700",
    marginTop: 4,
  },
  body: {
    color: jb.muted,
    fontSize: 16,
    lineHeight: 23,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  choicePanel: {
    backgroundColor: "#f1f5f9",
    borderColor: jb.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 14,
    padding: 16,
  },
  choiceTitle: {
    color: jb.ink,
    fontSize: 15,
    fontWeight: "700",
  },
  content: {
    gap: 18,
    padding: 20,
    paddingBottom: 44,
  },
  detailText: {
    color: jb.muted,
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
  feedback: {
    color: jb.teal700,
    fontSize: 14,
    lineHeight: 21,
  },
  hero: {
    gap: 10,
  },
  input: {
    backgroundColor: "#f8fafc",
    borderColor: jb.border,
    borderRadius: 18,
    borderWidth: 1,
    color: jb.ink,
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  linkRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 8,
  },
  panel: {
    backgroundColor: jb.panel,
    borderColor: jb.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
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
    fontWeight: "700",
  },
  screen: {
    backgroundColor: jb.canvas,
    flex: 1,
  },
  secondaryButton: {
    borderColor: jb.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  secondaryButtonLabel: {
    color: jb.ink,
    fontSize: 13,
    fontWeight: "700",
  },
  segment: {
    alignItems: "center",
    borderRadius: 999,
    flex: 1,
    paddingVertical: 11,
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
    fontSize: 14,
    fontWeight: "700",
  },
  segmentLabelActive: {
    color: "#ffffff",
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
    fontWeight: "700",
  },
  title: {
    color: jb.ink,
    fontSize: 34,
    fontWeight: "800",
    lineHeight: 39,
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
    flexDirection: "row",
    gap: 14,
    justifyContent: "space-between",
  },
  toggleTitle: {
    color: jb.ink,
    fontSize: 14,
    fontWeight: "700",
  },
});

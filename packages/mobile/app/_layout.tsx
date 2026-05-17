import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Jumpinboat" }} />
        <Stack.Screen name="boats/[boatId]" options={{ title: "Boat" }} />
        <Stack.Screen name="auth" options={{ title: "Account" }} />
        <Stack.Screen name="bookings" options={{ title: "My bookings" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}

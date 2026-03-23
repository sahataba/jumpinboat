import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";

export default function RootLayout() {
  return (
    <>
      <Stack>
        <Stack.Screen name="index" options={{ title: "Jumpinboat" }} />
        <Stack.Screen name="boats/[boatId]" options={{ title: "Boat" }} />
      </Stack>
      <StatusBar style="auto" />
    </>
  );
}


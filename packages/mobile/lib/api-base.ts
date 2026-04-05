import { Platform } from "react-native";

const devLoopback = () =>
  Platform.OS === "android" ? "http://10.0.2.2:3000" : "http://localhost:3000";

/**
 * Base URL for `/api/*` (same host as the Next.js app in production).
 * Set `EXPO_PUBLIC_API_URL` in EAS / `.env` for device builds; dev uses Metro machine loopback → Next on 3000.
 */
export const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return devLoopback();
};

import Constants from "expo-constants";
import { Platform } from "react-native";

const apiPort = "3000";

const getMetroHost = () => {
  const hostUri = Constants.expoConfig?.hostUri;
  if (!hostUri) {
    return null;
  }

  try {
    const withProtocol = hostUri.includes("://") ? hostUri : `http://${hostUri}`;
    return new URL(withProtocol).hostname;
  } catch {
    return hostUri.split("/")[0]?.split(":")[0] || null;
  }
};

const devLoopback = () =>
  Platform.OS === "android" ? `http://10.0.2.2:${apiPort}` : `http://localhost:${apiPort}`;

const devApiBaseUrl = () => {
  if (Platform.OS !== "web") {
    const metroHost = getMetroHost();
    if (metroHost && metroHost !== "localhost" && metroHost !== "127.0.0.1") {
      return `http://${metroHost}:${apiPort}`;
    }
  }

  return devLoopback();
};

/**
 * Base URL for `/api/*` (same host as the Next.js app in production).
 * Set `EXPO_PUBLIC_API_URL` in EAS / `.env` for deployed builds. In Expo dev,
 * native runtimes call Next on the same host that serves Metro.
 */
export const getApiBaseUrl = () => {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (typeof fromEnv === "string" && fromEnv.length > 0) {
    return fromEnv.replace(/\/$/, "");
  }
  return devApiBaseUrl();
};

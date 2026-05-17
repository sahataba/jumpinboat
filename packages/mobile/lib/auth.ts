import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

import type { AuthResponse, UserRolePrimary } from "@jumpinboat/shared";

import { getApiBaseUrl } from "./api-base";

export type AuthMode = "sign-in" | "sign-up";

export type AuthSession = {
  readonly token: string;
  readonly user: AuthResponse["user"];
};

export type AuthFormValues = {
  readonly email: string;
  readonly password: string;
  readonly rolePrimary: UserRolePrimary;
  readonly canBook: boolean;
  readonly canListBoats: boolean;
};

const SESSION_STORAGE_KEY = "jumpinboat.auth.session";
const SESSION_DIRECTORY = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}jumpinboat/`
  : null;
const SESSION_FILE_URI = SESSION_DIRECTORY
  ? `${SESSION_DIRECTORY}auth-session.json`
  : null;

let memorySession: AuthSession | null = null;

const getWebStorage = () => {
  if (
    Platform.OS !== "web" ||
    typeof window === "undefined" ||
    !("localStorage" in window)
  ) {
    return null;
  }
  return window.localStorage;
};

const parseErrorMessage = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

export const submitAuthForm = async (
  mode: AuthMode,
  values: AuthFormValues,
): Promise<AuthSession> => {
  const endpoint = mode === "sign-in" ? "/api/auth/sign-in" : "/api/auth/sign-up";
  const payload =
    mode === "sign-in"
      ? {
          email: values.email,
          password: values.password,
        }
      : {
          email: values.email,
          password: values.password,
          rolePrimary: values.rolePrimary,
          canBook: values.canBook,
          canListBoats: values.canListBoats,
        };

  const response = await fetch(`${getApiBaseUrl()}${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(await parseErrorMessage(response));
  }

  const authResponse = (await response.json()) as AuthResponse;
  return {
    token: authResponse.token,
    user: authResponse.user,
  };
};

export const persistAuthSession = async (session: AuthSession) => {
  memorySession = session;

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    return;
  }

  if (!SESSION_DIRECTORY || !SESSION_FILE_URI) {
    return;
  }

  await FileSystem.makeDirectoryAsync(SESSION_DIRECTORY, { intermediates: true });
  await FileSystem.writeAsStringAsync(SESSION_FILE_URI, JSON.stringify(session));
};

export const readPersistedAuthSession = async (): Promise<AuthSession | null> => {
  const webStorage = getWebStorage();
  if (webStorage) {
    const raw = webStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    try {
      memorySession = JSON.parse(raw) as AuthSession;
      return memorySession;
    } catch {
      webStorage.removeItem(SESSION_STORAGE_KEY);
      memorySession = null;
      return null;
    }
  }

  if (!SESSION_FILE_URI) {
    return memorySession;
  }

  try {
    const info = await FileSystem.getInfoAsync(SESSION_FILE_URI);
    if (!info.exists) {
      return memorySession;
    }
    const raw = await FileSystem.readAsStringAsync(SESSION_FILE_URI);
    memorySession = JSON.parse(raw) as AuthSession;
    return memorySession;
  } catch {
    await FileSystem.deleteAsync(SESSION_FILE_URI, { idempotent: true });
    memorySession = null;
    return null;
  }
};

export const clearPersistedAuthSession = async () => {
  memorySession = null;

  const webStorage = getWebStorage();
  if (webStorage) {
    webStorage.removeItem(SESSION_STORAGE_KEY);
    return;
  }

  if (SESSION_FILE_URI) {
    await FileSystem.deleteAsync(SESSION_FILE_URI, { idempotent: true });
  }
};

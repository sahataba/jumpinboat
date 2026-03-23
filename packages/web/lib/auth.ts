import type { AuthResponse, UserRolePrimary } from "@jumpinboat/shared";

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

  const response = await fetch(endpoint, {
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

export const persistAuthSession = (session: AuthSession) => {
  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
};

export const readPersistedAuthSession = (): AuthSession | null => {
  const raw = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
};

export const clearPersistedAuthSession = () => {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
};

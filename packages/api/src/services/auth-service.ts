import { randomUUID } from "node:crypto";

import argon2 from "argon2";
import { SignJWT, jwtVerify } from "jose";
import { Context, Effect, Layer } from "effect";

import type {
  AuthResponse,
  AuthTokenPayload,
  SignInRequest,
  SignUpRequest,
  User,
  UserRolePrimary,
} from "@jumpinboat/shared";

import { ApiError } from "../api-error.js";
import { UserRepository } from "../db/repositories/user-repository.js";

const jwtSecret = new TextEncoder().encode(
  process.env.JWT_SECRET ?? "jumpinboat-dev-secret",
);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isRolePrimary = (value: unknown): value is UserRolePrimary =>
  value === "owner" || value === "admin";

const isEmail = (value: string): boolean => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value);

const normalizeEmail = (email: string) => email.trim().toLowerCase();

const logUnexpectedAuthError = (context: string, error: unknown) => {
  if (error instanceof ApiError) {
    return;
  }

  const dbLikeError =
    typeof error === "object" && error !== null
      ? {
          code: "code" in error ? String(error.code) : undefined,
          detail: "detail" in error ? String(error.detail) : undefined,
          table: "table" in error ? String(error.table) : undefined,
          column: "column" in error ? String(error.column) : undefined,
          constraint: "constraint" in error ? String(error.constraint) : undefined,
        }
      : undefined;

  console.error(`[auth:${context}] unexpected error`, {
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
    db: dbLikeError,
  });
};

const parseSignUpRequest = (body: unknown): Effect.Effect<SignUpRequest, ApiError> =>
  Effect.try({
    try: () => {
      if (!isRecord(body)) {
        throw new ApiError(400, "Request body must be a JSON object");
      }

      const { email, password, rolePrimary, canBook, canListBoats } = body;

      if (typeof email !== "string" || !isEmail(email)) {
        throw new ApiError(422, "A valid email is required");
      }

      if (typeof password !== "string" || password.length < 8) {
        throw new ApiError(422, "Password must be at least 8 characters long");
      }

      if (typeof rolePrimary !== "undefined" && !isRolePrimary(rolePrimary)) {
        throw new ApiError(422, "rolePrimary must be 'owner' or 'admin'");
      }

      if (typeof canBook !== "undefined" && typeof canBook !== "boolean") {
        throw new ApiError(422, "canBook must be a boolean");
      }

      if (typeof canListBoats !== "undefined" && typeof canListBoats !== "boolean") {
        throw new ApiError(422, "canListBoats must be a boolean");
      }

      return {
        email,
        password,
        rolePrimary,
        canBook,
        canListBoats,
      };
    },
    catch: (error) =>
      error instanceof ApiError ? error : new ApiError(422, "Invalid sign up payload"),
  });

const parseSignInRequest = (body: unknown): Effect.Effect<SignInRequest, ApiError> =>
  Effect.try({
    try: () => {
      if (!isRecord(body)) {
        throw new ApiError(400, "Request body must be a JSON object");
      }

      const { email, password } = body;

      if (typeof email !== "string" || !isEmail(email)) {
        throw new ApiError(422, "A valid email is required");
      }

      if (typeof password !== "string" || password.length === 0) {
        throw new ApiError(422, "Password is required");
      }

      return {
        email,
        password,
      };
    },
    catch: (error) =>
      error instanceof ApiError ? error : new ApiError(422, "Invalid sign in payload"),
  });

const createToken = (user: User) =>
  Effect.tryPromise({
    try: async () => {
      const expiresInSeconds = 60 * 60 * 24 * 7;
      const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
      const payload: AuthTokenPayload = {
        sub: user.id,
        email: user.email,
        rolePrimary: user.rolePrimary,
        canBook: user.canBook,
        canListBoats: user.canListBoats,
        exp,
      };

      return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setSubject(user.id)
        .setIssuedAt()
        .setExpirationTime(exp)
        .sign(jwtSecret);
    },
    catch: () => new ApiError(500, "Could not issue auth token"),
  });

const toAuthResponse = (user: User): Effect.Effect<AuthResponse, ApiError> =>
  Effect.map(createToken(user), (token) => ({ token, user }));

const signUp = (input: SignUpRequest) => {
  const email = normalizeEmail(input.email);
  const canBook = input.canBook !== false;
  const canListBoats = input.canListBoats === true;

  return Effect.tryPromise({
    try: async () => {
      const existingUser = await UserRepository.findByEmail(email);

      if (existingUser) {
        throw new ApiError(409, "An account with this email already exists");
      }

      if (input.rolePrimary === "admin") {
        throw new ApiError(403, "Admin accounts cannot be created through sign up");
      }

      if (!canBook && !canListBoats) {
        throw new ApiError(422, "Select at least one of: book transport or list boats");
      }

      return UserRepository.create({
        id: randomUUID(),
        email,
        passwordHash: await argon2.hash(input.password),
        rolePrimary: "owner",
        canBook,
        canListBoats,
      });
    },
    catch: (error) => {
      logUnexpectedAuthError("sign-up", error);
      return error instanceof ApiError ? error : new ApiError(500, "Could not create account");
    },
  }).pipe(Effect.flatMap(toAuthResponse));
};

const signIn = (input: SignInRequest) => {
  const email = normalizeEmail(input.email);

  return Effect.tryPromise({
    try: async () => {
      const userRecord = await UserRepository.findRecordByEmail(email);

      if (!userRecord?.passwordHash) {
        throw new ApiError(401, "Invalid email or password");
      }

      const isValidPassword = await argon2.verify(userRecord.passwordHash, input.password);

      if (!isValidPassword) {
        throw new ApiError(401, "Invalid email or password");
      }

      return {
        id: userRecord.id as User["id"],
        email: userRecord.email,
        rolePrimary: userRecord.rolePrimary,
        canBook: userRecord.canBook,
        canListBoats: userRecord.canListBoats,
      } satisfies User;
    },
    catch: (error) => {
      logUnexpectedAuthError("sign-in", error);
      return error instanceof ApiError ? error : new ApiError(500, "Could not verify credentials");
    },
  }).pipe(Effect.flatMap(toAuthResponse));
};

const getCurrentUser = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const verified = await jwtVerify(token, jwtSecret);
      const payload = verified.payload as Partial<AuthTokenPayload>;

      if (typeof payload.sub !== "string" || typeof payload.email !== "string") {
        throw new ApiError(401, "Invalid or expired token");
      }

      if (
        typeof payload.rolePrimary === "string" &&
        !isRolePrimary(payload.rolePrimary)
      ) {
        throw new ApiError(401, "Invalid or expired token");
      }

      const user = await UserRepository.findByEmail(payload.email);

      if (!user || user.id !== payload.sub) {
        throw new ApiError(401, "Invalid or expired token");
      }

      return user;
    },
    catch: (error) => {
      logUnexpectedAuthError("get-current-user", error);
      return error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token");
    },
  });

export interface AuthServiceShape {
  readonly parseSignUpRequest: (body: unknown) => Effect.Effect<SignUpRequest, ApiError>;
  readonly parseSignInRequest: (body: unknown) => Effect.Effect<SignInRequest, ApiError>;
  readonly signUp: (input: SignUpRequest) => Effect.Effect<AuthResponse, ApiError>;
  readonly signIn: (input: SignInRequest) => Effect.Effect<AuthResponse, ApiError>;
  readonly getCurrentUser: (token: string) => Effect.Effect<User, ApiError>;
  readonly getBearerToken: (authorizationHeader?: string) => string | null;
}

export const AuthService = Context.GenericTag<AuthServiceShape>("AuthService");

export const AuthServiceLive = Layer.succeed(
  AuthService,
  AuthService.of({
    parseSignUpRequest,
    parseSignInRequest,
    signUp,
    signIn,
    getCurrentUser,
    getBearerToken: (authorizationHeader?: string) => {
      if (!authorizationHeader) {
        return null;
      }

      const [scheme, token] = authorizationHeader.split(" ");
      if (scheme !== "Bearer" || !token) {
        return null;
      }

      return token;
    },
  }),
);

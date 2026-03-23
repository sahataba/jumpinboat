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

const parseSignUpRequest = (body: unknown): Effect.Effect<SignUpRequest, ApiError> =>
  Effect.try({
    try: () => {
      if (!isRecord(body)) {
        throw new ApiError(400, "Request body must be a JSON object");
      }

      const { email, password, rolePrimary } = body;

      if (typeof email !== "string" || !isEmail(email)) {
        throw new ApiError(422, "A valid email is required");
      }

      if (typeof password !== "string" || password.length < 8) {
        throw new ApiError(422, "Password must be at least 8 characters long");
      }

      if (typeof rolePrimary !== "undefined" && !isRolePrimary(rolePrimary)) {
        throw new ApiError(422, "rolePrimary must be 'owner' or 'admin'");
      }

      return {
        email,
        password,
        rolePrimary,
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

  return Effect.tryPromise({
    try: async () => {
      const existingUser = await UserRepository.findByEmail(email);

      if (existingUser) {
        throw new ApiError(409, "An account with this email already exists");
      }

      if (input.rolePrimary === "admin") {
        throw new ApiError(403, "Admin accounts cannot be created through sign up");
      }

      return UserRepository.create({
        id: randomUUID(),
        email,
        passwordHash: await argon2.hash(input.password),
        rolePrimary: "owner",
      });
    },
    catch: (error) =>
      error instanceof ApiError ? error : new ApiError(500, "Could not create account"),
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
      } satisfies User;
    },
    catch: (error) =>
      error instanceof ApiError ? error : new ApiError(500, "Could not verify credentials"),
  }).pipe(Effect.flatMap(toAuthResponse));
};

const getCurrentUser = (token: string) =>
  Effect.tryPromise({
    try: async () => {
      const verified = await jwtVerify(token, jwtSecret);
      const payload = verified.payload as Partial<AuthTokenPayload>;

      if (
        typeof payload.sub !== "string" ||
        typeof payload.email !== "string" ||
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
    catch: (error) =>
      error instanceof ApiError ? error : new ApiError(401, "Invalid or expired token"),
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

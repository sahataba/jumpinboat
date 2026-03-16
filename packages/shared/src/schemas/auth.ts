import * as S from "@effect/schema/Schema";

export const UserRole = S.Literal("user", "admin");
export type UserRole = "user" | "admin";

export const UserId = S.String.pipe(S.brand("UserId"));
export type UserId = string & { readonly _brand: "UserId" };

export const User = S.Struct({
  id: UserId,
  email: S.String.pipe(S.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/)),
  role: UserRole
});

export interface User {
  id: UserId;
  email: string;
  role: UserRole;
}

export const AuthTokenPayload = S.Struct({
  sub: UserId,
  email: S.String,
  role: UserRole,
  exp: S.Number
});

export interface AuthTokenPayload {
  sub: UserId;
  email: string;
  role: UserRole;
  exp: number;
}


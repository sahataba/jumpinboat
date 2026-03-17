import * as S from "@effect/schema/Schema";

const Email = S.String.pipe(S.pattern(/^[^@\s]+@[^@\s]+\.[^@\s]+$/));

export const UserRolePrimary = S.Literal("owner", "admin");
export type UserRolePrimary = S.Schema.Type<typeof UserRolePrimary>;

export const UserId = S.String.pipe(S.brand("UserId"));
export type UserId = string & { readonly _brand: "UserId" };

export const User = S.Struct({
  id: UserId,
  email: Email,
  rolePrimary: UserRolePrimary,
});
export type User = S.Schema.Type<typeof User>;

export const SignUpRequest = S.Struct({
  email: Email,
  password: S.String.pipe(S.minLength(8)),
  rolePrimary: S.optional(UserRolePrimary),
});
export type SignUpRequest = S.Schema.Type<typeof SignUpRequest>;

export const SignInRequest = S.Struct({
  email: Email,
  password: S.String.pipe(S.minLength(1)),
});
export type SignInRequest = S.Schema.Type<typeof SignInRequest>;

export const AuthTokenPayload = S.Struct({
  sub: UserId,
  email: Email,
  rolePrimary: UserRolePrimary,
  exp: S.Number,
});
export type AuthTokenPayload = S.Schema.Type<typeof AuthTokenPayload>;

export const AuthResponse = S.Struct({
  token: S.String,
  user: User,
});
export type AuthResponse = S.Schema.Type<typeof AuthResponse>;

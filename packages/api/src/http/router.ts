import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import { Effect } from "effect";

import { ApiError } from "../api-error.js";
import { AuthService } from "../services/auth-service.js";
import { PublicBoatsService } from "../services/public-boats-service.js";
import { fromError, json, noContent, requireBearerToken, text } from "./response.js";

const parseRequestUrl = (request: HttpServerRequest.HttpServerRequest) =>
  new URL(request.url, "http://localhost");

const withErrorResponse = <A, E, R>(effect: Effect.Effect<A, E, R>) =>
  effect.pipe(Effect.catchAll((error) => fromError(error)));

const healthRoute = HttpRouter.empty.pipe(HttpRouter.get("/api/health", text(200, "ok")));

const optionsRoute = HttpRouter.empty.pipe(HttpRouter.options("*", noContent()));

const boatsSearchRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/boats/search",
    withErrorResponse(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const publicBoatsService = yield* PublicBoatsService;
      const filters = publicBoatsService.parseFilters(parseRequestUrl(request));
      const items = yield* publicBoatsService.search(filters);
      return yield* json(200, { items });
    }),
    ),
  ),
);

const signUpRoute = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/api/auth/sign-up",
    withErrorResponse(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const authService = yield* AuthService;
      const payload = yield* request.json.pipe(
        Effect.mapError(() => new ApiError(400, "Request body must be valid JSON")),
        Effect.flatMap(authService.parseSignUpRequest),
      );
      const authResponse = yield* authService.signUp(payload);
      return yield* json(201, authResponse);
    }),
    ),
  ),
);

const signInRoute = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/api/auth/sign-in",
    withErrorResponse(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const authService = yield* AuthService;
      const payload = yield* request.json.pipe(
        Effect.mapError(() => new ApiError(400, "Request body must be valid JSON")),
        Effect.flatMap(authService.parseSignInRequest),
      );
      const authResponse = yield* authService.signIn(payload);
      return yield* json(200, authResponse);
    }),
    ),
  ),
);

const meRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/auth/me",
    withErrorResponse(
    Effect.gen(function* () {
      const request = yield* HttpServerRequest.HttpServerRequest;
      const authService = yield* AuthService;
      const token = yield* requireBearerToken(
        authService.getBearerToken(request.headers.authorization),
      );
      const user = yield* authService.getCurrentUser(token);
      return yield* json(200, { user });
    }),
    ),
  ),
);

export const app = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoute),
  HttpRouter.concat(optionsRoute),
  HttpRouter.concat(boatsSearchRoute),
  HttpRouter.concat(signUpRoute),
  HttpRouter.concat(signInRoute),
  HttpRouter.concat(meRoute),
  HttpMiddleware.cors({
    allowedHeaders: ["Authorization", "Content-Type"],
    allowedMethods: ["GET", "POST", "OPTIONS"],
  }),
  HttpMiddleware.logger,
);

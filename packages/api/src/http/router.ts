import * as HttpMiddleware from "@effect/platform/HttpMiddleware";
import * as HttpRouter from "@effect/platform/HttpRouter";
import * as HttpServerRequest from "@effect/platform/HttpServerRequest";
import { Effect } from "effect";

import { ApiError } from "../api-error.js";
import { getBoatListingSummaryById, listDeparturesForBoat } from "../db/boat-queries.js";
import { AuthService } from "../services/auth-service.js";
import { BookingService } from "../services/booking-service.js";
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
      const items = yield* publicBoatsService.search(filters).pipe(
        Effect.mapError((e) => new ApiError(500, e.message)),
      );
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

const boatDetailRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/boats/detail",
    withErrorResponse(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const url = parseRequestUrl(request);
        const boatId = url.searchParams.get("boatId");
        if (!boatId) {
          return yield* Effect.fail(new ApiError(400, "boatId query parameter is required"));
        }
        const locale = url.searchParams.get("locale") === "hr" ? "hr" : "en";
        const boat = yield* Effect.tryPromise({
          try: () => getBoatListingSummaryById(boatId, locale),
          catch: (e) => new ApiError(500, String(e)),
        });
        if (!boat) {
          return yield* Effect.fail(new ApiError(404, "Boat not found"));
        }
        return yield* json(200, { boat });
      }),
    ),
  ),
);

const boatDeparturesRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/boats/departures",
    withErrorResponse(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const url = parseRequestUrl(request);
        const boatId = url.searchParams.get("boatId");
        if (!boatId) {
          return yield* Effect.fail(new ApiError(400, "boatId query parameter is required"));
        }
        const items = yield* Effect.tryPromise({
          try: () => listDeparturesForBoat(boatId),
          catch: (e) => new ApiError(500, String(e)),
        });
        return yield* json(200, {
          items: items.map((d) => ({
            ...d,
            departureTimeUtc: d.departureTimeUtc.toISOString(),
          })),
        });
      }),
    ),
  ),
);

const createBookingRoute = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/api/bookings",
    withErrorResponse(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const authService = yield* AuthService;
        const bookingService = yield* BookingService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.authorization),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canBook) {
          return yield* Effect.fail(new ApiError(403, "Account cannot book transport"));
        }
        const raw = yield* request.json.pipe(
          Effect.mapError(() => new ApiError(400, "Request body must be valid JSON")),
        );
        const payload = yield* bookingService.parseCreateBody(raw);
        const booking = yield* bookingService.createBooking(user.id, payload);
        return yield* json(201, { booking });
      }),
    ),
  ),
);

const listMyBookingsRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/bookings/mine",
    withErrorResponse(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const bookingService = yield* BookingService;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.authorization),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canBook) {
          return yield* Effect.fail(new ApiError(403, "Account cannot view bookings"));
        }
        const items = yield* bookingService.listMine(user.id);
        return yield* json(200, { items });
      }),
    ),
  ),
);

const listOwnerBookingsRoute = HttpRouter.empty.pipe(
  HttpRouter.get(
    "/api/bookings/owner",
    withErrorResponse(
      Effect.gen(function* () {
        const authService = yield* AuthService;
        const bookingService = yield* BookingService;
        const request = yield* HttpServerRequest.HttpServerRequest;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.authorization),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canListBoats) {
          return yield* Effect.fail(new ApiError(403, "Account cannot manage listings"));
        }
        const items = yield* bookingService.listOwnerIncoming(user.id);
        return yield* json(200, { items });
      }),
    ),
  ),
);

const ownerBookingStatusRoute = HttpRouter.empty.pipe(
  HttpRouter.patch(
    "/api/bookings/owner-status",
    withErrorResponse(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const authService = yield* AuthService;
        const bookingService = yield* BookingService;
        const token = yield* requireBearerToken(
          authService.getBearerToken(request.headers.authorization),
        );
        const user = yield* authService.getCurrentUser(token);
        if (!user.canListBoats) {
          return yield* Effect.fail(new ApiError(403, "Account cannot manage listings"));
        }
        const raw = yield* request.json.pipe(
          Effect.mapError(() => new ApiError(400, "Request body must be valid JSON")),
        );
        const body = raw as { bookingId?: string; status?: string };
        if (typeof body.bookingId !== "string" || body.bookingId.length === 0) {
          return yield* Effect.fail(new ApiError(422, "bookingId is required"));
        }
        if (body.status !== "confirmed" && body.status !== "declined") {
          return yield* Effect.fail(
            new ApiError(422, "status must be confirmed or declined"),
          );
        }
        yield* bookingService.setBookingStatus(user.id, body.bookingId, body.status);
        return yield* json(200, { ok: true });
      }),
    ),
  ),
);

const translateStubRoute = HttpRouter.empty.pipe(
  HttpRouter.post(
    "/api/translate",
    withErrorResponse(
      Effect.gen(function* () {
        const request = yield* HttpServerRequest.HttpServerRequest;
        const raw = yield* request.json.pipe(
          Effect.mapError(() => new ApiError(400, "Request body must be valid JSON")),
        );
        const body = raw as { text?: string; targetLocale?: string };
        const textIn = typeof body.text === "string" ? body.text : "";
        const target = body.targetLocale === "hr" ? "hr" : "en";
        /** Stub: real MVP would call DeepL, Google Translate, or an LLM. */
        const translated =
          target === "hr"
            ? `[HR stub] ${textIn}`
            : `[EN stub] ${textIn}`;
        return yield* json(200, { translated, targetLocale: target, engine: "stub" });
      }),
    ),
  ),
);

export const app = HttpRouter.empty.pipe(
  HttpRouter.concat(healthRoute),
  HttpRouter.concat(optionsRoute),
  HttpRouter.concat(boatsSearchRoute),
  HttpRouter.concat(boatDetailRoute),
  HttpRouter.concat(boatDeparturesRoute),
  HttpRouter.concat(signUpRoute),
  HttpRouter.concat(signInRoute),
  HttpRouter.concat(meRoute),
  HttpRouter.concat(createBookingRoute),
  HttpRouter.concat(listMyBookingsRoute),
  HttpRouter.concat(listOwnerBookingsRoute),
  HttpRouter.concat(ownerBookingStatusRoute),
  HttpRouter.concat(translateStubRoute),
  HttpMiddleware.cors({
    allowedHeaders: ["Authorization", "Content-Type"],
    allowedMethods: ["GET", "POST", "PATCH", "OPTIONS"],
  }),
  HttpMiddleware.logger,
);

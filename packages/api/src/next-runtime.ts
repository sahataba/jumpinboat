import { NodeContext } from "@effect/platform-node";
import { Effect, Layer, LogLevel, Logger } from "effect";

import {
  type ApiRequestTelemetryContext,
  withRequestTelemetry,
} from "./observability/telemetry.js";
import { AuthServiceLive } from "./services/auth-service.js";
import { BookingServiceLive } from "./services/booking-service.js";
import { PublicBoatsService } from "./services/public-boats-service.js";

/** Effect service stack for Next.js Route Handlers (`runApiEffect`). */
export const ApiRuntimeLayer = Layer.mergeAll(
  AuthServiceLive,
  BookingServiceLive,
  PublicBoatsService.Live,
  Logger.json,
  Logger.minimumLogLevel(
    process.env.NODE_ENV === "production" ? LogLevel.Info : LogLevel.Debug,
  ),
).pipe(Layer.provide(NodeContext.layer));

export const runApiEffect = <A, E>(
  effect: Effect.Effect<A, E, never>,
  telemetryContext?: ApiRequestTelemetryContext,
): Promise<A> =>
  Effect.runPromise(
    Effect.provide(
      telemetryContext ? withRequestTelemetry(effect, telemetryContext) : effect,
      ApiRuntimeLayer,
    ),
  );

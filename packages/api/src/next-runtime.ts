import { NodeContext } from "@effect/platform-node";
import { Effect, Layer } from "effect";

import { AuthServiceLive } from "./services/auth-service.js";
import { BookingServiceLive } from "./services/booking-service.js";
import { PublicBoatsService } from "./services/public-boats-service.js";

/** Effect service stack for Next.js Route Handlers (`runApiEffect`). */
export const ApiRuntimeLayer = Layer.mergeAll(
  AuthServiceLive,
  BookingServiceLive,
  PublicBoatsService.Live,
).pipe(Layer.provide(NodeContext.layer));

export const runApiEffect = <A, E>(effect: Effect.Effect<A, E, never>): Promise<A> =>
  Effect.runPromise(Effect.provide(effect, ApiRuntimeLayer));

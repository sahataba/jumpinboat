import { Effect, Metric } from "effect";

export type ApiRequestTelemetryContext = {
  readonly operation: string;
  readonly method?: string;
  readonly path?: string;
  readonly host?: string;
  readonly requestId?: string;
  readonly region?: string;
  readonly deploymentUrl?: string;
};

const apiRequestsTotal = Metric.counter("api_requests_total", {
  description: "Total number of API requests executed through the Effect runtime",
  incremental: true,
});

const apiRequestSuccessTotal = Metric.counter("api_request_success_total", {
  description: "Total number of successful API requests",
  incremental: true,
});

const apiRequestFailureTotal = Metric.counter("api_request_failure_total", {
  description: "Total number of failed API requests",
  incremental: true,
});

const apiRequestDuration = Metric.timer(
  "api_request_duration",
  "Duration of API requests executed through the Effect runtime",
);

const normalizeMetricTag = (value: string | undefined) =>
  value
    ?.trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "unknown";

const getMetricTags = (context: ApiRequestTelemetryContext) => ({
  operation: normalizeMetricTag(context.operation),
  method: normalizeMetricTag(context.method),
  region: normalizeMetricTag(context.region),
});

const getLogAnnotations = (context: ApiRequestTelemetryContext) => ({
  operation: context.operation,
  method: context.method,
  path: context.path,
  host: context.host,
  requestId: context.requestId,
  region: context.region,
  deploymentUrl: context.deploymentUrl,
});

const getSpanAttributes = (context: ApiRequestTelemetryContext): Record<string, unknown> => ({
  "app.operation": context.operation,
  ...(context.method ? { "http.request.method": context.method } : {}),
  ...(context.path ? { "url.path": context.path } : {}),
  ...(context.host ? { "server.address": context.host } : {}),
  ...(context.requestId ? { "request.id": context.requestId } : {}),
  ...(context.region ? { "vercel.region": context.region } : {}),
  ...(context.deploymentUrl ? { "vercel.deployment_url": context.deploymentUrl } : {}),
});

export const withRequestTelemetry = <A, E, R>(
  effect: Effect.Effect<A, E, R>,
  context: ApiRequestTelemetryContext,
): Effect.Effect<A, E, R> =>
  Effect.gen(function* () {
    yield* Metric.increment(apiRequestsTotal);
    return yield* effect;
  }).pipe(
    Effect.annotateLogs(getLogAnnotations(context)),
    Effect.annotateSpans(getSpanAttributes(context)),
    Effect.tagMetrics(getMetricTags(context)),
    Effect.withLogSpan(context.operation),
    Effect.withSpan(context.operation, {
      attributes: getSpanAttributes(context),
    }),
    Metric.trackDuration(apiRequestDuration),
    Effect.tap(() => Metric.increment(apiRequestSuccessTotal)),
    Effect.tapErrorCause(() => Metric.increment(apiRequestFailureTotal)),
  );

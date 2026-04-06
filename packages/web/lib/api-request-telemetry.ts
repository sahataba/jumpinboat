export function getApiRequestTelemetryContext(request: Request, operation: string) {
  const url = new URL(request.url);
  const requestId =
    request.headers.get("x-vercel-id") ??
    request.headers.get("x-request-id") ??
    undefined;

  return {
    operation,
    method: request.method,
    path: url.pathname,
    host: request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? undefined,
    requestId,
    region: process.env.VERCEL_REGION ?? requestId?.split("::", 1)[0],
    deploymentUrl: process.env.VERCEL_URL,
  };
}

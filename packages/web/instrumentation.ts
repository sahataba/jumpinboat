import { registerOTel } from "@vercel/otel";

type RequestLike = {
  readonly path?: string;
  readonly method?: string;
  readonly headers?: Headers;
};

type RequestErrorContext = {
  readonly routerKind?: string;
  readonly routePath?: string;
  readonly routeType?: string;
  readonly renderSource?: string;
  readonly revalidateReason?: string | null;
};

export function register() {
  registerOTel({
    serviceName: "jumpinboat-web",
  });
}

export async function onRequestError(
  error: unknown,
  request: RequestLike,
  context: RequestErrorContext,
) {
  console.error("[next:request-error]", {
    path: request.path,
    method: request.method,
    requestId:
      request.headers?.get("x-vercel-id") ??
      request.headers?.get("x-request-id") ??
      undefined,
    routerKind: context.routerKind,
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
    revalidateReason: context.revalidateReason,
    error:
      error instanceof Error
        ? {
            name: error.name,
            message: error.message,
            stack: error.stack,
          }
        : String(error),
  });
}

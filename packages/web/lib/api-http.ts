import { NextResponse } from "next/server";

import {
  ApiError,
  getErrorMessage,
  getErrorStatusCode,
} from "@jumpinboat/api/next-handlers";

import { corsHeaders } from "./cors-headers";

type ApiErrorContext = {
  readonly request?: Request;
  readonly context?: string;
};

export function jsonError(error: unknown, fallback = "Unexpected error") {
  return NextResponse.json(
    { error: getErrorMessage(error, fallback) },
    { status: getErrorStatusCode(error), headers: corsHeaders },
  );
}

export function jsonOk(body: unknown, status = 200) {
  return NextResponse.json(body, { status, headers: corsHeaders });
}

export function textOk(body: string, status = 200) {
  return new NextResponse(body, { status, headers: corsHeaders });
}

function logApiError(error: unknown, context?: ApiErrorContext) {
  const status = getErrorStatusCode(error);
  const requestUrl = context?.request ? new URL(context.request.url) : null;
  const logger = status >= 500 ? console.error : console.warn;

  logger("[api:error]", {
    context: context?.context,
    status,
    method: context?.request?.method,
    path: requestUrl?.pathname,
    requestId:
      context?.request?.headers.get("x-vercel-id") ??
      context?.request?.headers.get("x-request-id") ??
      undefined,
    error:
      error instanceof ApiError
        ? {
            name: error.name,
            message: error.message,
          }
        : error instanceof Error
          ? {
              name: error.name,
              message: error.message,
              stack: error.stack,
            }
          : {
              value: String(error),
            },
  });
}

export function catchApiError(e: unknown, context?: ApiErrorContext) {
  logApiError(e, context);
  return jsonError(e);
}

import { NextResponse } from "next/server";

import {
  getErrorMessage,
  getErrorStatusCode,
} from "@jumpinboat/api/next-handlers";

import { corsHeaders } from "./cors-headers";

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

export function catchApiError(e: unknown) {
  return jsonError(e);
}

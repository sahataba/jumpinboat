import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { corsHeaders } from "./lib/cors-headers";

export function middleware(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith("/api/") && request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: corsHeaders });
  }
}

export const config = {
  matcher: "/api/:path*",
};

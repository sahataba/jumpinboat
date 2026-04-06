import { ApiError, getBoatListingSummaryById } from "@jumpinboat/api/next-handlers";

import { catchApiError, jsonOk } from "../../../../lib/api-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const boatId = url.searchParams.get("boatId");
    if (!boatId) {
      return catchApiError(new ApiError(400, "boatId query parameter is required"), {
        request,
        context: "boats.detail",
      });
    }
    const locale = url.searchParams.get("locale") === "hr" ? "hr" : "en";
    const boat = await getBoatListingSummaryById(boatId, locale);
    if (!boat) {
      return catchApiError(new ApiError(404, "Boat not found"), {
        request,
        context: "boats.detail",
      });
    }
    return jsonOk({ boat }, 200);
  } catch (e) {
    return catchApiError(e instanceof Error ? e : new ApiError(500, String(e)), {
      request,
      context: "boats.detail",
    });
  }
}

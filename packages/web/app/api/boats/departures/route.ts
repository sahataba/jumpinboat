import { ApiError, listDeparturesForBoat } from "@jumpinboat/api/next-handlers";

import { catchApiError, jsonOk } from "../../../../lib/api-http";

export const runtime = "nodejs";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const boatId = url.searchParams.get("boatId");
    if (!boatId) {
      return catchApiError(new ApiError(400, "boatId query parameter is required"));
    }
    const items = await listDeparturesForBoat(boatId);
    return jsonOk(
      {
        items: items.map((d: (typeof items)[number]) => ({
          ...d,
          departureTimeUtc: d.departureTimeUtc.toISOString(),
        })),
      },
      200,
    );
  } catch (e) {
    return catchApiError(e instanceof Error ? e : new ApiError(500, String(e)));
  }
}

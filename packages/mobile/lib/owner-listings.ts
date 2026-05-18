import type {
  BoatDeparture,
  BoatListingDetail,
  BoatListingPayload,
  OwnerBoatListingSummary,
} from "@jumpinboat/shared";

import { getApiBaseUrl } from "./api-base";
import type { AuthSession } from "./auth";

export type OwnerListingRecord = {
  readonly boat: BoatListingDetail;
  readonly departures: ReadonlyArray<BoatDeparture>;
};

const readApiError = async (response: Response) => {
  try {
    const payload = (await response.json()) as { error?: string };
    return payload.error ?? `Request failed (${response.status})`;
  } catch {
    return `Request failed (${response.status})`;
  }
};

const authorizedJson = async <T>(
  session: AuthSession,
  path: string,
  init?: RequestInit,
): Promise<T> => {
  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${session.token}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  return (await response.json()) as T;
};

export const listOwnerListings = async (session: AuthSession) => {
  const data = await authorizedJson<{ items: ReadonlyArray<OwnerBoatListingSummary> }>(
    session,
    "/api/owner/listings",
  );
  return data.items;
};

export const getOwnerListing = (session: AuthSession, boatId: string) =>
  authorizedJson<OwnerListingRecord>(
    session,
    `/api/owner/listings/${encodeURIComponent(boatId)}`,
  );

export const saveOwnerListing = (
  session: AuthSession,
  boatId: string | null,
  listing: BoatListingPayload,
) =>
  authorizedJson<OwnerListingRecord>(
    session,
    boatId ? `/api/owner/listings/${encodeURIComponent(boatId)}` : "/api/owner/listings",
    {
      method: boatId ? "PUT" : "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(listing),
    },
  );

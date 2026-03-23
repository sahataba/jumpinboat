import { Cause } from "effect";

const LISTINGS_LOAD_MESSAGE =
  "We couldn't load listings. Check your connection and try again.";

/** Safe message for UI; logs full cause in development only. */
export function userFacingListLoadError(cause: Cause.Cause<unknown>): string {
  if (typeof process !== "undefined" && process.env.NODE_ENV === "development") {
    console.error("[JumpInBoat listings]", Cause.pretty(cause));
  }
  return LISTINGS_LOAD_MESSAGE;
}

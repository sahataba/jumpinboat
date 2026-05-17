import type { Booking } from "@jumpinboat/shared";

type BookingStatusAudience = "traveler" | "captain";

export const formatBookingStatus = (
  status: Booking["status"],
  audience: BookingStatusAudience = "traveler",
) => {
  switch (status) {
    case "pending":
      return audience === "captain" ? "Waiting" : "Waiting for captain";
    case "confirmed":
      return "Accepted";
    case "completed":
      return "Completed";
    case "cancelled":
      return "Cancelled";
    case "declined":
      return audience === "captain" ? "Declined" : "Not available";
  }
};

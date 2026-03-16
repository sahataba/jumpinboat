import * as S from "@effect/schema/Schema";
import {
  BoatId,
  DepartureId,
  BookingId,
  RouteId,
  Money,
} from "./listings.js";

export const BookingStatus = S.Literal(
  "pending",
  "confirmed",
  "completed",
  "cancelled",
  "declined"
);
export type BookingStatus = S.Schema.Type<typeof BookingStatus>;

export const BookingStopSelection = S.Struct({
  stopId: S.String,
  routeId: RouteId,
});
export type BookingStopSelection = S.Schema.Type<typeof BookingStopSelection>;

export const CreateBookingRequest = S.Struct({
  boatId: BoatId,
  departureId: DepartureId,
  passengerCount: S.Number,
  selectedStops: S.Array(BookingStopSelection),
  estimatedCargoWeightKg: S.optional(S.Number),
  estimatedCargoPackages: S.optional(S.Number),
});
export type CreateBookingRequest = S.Schema.Type<typeof CreateBookingRequest>;

export const BookingPriceBreakdown = S.Struct({
  baseTripPrice: Money,
  perStopTotalPrice: Money,
  cargoPriceTotal: S.optional(Money),
  totalPrice: Money,
});
export type BookingPriceBreakdown = S.Schema.Type<
  typeof BookingPriceBreakdown
>;

export const Booking = S.Struct({
  id: BookingId,
  boatId: BoatId,
  departureId: DepartureId,
  passengerCount: S.Number,
  selectedStops: S.Array(BookingStopSelection),
  status: BookingStatus,
  price: BookingPriceBreakdown,
  weatherRiskPercent: S.optional(S.Number),
  createdAt: S.String,
});
export type Booking = S.Schema.Type<typeof Booking>;

export const ListMyBookingsResponse = S.Struct({
  items: S.Array(Booking),
});
export type ListMyBookingsResponse = S.Schema.Type<
  typeof ListMyBookingsResponse
>;


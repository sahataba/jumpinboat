# Prioritised Backlog – JumpInBoat MVP

This backlog turns the MVP spec into buildable slices, ordered by dependency and value.

## Slice 1 – Auth & roles

- Implement user model and auth flows:
  - Email/password signup & signin.
  - JWT-based session handling.
  - Basic role handling: owner and admin, with booking available to any signed-in user.
- Wire minimal UI:
  - Web: sign in/sign up screens, route guards for owner dashboard and “My bookings”.
  - Mobile: sign in/sign up flow and protected stacks for owner and booking areas.

## Slice 2 – Listings (owner-side)

- Backend:
  - Implement CRUD for boats, routes, stops, and translations.
  - Implement departures (availability slots) per route.
  - Enforce capacity and cargo constraints at write-time where possible.
- Shared types:
  - Finalise and use listing schemas from `@jumpinboat/shared`.
- Web & mobile:
  - Owner dashboard: “My boats” list and “Add/Edit boat” flow using the designed UX, including:
    - Map-defined start/end/stops.
    - Capacity & cargo limits.
    - Base price per trip + optional per-stop pricing.
    - Basic departure creation.

## Slice 3 – Discovery & boat detail (customer-side)

- Backend:
  - Implement `/api/boats/search` using:
    - Route-based search (start/end).
    - “Near me” search using coordinates.
    - Filters (date, time, capacity, cargo, price).
  - Implement `/api/boats/:boatId` and `/api/boats/:boatId/departures`.
- Web & mobile:
  - Search screen (route & near-me).
  - Results list using `BoatListingSummary`.
  - Boat detail screen:
    - Route map with start, stops, end.
    - Pricing breakdown (per trip + per stop).
    - Capacity & cargo info.

## Slice 4 – Booking flow

- Backend:
  - Implement booking creation and validation against capacity/cargo limits.
  - Implement owner booking dashboard (list, accept/decline).
  - Implement customer “My bookings” and cancellation.
- Web & mobile:
  - Booking request flow from boat detail (select date/time, stops, passengers, cargo).
  - Owner bookings view with actions (accept/decline).
  - Customer “My bookings” list with cancel action.

## Slice 5 – Enhancements

- Weather integration:
  - Fetch per-departure forecast and compute cancellation risk.
  - Persist snapshot on departures and/or bookings.
- Notifications:
  - Email + WhatsApp (or initial subset) for booking events.
- Translations:
  - Auto-translation of listing content (EN/HR) in owner flows.

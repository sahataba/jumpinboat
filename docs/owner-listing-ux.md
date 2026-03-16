# Owner Listing UX – JumpInBoat MVP (Web & Mobile)

This document describes the owner-side UX for creating and managing boat listings, including **map-defined routes and stops**, **price per trip**, and **optional price per stop**, for both web and mobile apps.

## 1. Main screens

### 1.1 Web – Owner dashboard

- **Dashboard home**
  - Entry points:
    - “My boats” (list of existing listings).
    - “Add boat” (create flow).
    - “Bookings” (incoming requests).
- **My boats list**
  - Card or table per boat:
    - Name, start → …stops… → end (route summary).
    - Capacity (e.g. “6 pax, 800 kg total”).
    - Pricing summary (“€X per trip”, “from €Y per stop” when applicable).
    - Status: Active / Inactive.
    - Actions: Edit, Deactivate/Activate.

### 1.2 Web – Add / Edit boat flow

The form is split into logical sections with a vertical stepper or tabs:

1. **Basics**
   - Fields:
     - Listing name (EN/HR tabs).
     - Short description (EN/HR tabs).
     - “This service includes a professional skipper/captain” (informational text + required checkbox).
   - Photos:
     - Image upload with preview (minimum 1 photo).

2. **Route & stops (map)**
   - Map component using OSM:
     - Owner selects **start** and **end** by placing pins.
     - Owner can add **intermediate stops**:
       - Click “Add stop” → click on map → stop added to ordered list.
     - Ordered list under map:
       - Start (readonly from map).
       - Stops (draggable to reorder).
       - End (readonly from map).
   - Data captured:
     - `start` coordinate.
     - `end` coordinate.
     - Array of `stops` with coordinates and order index.

3. **Capacity & cargo**
   - Fields:
     - Maximum passengers (integer).
     - Allowed total boat load/weight (kg).
   - Cargo section:
     - Toggle: “Offer goods / food transport”.
     - If enabled:
       - Allowed goods (EN/HR text).
       - Maximum package count.
       - Maximum cargo weight (kg).
       - Price by weight (e.g. “€ per kg”).
   - Validation:
     - Cargo weight cannot exceed allowed total boat load.
     - Clear copy that combined passengers + cargo must stay within legal load.

4. **Pricing**
   - **Base price per trip**
     - Single numeric input with currency label (e.g. EUR).
   - **Per-stop pricing (optional)**
     - Toggle: “Offer boarding/disembarking at intermediate stops with per-stop pricing”.
     - If enabled:
       - Option A (default): **Uniform per-stop price**
         - Single input: “Price per stop”.
       - Option B: **Custom price per stop**
         - Table listing each stop:
           - Stop name/coordinate.
           - Input: “Price at this stop”.
     - UI shows a summary hint:
       - e.g. “Base: €80 per trip, per stop: €20 (uniform)” or
       - “Base: €80 per trip, per stop: from €15 (custom)”.

5. **Availability**
   - Simple first version:
     - Date picker or calendar to add **departures**:
       - Date.
       - Time-of-day (time picker).
     - List of future departures:
       - Date/time.
       - Optional overrides: max passengers, max cargo weight.
       - Status (Scheduled / Cancelled).
       - Actions: Edit, Cancel.

6. **Review & publish**
   - Summary step with:
     - Route map.
     - Capacity and cargo.
     - Pricing breakdown.
   - Button: “Publish listing”.

### 1.3 Mobile – Owner flow (Expo)

- **Owner home**
  - Tabs or sections:
    - “My boats”.
    - “Bookings”.
  - “Add boat” floating action button (FAB).
- **Add / Edit boat**
  - Same steps as web, optimized for vertical scroll:
    - Use stacked screens (e.g. `Basics → Route → Capacity & Cargo → Pricing → Availability → Review`).
  - Map interaction:
    - Full-screen map mode for picking start/end/stops.
  - Inputs mirror web fields but use mobile-friendly controls (pickers, segmented buttons).

## 2. Per-stop pricing UX details

- When per-stop pricing is enabled:
  - The **stops list** shows a price field alongside each stop (or a global uniform price).
  - A small explanation text under the section clarifies:
    - “Customers pay the base price for the full route plus any per-stop fees for boarding/disembarking at intermediate stops.”
- On save:
  - The backend receives:
    - `basePricePerTrip`.
    - `hasUniformPerStopPricing`.
    - `uniformPricePerStop` or array of `perStopPrice` values per stop.

## 3. Internationalisation in the listing form

- For text fields requiring translation (name, description, allowed goods, location labels):
  - Use **language tabs**: “EN” and “HR”.
  - Each tab shows the relevant inputs.
  - Optional button on each field group: “Auto-translate to [other language]”.
    - When clicked, fills the other language fields; owner can edit before saving.

## 4. How this maps to shared types & API

- **Create/Update listing request** (owner-side) will carry:
  - Basic metadata and translations.
  - Route geometry (start, end, stops).
  - Capacity & cargo limits.
  - Pricing model (base + per-stop).
  - Availability/departures, either inline or via separate endpoints.
- **Owner dashboard** screens consume:
  - `BoatListingSummary` for lists.
  - `BoatListingDetail` for edit/detail views.


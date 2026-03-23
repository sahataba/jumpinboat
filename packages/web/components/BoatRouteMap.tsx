"use client";

import type { BoatListingSummary } from "@jumpinboat/shared";
import L from "leaflet";
import { useEffect, useRef } from "react";

import "leaflet/dist/leaflet.css";

type Props = {
  readonly boat: BoatListingSummary;
};

export function BoatRouteMap({ boat }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || mapRef.current) {
      return;
    }

    const map = L.map(el);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      maxZoom: 19,
      attribution: "&copy; OpenStreetMap contributors",
    }).addTo(map);

    const coords = [
      boat.route.start,
      ...boat.route.stops.map((s) => s.coordinate),
      boat.route.end,
    ].map((c) => L.latLng(c.lat, c.lng));

    const poly = L.polyline(coords, { color: "#0d9488", weight: 4 }).addTo(map);
    map.fitBounds(poly.getBounds(), { padding: [48, 48] });

    coords.forEach((ll, i) => {
      const label =
        i === 0 ? "Start" : i === coords.length - 1 ? "End" : `Stop ${i}`;
      L.circleMarker(ll, { radius: 8, color: "#0f766e", fillColor: "#5eead4", fillOpacity: 0.9 })
        .addTo(map)
        .bindPopup(label);
    });

    mapRef.current = map;

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [boat]);

  return (
    <div
      ref={containerRef}
      className="h-[min(420px,55vh)] w-full overflow-hidden rounded-[28px] border border-slate-200 bg-slate-100 shadow-inner"
    />
  );
}

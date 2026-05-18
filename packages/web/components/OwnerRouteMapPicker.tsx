"use client";

import type { LayerGroup, LeafletMouseEvent, Map as LeafletMap } from "leaflet";
import { useEffect, useRef, useState } from "react";

type LeafletModule = typeof import("leaflet");

export type RouteCoordinate = {
  readonly lat: string;
  readonly lng: string;
};

type RoutePickerMode = "start" | "end" | "stop";

type RouteMapPoint = {
  readonly label: string;
  readonly lat: number;
  readonly lng: number;
  readonly kind: RoutePickerMode;
};

type OwnerRouteMapStop = {
  readonly lat: string;
  readonly lng: string;
};

type Props = {
  readonly endLat: string;
  readonly endLng: string;
  readonly onAddStop: (coordinate: RouteCoordinate) => void;
  readonly onSetEnd: (coordinate: RouteCoordinate) => void;
  readonly onSetStart: (coordinate: RouteCoordinate) => void;
  readonly startLat: string;
  readonly startLng: string;
  readonly stops: ReadonlyArray<OwnerRouteMapStop>;
};

const defaultMapCenter: [number, number] = [43.5081, 16.4402];

const formatMapCoordinate = (value: number) => value.toFixed(6);

const parseMapPoint = (
  label: string,
  kind: RoutePickerMode,
  latValue: string,
  lngValue: string,
): RouteMapPoint | null => {
  const lat = Number(latValue);
  const lng = Number(lngValue);

  if (
    !Number.isFinite(lat) ||
    !Number.isFinite(lng) ||
    Math.abs(lat) > 90 ||
    Math.abs(lng) > 180
  ) {
    return null;
  }

  return { label, kind, lat, lng };
};

const routeMapPointsFromProps = ({
  endLat,
  endLng,
  startLat,
  startLng,
  stops,
}: Pick<Props, "endLat" | "endLng" | "startLat" | "startLng" | "stops">) => {
  const points: RouteMapPoint[] = [];
  const start = parseMapPoint("Start", "start", startLat, startLng);
  if (start) {
    points.push(start);
  }

  stops.forEach((stop, index) => {
    const point = parseMapPoint(`Stop ${index + 1}`, "stop", stop.lat, stop.lng);
    if (point) {
      points.push(point);
    }
  });

  const end = parseMapPoint("Destination", "end", endLat, endLng);
  if (end) {
    points.push(end);
  }

  return points;
};

export function OwnerRouteMapPicker({
  endLat,
  endLng,
  onAddStop,
  onSetEnd,
  onSetStart,
  startLat,
  startLng,
  stops,
}: Props) {
  const [mode, setMode] = useState<RoutePickerMode>("start");
  const [mapReady, setMapReady] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const leafletRef = useRef<LeafletModule | null>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const routeLayerRef = useRef<LayerGroup | null>(null);

  useEffect(() => {
    let disposed = false;

    void import("leaflet").then((leaflet) => {
      const el = containerRef.current;
      if (disposed || !el || mapRef.current) {
        return;
      }

      const map = leaflet
        .map(el, {
          scrollWheelZoom: false,
        })
        .setView(defaultMapCenter, 8);

      leaflet
        .tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 19,
          attribution: "&copy; OpenStreetMap contributors",
        })
        .addTo(map);

      leafletRef.current = leaflet;
      mapRef.current = map;
      window.setTimeout(() => map.invalidateSize(), 0);
      setMapReady(true);
    });

    return () => {
      disposed = true;
      mapRef.current?.remove();
      mapRef.current = null;
      routeLayerRef.current = null;
      leafletRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!mapReady || !map) {
      return;
    }

    const handleClick = (event: LeafletMouseEvent) => {
      const coordinate = {
        lat: formatMapCoordinate(event.latlng.lat),
        lng: formatMapCoordinate(event.latlng.lng),
      };

      if (mode === "start") {
        onSetStart(coordinate);
        setMode("end");
        return;
      }

      if (mode === "end") {
        onSetEnd(coordinate);
        setMode("stop");
        return;
      }

      onAddStop(coordinate);
    };

    map.on("click", handleClick);

    return () => {
      map.off("click", handleClick);
    };
  }, [mapReady, mode, onAddStop, onSetEnd, onSetStart]);

  useEffect(() => {
    const leaflet = leafletRef.current;
    const map = mapRef.current;
    if (!mapReady || !leaflet || !map) {
      return;
    }

    if (routeLayerRef.current) {
      routeLayerRef.current.remove();
    }

    const layer = leaflet.layerGroup().addTo(map);
    const points = routeMapPointsFromProps({
      endLat,
      endLng,
      startLat,
      startLng,
      stops,
    });
    const latLngs = points.map((point) => leaflet.latLng(point.lat, point.lng));

    if (latLngs.length > 1) {
      leaflet
        .polyline(latLngs, {
          color: "#0d9488",
          opacity: 0.9,
          weight: 4,
        })
        .addTo(layer);
    }

    points.forEach((point) => {
      const color =
        point.kind === "start" ? "#0f766e" : point.kind === "end" ? "#b45309" : "#2563eb";
      const fillColor =
        point.kind === "start" ? "#5eead4" : point.kind === "end" ? "#fcd34d" : "#93c5fd";

      leaflet
        .circleMarker([point.lat, point.lng], {
          color,
          fillColor,
          fillOpacity: 0.9,
          radius: point.kind === "stop" ? 7 : 9,
          weight: 2,
        })
        .addTo(layer)
        .bindPopup(point.label);
    });

    if (latLngs.length === 1) {
      map.setView(latLngs[0], Math.max(map.getZoom(), 11));
    } else if (latLngs.length > 1) {
      map.fitBounds(leaflet.latLngBounds(latLngs), { padding: [44, 44] });
    }

    routeLayerRef.current = layer;
  }, [endLat, endLng, mapReady, startLat, startLng, stops]);

  return (
    <div className="rounded-[28px] border border-slate-200 bg-slate-50/70 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-950">Route map</p>
          <p className="text-xs text-slate-500">OpenStreetMap pins for this trip.</p>
        </div>
        <div className="flex rounded-full bg-white p-1 text-xs shadow-sm">
          {(["start", "end", "stop"] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-full px-3 py-1.5 font-medium capitalize ${
                mode === item ? "bg-slate-950 text-white" : "text-slate-600"
              }`}
              title={`Set ${item === "end" ? "destination" : item} pin`}
            >
              {item === "end" ? "Destination" : item}
            </button>
          ))}
        </div>
      </div>
      <div
        ref={containerRef}
        className="mt-4 h-[360px] w-full overflow-hidden rounded-[24px] border border-slate-200 bg-slate-100 shadow-inner"
      />
    </div>
  );
}

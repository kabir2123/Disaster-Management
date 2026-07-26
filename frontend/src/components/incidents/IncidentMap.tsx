"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { LocateFixed } from "lucide-react";
import L from "leaflet";
import { MapContainer, Marker, Popup, TileLayer, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";
import type { Incident } from "@/lib/types/models";
import { severityConfig, shortAge } from "@/lib/severity";

// Marker hues mirror the CSS severity tokens (--color-sev-*). They live here in
// JS because Leaflet draws markers imperatively, outside Tailwind's reach.
const SEV_HEX: Record<number, string> = {
  1: "#4c8dff",
  2: "#3fb950",
  3: "#d9a426",
  4: "#f0883e",
  5: "#f85149",
};

function hasCoords(i: Incident): i is Incident & { lat: number; lng: number } {
  return typeof i.lat === "number" && typeof i.lng === "number";
}

function markerIcon(severity: number, resolved: boolean): L.DivIcon {
  const hex = resolved ? "#5c6675" : SEV_HEX[severity] ?? "#8792a3";
  const size = 10 + severity * 1.5; // severity double-encoded: colour + size
  return L.divIcon({
    className: "",
    html: `<span style="display:block;width:${size}px;height:${size}px;border-radius:9999px;background:${hex};box-shadow:0 0 0 2px #0e1116, 0 0 6px ${hex}66;opacity:${resolved ? 0.5 : 1}"></span>`,
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

// "You are here" — deliberately neutral (white ring), never a severity colour,
// because the viewer is not an incident.
const ME_ICON = L.divIcon({
  className: "",
  html: `<span style="display:block;width:14px;height:14px;border-radius:9999px;background:#e6eaf0;box-shadow:0 0 0 3px #0e1116, 0 0 0 5px rgba(230,234,240,0.35)"></span>`,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    map.fitBounds(points, { padding: [36, 36], maxZoom: 13 });
  }, [points, map]);
  return null;
}

// A control that recenters on the viewer's real GPS position and marks it.
// It augments the incident-fit view rather than replacing it — a field
// responder who is actually in the district can see incidents around them.
function LocateControl({
  onLocate,
}: {
  onLocate: (pos: [number, number]) => void;
}) {
  const map = useMap();
  const [status, setStatus] = useState<"idle" | "locating" | "error">("idle");

  function locate() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setStatus("error");
      return;
    }
    setStatus("locating");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const here: [number, number] = [pos.coords.latitude, pos.coords.longitude];
        onLocate(here);
        map.setView(here, 14);
        setStatus("idle");
      },
      () => setStatus("error"),
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  return (
    <div className="absolute right-2 top-2 z-[1000] flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={locate}
        className="inline-flex items-center gap-1.5 rounded-md border border-line bg-surface px-2.5 py-1.5 text-xs text-fg shadow-lg shadow-black/40 hover:bg-raised"
      >
        <LocateFixed className="h-3.5 w-3.5" />
        {status === "locating" ? "Locating…" : "Locate me"}
      </button>
      {status === "error" && (
        <span className="rounded-md bg-surface px-2 py-1 text-[11px] text-muted shadow-lg shadow-black/40">
          Location unavailable
        </span>
      )}
    </div>
  );
}

export function IncidentMap({ incidents }: { incidents: Incident[] }) {
  const [me, setMe] = useState<[number, number] | null>(null);
  const plotted = useMemo(() => incidents.filter(hasCoords), [incidents]);
  const points = useMemo(
    () => plotted.map((i) => [i.lat, i.lng] as [number, number]),
    [plotted]
  );

  const center: [number, number] = points[0] ?? [10.0, 76.35];

  return (
    <div className="overflow-hidden rounded-md border border-line">
      <MapContainer
        center={center}
        zoom={11}
        style={{ height: "70vh", minHeight: 420, background: "#0e1116" }}
        scrollWheelZoom
      >
        <TileLayer
          url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          attribution='&copy; <a href="https://openstreetmap.org">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        />
        <FitBounds points={points} />
        <LocateControl onLocate={setMe} />
        {me && (
          <Marker position={me} icon={ME_ICON}>
            <Popup>
              <span className="text-[13px] font-medium text-fg">You are here</span>
            </Popup>
          </Marker>
        )}
        {plotted.map((incident) => {
          const config = severityConfig(incident.severity);
          const resolved = incident.status === "resolved";
          return (
            <Marker
              key={incident.incidentID}
              position={[incident.lat, incident.lng]}
              icon={markerIcon(incident.severity, resolved)}
            >
              <Popup>
                <div className="min-w-[10rem] space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`font-mono text-[11px] font-semibold ${config.text}`}>
                      {incident.severity}/5 {config.label}
                    </span>
                    <span className="font-mono text-[11px] text-faint">
                      {shortAge(incident.timestamp)}
                    </span>
                  </div>
                  <p className="text-[13px] font-medium text-fg">{incident.location}</p>
                  <Link
                    href={`/incidents/${incident.incidentID}`}
                    className="inline-block text-xs text-muted underline underline-offset-2 hover:text-fg"
                  >
                    Open report
                  </Link>
                </div>
              </Popup>
            </Marker>
          );
        })}
      </MapContainer>
    </div>
  );
}

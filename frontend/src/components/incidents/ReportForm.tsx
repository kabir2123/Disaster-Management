"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { MapPin, X } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { reportIncident } from "@/lib/api/incidents";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { SeveritySelector } from "./SeverityBadge";

export function ReportForm({ districtID }: { districtID: string }) {
  const router = useRouter();
  const [severity, setSeverity] = useState(3);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [geoStatus, setGeoStatus] = useState("");
  const [geoLoading, setGeoLoading] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function useMyLocation() {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      setGeoStatus("Location isn't available on this device — the address above is enough.");
      return;
    }
    setGeoLoading(true);
    setGeoStatus("");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCoords({
          lat: Number(pos.coords.latitude.toFixed(5)),
          lng: Number(pos.coords.longitude.toFixed(5)),
        });
        setGeoLoading(false);
      },
      () => {
        setGeoLoading(false);
        setGeoStatus("Couldn't get your location. Add the address and file anyway.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const incident = await reportIncident({
        severity,
        location,
        lat: coords?.lat,
        lng: coords?.lng,
        description,
        districtID,
      });
      router.push(`/incidents/${incident.incidentID}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't send the report. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card className="max-w-xl">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="space-y-2">
          <label className="block text-xs font-medium text-muted">
            How severe is it?
          </label>
          <SeveritySelector value={severity} onChange={setSeverity} />
        </div>

        {severity === 5 && (
          <AlertBanner
            severity={5}
            message="Severity 5 broadcasts an emergency alert to every responder in the district."
          />
        )}

        <div className="space-y-2">
          <Input
            label="Where is it?"
            placeholder="Town, landmark, or ward — e.g. Aluva, NH-544 flyover"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
          />
          {coords ? (
            <div className="flex items-center justify-between rounded-md border border-line bg-raised px-2.5 py-1.5">
              <span className="flex items-center gap-1.5 font-mono text-xs text-fg">
                <MapPin className="h-3.5 w-3.5 text-muted" />
                Pinned · {coords.lat}, {coords.lng}
              </span>
              <button
                type="button"
                onClick={() => setCoords(null)}
                className="flex items-center gap-1 text-xs text-muted hover:text-fg"
              >
                <X className="h-3.5 w-3.5" />
                Remove
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                loading={geoLoading}
                onClick={useMyLocation}
              >
                <MapPin className="h-3.5 w-3.5" />
                Use my location
              </Button>
              <span className="text-xs text-muted">
                Pins the report on the map for responders.
              </span>
            </div>
          )}
          {geoStatus && <p className="text-xs text-muted">{geoStatus}</p>}
        </div>

        <Textarea
          label="What's happening?"
          placeholder="Water depth, injuries, blocked roads, people stranded…"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && <Notice>{error}</Notice>}

        <div className="flex items-center gap-3">
          <Button type="submit" loading={loading}>
            Send report
          </Button>
          <p className="text-xs text-muted">
            You can add photos after it&apos;s filed.
          </p>
        </div>
      </form>
    </Card>
  );
}

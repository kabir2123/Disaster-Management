"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { useAuth } from "@/hooks/useAuth";
import { listIncidents } from "@/lib/api/incidents";
import type { Incident } from "@/lib/types/models";

export default function IncidentsPage() {
  const { claims } = useAuth();
  const searchParams = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[] | null>(null);
  const [error, setError] = useState("");

  const districtID = claims?.districtID ?? "";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const filteredIncidents = useMemo(() => {
    const items = incidents ?? [];
    if (!query) return items;
    return items.filter((incident) =>
      [
        incident.location,
        incident.description,
        incident.reporterName ?? "",
        incident.reporterID,
        incident.status,
        String(incident.severity),
        incident.assignedTo ?? "",
        incident.incidentID,
        ...(incident.evidenceFiles?.map((file) => file.key) ?? incident.evidenceKeys ?? []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [incidents, query]);

  useEffect(() => {
    if (!districtID) {
      return;
    }

    listIncidents(districtID)
      .then(setIncidents)
      .catch((err) => {
        setError(err.message ?? "Failed to load incidents");
        setIncidents([]);
      });
  }, [districtID]);

  return (
    <>
      <Header
        title="Incidents"
        subtitle={
          query
            ? `Search results for "${query}" in ${districtID}`
            : `All reported emergencies in ${districtID}`
        }
      />

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {incidents === null ? (
        <div className="py-16 text-center text-muted">Loading incidents…</div>
      ) : (
        <IncidentTable incidents={filteredIncidents} />
      )}
    </>
  );
}

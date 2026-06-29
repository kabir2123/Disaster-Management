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
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const districtID = claims?.districtID ?? "";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  const filteredIncidents = useMemo(() => {
    if (!query) return incidents;
    return incidents.filter((incident) =>
      [
        incident.location,
        incident.description,
        incident.status,
        String(incident.severity),
        incident.assignedTo ?? "",
        incident.incidentID,
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [incidents, query]);

  useEffect(() => {
    if (!districtID) return;

    listIncidents(districtID)
      .then(setIncidents)
      .catch((err) => setError(err.message ?? "Failed to load incidents"))
      .finally(() => setLoading(false));
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

      {loading ? (
        <div className="py-16 text-center text-muted">Loading incidents…</div>
      ) : (
        <IncidentTable incidents={filteredIncidents} />
      )}
    </>
  );
}

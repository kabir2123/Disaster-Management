"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { Inbox, List, Map as MapIcon, SearchX, ServerCrash } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  IncidentList,
  IncidentListSkeleton,
  sortIncidents,
} from "@/components/incidents/IncidentTable";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { canReportIncidents } from "@/lib/auth/roles";
import { listIncidents } from "@/lib/api/incidents";
import type { Incident } from "@/lib/types/models";

// Leaflet touches window, so the map is client-only and code-split.
const IncidentMap = dynamic(
  () => import("@/components/incidents/IncidentMap").then((m) => m.IncidentMap),
  {
    ssr: false,
    loading: () => (
      <div className="h-[70vh] min-h-[420px] animate-pulse rounded-md border border-line bg-surface" />
    ),
  }
);

type LoadState = "loading" | "ready" | "error";
type View = "list" | "map";

export default function IncidentsPage() {
  const { claims } = useAuth();
  const searchParams = useSearchParams();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [view, setView] = useState<View>("list");

  const districtID = claims?.districtID ?? "";
  const role = claims?.role ?? "citizen";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  function reload() {
    if (!districtID) return;
    setState("loading");
    listIncidents(districtID)
      .then((items) => {
        setIncidents(items);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtID]);

  const filtered = useMemo(() => {
    const sorted = sortIncidents(incidents);
    if (!query) return sorted;
    return sorted.filter((incident) =>
      [
        incident.location,
        incident.description,
        incident.reporterName ?? "",
        incident.reporterID,
        incident.status,
        String(incident.severity),
        incident.assignedTo ?? "",
        incident.incidentID,
        ...(incident.evidenceFiles?.map((file) => file.key) ??
          incident.evidenceKeys ??
          []),
      ]
        .join(" ")
        .toLowerCase()
        .includes(query)
    );
  }, [incidents, query]);

  const districtLabel = districtID.charAt(0).toUpperCase() + districtID.slice(1);
  const total = incidents.length;
  const unassigned = incidents.filter((i) => i.status === "open").length;
  const plottedCount = filtered.filter(
    (i) => typeof i.lat === "number" && typeof i.lng === "number"
  ).length;

  return (
    <>
      <Header
        title="Incidents"
        subtitle={
          query
            ? `${filtered.length} match “${query}” in ${districtLabel}`
            : state === "ready"
              ? `${total} reports · ${unassigned} unassigned · ${districtLabel}`
              : districtLabel
        }
        actions={
          canReportIncidents(role) ? (
            <Link href="/incidents/report">
              <Button size="md">New report</Button>
            </Link>
          ) : undefined
        }
      />

      {state === "loading" ? (
        <IncidentListSkeleton rows={14} />
      ) : state === "error" ? (
        <ErrorState
          icon={ServerCrash}
          title="Couldn't load incidents"
          message="The incident service didn't respond. This isn't an empty district — the request failed. Retry, or check the API connection."
          onRetry={reload}
        />
      ) : total === 0 ? (
        <EmptyState
          icon={Inbox}
          title="No reports in this district yet"
          description="Reports filed by citizens appear here the moment they're submitted, sorted worst first."
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={SearchX}
          title={`Nothing matches “${query}”`}
          description="Try a place name, a reporter, a status, or a severity number."
          action={
            <Link href="/incidents">
              <Button size="sm" variant="secondary">
                Clear search
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
              <ToggleButton active={view === "list"} onClick={() => setView("list")} icon={List}>
                List
              </ToggleButton>
              <ToggleButton active={view === "map"} onClick={() => setView("map")} icon={MapIcon}>
                Map
              </ToggleButton>
            </div>
            {view === "map" && (
              <span className="font-mono text-[11px] text-faint">
                {plottedCount} of {filtered.length} pinned
              </span>
            )}
          </div>
          {view === "list" ? (
            <IncidentList incidents={filtered} />
          ) : (
            <IncidentMap incidents={filtered} />
          )}
        </div>
      )}
    </>
  );
}

function ToggleButton({
  active,
  onClick,
  icon: Icon,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: typeof List;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs transition-colors",
        active ? "bg-raised text-fg" : "text-muted hover:text-fg"
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {children}
    </button>
  );
}

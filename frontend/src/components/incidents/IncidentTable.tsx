import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { EvidenceFile, Incident } from "@/lib/types/models";
import { severityConfig, shortAge } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";
import { Skeleton } from "@/components/ui/States";

// The incident board. A single surface with dividers — not 40 floating cards.
// The severity rail on the leading edge is the only colour in the product;
// scanning the board, the eye catches the red ticks and nothing competes.

// Default board order: worst on top. Escalated first, then by severity, then
// most recent. Resolved always sinks to the bottom.
const STATUS_WEIGHT: Record<string, number> = {
  escalated: 0,
  open: 1,
  assigned: 1,
  in_progress: 1,
  resolved: 2,
};

export function sortIncidents(incidents: Incident[]): Incident[] {
  return [...incidents].sort((a, b) => {
    const sw = (STATUS_WEIGHT[a.status] ?? 1) - (STATUS_WEIGHT[b.status] ?? 1);
    if (sw !== 0) return sw;
    if (a.severity !== b.severity) return b.severity - a.severity;
    return b.timestamp.localeCompare(a.timestamp);
  });
}

function evidenceCount(incident: Incident): number {
  const files: EvidenceFile[] =
    incident.evidenceFiles ??
    incident.evidenceKeys?.map((key) => ({ key })) ??
    [];
  return files.length;
}

// Shared column widths so the header lines up with every row.
const COL = {
  sev: "w-[3.75rem] shrink-0",
  reporter: "hidden lg:block w-32 shrink-0",
  evid: "hidden md:block w-12 shrink-0 text-center",
  status: "hidden sm:block w-24 shrink-0",
  age: "w-11 shrink-0 text-right",
  chevron: "hidden sm:block w-3.5 shrink-0",
};

function HeaderRow() {
  return (
    <div className="flex items-stretch bg-surface font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
      <span aria-hidden className="w-1 shrink-0" />
      <div className="flex flex-1 items-center gap-3 border-b border-line px-3 py-2">
        <span className={COL.sev}>Sev</span>
        <span className="min-w-0 flex-1">Location</span>
        <span className={COL.reporter}>Reporter</span>
        <span className={COL.evid}>Evid</span>
        <span className={COL.status}>Status</span>
        <span className={COL.age}>Age</span>
        <span className={COL.chevron} />
      </div>
    </div>
  );
}

function Row({ incident }: { incident: Incident }) {
  const config = severityConfig(incident.severity);
  const resolved = incident.status === "resolved";
  const count = evidenceCount(incident);

  return (
    <Link
      href={`/incidents/${incident.incidentID}`}
      className="group flex items-stretch outline-none transition-colors hover:bg-raised focus-visible:bg-raised"
    >
      {/* Severity rail — the signature. Drains to neutral when resolved. */}
      <span
        aria-hidden
        className={cn("w-1 shrink-0", resolved ? "bg-line" : config.bar)}
      />
      <div
        className={cn(
          "flex flex-1 items-center gap-3 border-b border-line px-3 py-2",
          resolved && "opacity-55"
        )}
      >
        <div className={COL.sev}>
          <SeverityBadge severity={incident.severity} compact />
        </div>

        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] font-medium text-fg">
            {incident.location}
          </p>
          {incident.description && (
            <p className="truncate text-xs text-muted">
              {incident.description}
            </p>
          )}
        </div>

        <div className={cn(COL.reporter, "truncate text-xs text-muted")}>
          {incident.reporterName || (
            <span className="text-faint">Unknown</span>
          )}
        </div>

        <div className={cn(COL.evid, "font-mono text-xs")}>
          {count > 0 ? (
            <span className="text-muted tabular-nums">{count}</span>
          ) : (
            <span className="text-faint">—</span>
          )}
        </div>

        <div className={COL.status}>
          <StatusBadge status={incident.status} />
        </div>

        <div className={cn(COL.age, "font-mono text-xs tabular-nums text-muted")}>
          {shortAge(incident.timestamp)}
        </div>

        <ChevronRight
          className={cn(
            COL.chevron,
            "h-3.5 text-faint transition-colors group-hover:text-muted"
          )}
        />
      </div>
    </Link>
  );
}

export function IncidentList({ incidents }: { incidents: Incident[] }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <HeaderRow />
      {incidents.map((incident) => (
        <Row key={incident.incidentID} incident={incident} />
      ))}
    </div>
  );
}

export function IncidentListSkeleton({ rows = 12 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <HeaderRow />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-stretch">
          <span aria-hidden className="w-1 shrink-0 bg-line" />
          <div className="flex flex-1 items-center gap-3 border-b border-line px-3 py-[0.6875rem]">
            <Skeleton className="h-4 w-12" />
            <div className="min-w-0 flex-1 space-y-1.5">
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-2.5 w-1/3" />
            </div>
            <Skeleton className="hidden h-3 w-20 lg:block" />
            <Skeleton className="hidden h-3 w-16 sm:block" />
            <Skeleton className="h-3 w-8" />
          </div>
        </div>
      ))}
    </div>
  );
}

"use client";

import Link from "next/link";
import type { Incident } from "@/lib/types/models";
import { SeverityBadge } from "./SeverityBadge";
import { StatusBadge } from "./StatusBadge";

interface IncidentTableProps {
  incidents: Incident[];
  showActions?: boolean;
}

export function IncidentTable({ incidents, showActions = true }: IncidentTableProps) {
  if (incidents.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
        <p className="text-muted font-medium">No incidents reported yet</p>
        <p className="text-sm text-muted/70 mt-1">
          Reports will appear here in real time
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[var(--card-shadow)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-6 py-4 font-bold text-muted">Location</th>
              <th className="px-6 py-4 font-bold text-muted">Severity</th>
              <th className="px-6 py-4 font-bold text-muted">Status</th>
              <th className="px-6 py-4 font-bold text-muted">Reported</th>
              <th className="px-6 py-4 font-bold text-muted">Assigned</th>
              {showActions && (
                <th className="px-6 py-4 font-bold text-muted">Actions</th>
              )}
            </tr>
          </thead>
          <tbody>
            {incidents.map((incident) => (
              <tr
                key={incident.incidentID}
                className="border-b border-border/50 hover:bg-primary-light/20 transition-colors"
              >
                <td className="px-6 py-4">
                  <p className="font-semibold text-foreground">{incident.location}</p>
                  {incident.description && (
                    <p className="text-xs text-muted mt-0.5 line-clamp-1">
                      {incident.description}
                    </p>
                  )}
                </td>
                <td className="px-6 py-4">
                  <SeverityBadge severity={incident.severity} />
                </td>
                <td className="px-6 py-4">
                  <StatusBadge status={incident.status} />
                </td>
                <td className="px-6 py-4 text-muted">
                  {new Date(incident.timestamp).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-muted font-mono text-xs">
                  {incident.assignedTo?.slice(0, 8) ?? "—"}
                </td>
                {showActions && (
                  <td className="px-6 py-4">
                    <Link
                      href={`/incidents/${incident.incidentID}`}
                      className="text-primary font-semibold hover:underline"
                    >
                      View
                    </Link>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

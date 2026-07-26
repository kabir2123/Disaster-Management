"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, ServerCrash } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AlertBanner } from "@/components/layout/AlertBanner";
import {
  IncidentList,
  IncidentListSkeleton,
  sortIncidents,
} from "@/components/incidents/IncidentTable";
import { StatStrip, type Stat } from "@/components/ui/StatStrip";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import {
  canListIncidents,
  canReportIncidents,
  canViewResources,
} from "@/lib/auth/roles";
import { listIncidents } from "@/lib/api/incidents";
import { listResources } from "@/lib/api/resources";
import type { Incident, Resource } from "@/lib/types/models";

type LoadState = "loading" | "ready" | "error";

export default function DashboardPage() {
  const { claims } = useAuth();
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [resources, setResources] = useState<Resource[]>([]);
  const [state, setState] = useState<LoadState>("loading");

  const districtID = claims?.districtID ?? "";
  const role = claims?.role ?? "citizen";
  const showIncidents = canListIncidents(role);
  const showResources = canViewResources(role);

  function reload() {
    if (!claims) return;
    setState("loading");
    const jobs: Promise<void>[] = [];
    let failed = false;

    if (showIncidents) {
      jobs.push(
        listIncidents(districtID)
          .then(setIncidents)
          .catch(() => {
            failed = true;
          })
      );
    }
    if (showResources) {
      jobs.push(
        listResources(districtID)
          .then(setResources)
          .catch(() => {
            failed = true;
          })
      );
    }

    Promise.all(jobs).then(() => setState(failed ? "error" : "ready"));
  }

  useEffect(() => {
    if (!claims) return;
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claims, districtID]);

  const openCount = incidents.filter(
    (i) => i.status === "open" || i.status === "assigned"
  ).length;
  const escalatedCount = incidents.filter((i) => i.status === "escalated").length;
  const criticalCount = incidents.filter(
    (i) => i.severity >= 4 && i.status !== "resolved"
  ).length;
  const resolvedCount = incidents.filter((i) => i.status === "resolved").length;
  const availableResources = resources.filter(
    (r) => r.availability === "available"
  ).length;

  const stats: Stat[] = [];
  if (showIncidents) {
    stats.push(
      { label: "Active", value: openCount },
      { label: "Escalated", value: escalatedCount, emphasis: escalatedCount > 0 },
      { label: "High severity", value: criticalCount, emphasis: criticalCount > 0 },
      { label: "Resolved", value: resolvedCount }
    );
  }
  if (showResources) {
    stats.push({ label: "Resources free", value: availableResources });
  }

  const districtLabel = districtID.charAt(0).toUpperCase() + districtID.slice(1);
  const loading = state === "loading";

  return (
    <>
      <Header
        title="Overview"
        subtitle={`${districtLabel} · live board`}
        actions={
          canReportIncidents(role) ? (
            <Link href="/incidents/report">
              <Button size="md">New report</Button>
            </Link>
          ) : undefined
        }
      />

      {!loading && escalatedCount > 0 && (
        <AlertBanner
          message={`${escalatedCount} report${escalatedCount > 1 ? "s" : ""} escalated — unresolved past 30 minutes. Assign now.`}
        />
      )}
      {!loading && escalatedCount === 0 && criticalCount > 0 && (
        <AlertBanner
          severity={5}
          message={`${criticalCount} high-severity report${criticalCount > 1 ? "s" : ""} open. Review before they escalate.`}
        />
      )}

      {stats.length > 0 && (
        <div className="mb-5">
          <StatStrip stats={stats} loading={loading} />
        </div>
      )}

      {showIncidents && (
        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
              Latest reports
            </h2>
            <Link
              href="/incidents"
              className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
            >
              View all
            </Link>
          </div>

          {state === "loading" ? (
            <IncidentListSkeleton rows={8} />
          ) : state === "error" ? (
            <ErrorState
              icon={ServerCrash}
              title="Couldn't load the board"
              message="The incident service didn't respond. This isn't an empty district — something failed. Retry, or check the API connection."
              onRetry={reload}
            />
          ) : incidents.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No reports in this district yet"
              description="When a citizen files a report, it lands here — worst first. Nothing needs your attention right now."
            />
          ) : (
            <IncidentList incidents={sortIncidents(incidents).slice(0, 10)} />
          )}
        </section>
      )}
    </>
  );
}

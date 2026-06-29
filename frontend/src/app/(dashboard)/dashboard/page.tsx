"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Truck,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { IncidentTable } from "@/components/incidents/IncidentTable";
import { StatCard } from "@/components/ui/StatCard";
import { useAuth } from "@/hooks/useAuth";
import { canListIncidents, canViewResources } from "@/lib/auth/roles";
import { listIncidents } from "@/lib/api/incidents";
import { listResources } from "@/lib/api/resources";
import type { Incident, Resource } from "@/lib/types/models";

export default function DashboardPage() {
	const { claims } = useAuth();
	const [incidents, setIncidents] = useState<Incident[]>([]);
	const [resources, setResources] = useState<Resource[]>([]);
	const [dataLoading, setDataLoading] = useState(false);

	const districtID = claims?.districtID ?? "";
	const loading = claims ? dataLoading : false;

	useEffect(() => {
		if (!claims) return;
		const role = claims.role;

		async function load() {
			setDataLoading(true);
			try {
				const promises: Promise<void>[] = [];

        if (canListIncidents(role)) {
          promises.push(
            listIncidents(districtID).then(setIncidents).catch(() => setIncidents([]))
          );
        }

        if (canViewResources(role)) {
          promises.push(
            listResources(districtID).then(setResources).catch(() => setResources([]))
          );
        }

				await Promise.all(promises);
			} finally {
				setDataLoading(false);
			}
		}

    load();
  }, [claims, districtID]);

  const openCount = incidents.filter(
    (i) => i.status === "open" || i.status === "assigned"
  ).length;
  const criticalCount = incidents.filter((i) => i.severity >= 4).length;
  const escalatedCount = incidents.filter((i) => i.status === "escalated").length;
  const availableResources = resources.filter(
    (r) => r.availability === "available"
  ).length;

  return (
    <>
      <Header
        title="Command Overview"
        subtitle={`District ${districtID} — real-time emergency coordination`}
      />

      {escalatedCount > 0 && (
        <AlertBanner
          level="critical"
          message={`${escalatedCount} incident(s) escalated — unresolved for 30+ minutes`}
        />
      )}

      {criticalCount > 0 && escalatedCount === 0 && (
        <AlertBanner
          message={`${criticalCount} high-severity incident(s) require immediate attention`}
        />
      )}

      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-4 mb-8">
        {canListIncidents(claims?.role ?? "citizen") && (
          <>
            <StatCard
              label="Active Incidents"
              value={loading ? "—" : openCount}
              icon={AlertTriangle}
              accent="alert"
            />
            <StatCard
              label="Escalated"
              value={loading ? "—" : escalatedCount}
              icon={Clock}
              accent="danger"
            />
            <StatCard
              label="Resolved"
              value={
                loading
                  ? "—"
                  : incidents.filter((i) => i.status === "resolved").length
              }
              icon={CheckCircle2}
              accent="success"
            />
          </>
        )}
        {canViewResources(claims?.role ?? "citizen") && (
          <StatCard
            label="Available Resources"
            value={loading ? "—" : availableResources}
            icon={Truck}
            accent="primary"
          />
        )}
      </div>

      {canListIncidents(claims?.role ?? "citizen") && (
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">
            Recent Incidents
          </h2>
          {loading ? (
            <div className="py-12 text-center text-muted">Loading…</div>
          ) : (
            <IncidentTable incidents={incidents.slice(0, 8)} />
          )}
        </section>
      )}

      {claims?.role === "citizen" && (
        <section className="mt-8 rounded-2xl bg-primary-light/40 border border-primary/20 p-8 text-center">
          <h2 className="text-xl font-bold text-foreground">
            Need to report an emergency?
          </h2>
          <p className="mt-2 text-muted">
            Use the Report tab to submit incidents in your district
          </p>
        </section>
      )}
    </>
  );
}

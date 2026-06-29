"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/Header";
import { ResourceTable } from "@/components/resources/ResourceTable";
import { useAuth } from "@/hooks/useAuth";
import { canManageResources } from "@/lib/auth/roles";
import { listResources, updateResourceStatus } from "@/lib/api/resources";
import type { Resource, ResourceAvailability } from "@/lib/types/models";

export default function ResourcesPage() {
  const { claims } = useAuth();
  const districtID = claims?.districtID ?? "";
  const [resources, setResources] = useState<Resource[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!districtID) return;

    listResources(districtID)
      .then(setResources)
      .catch((err) => setError(err.message ?? "Failed to load resources"))
      .finally(() => setLoading(false));
  }, [districtID]);

  async function handleStatusChange(
    resourceID: string,
    availability: ResourceAvailability
  ) {
    try {
      const updated = await updateResourceStatus(
        districtID,
        resourceID,
        availability
      );
      setResources((prev) =>
        prev.map((r) => (r.resourceID === resourceID ? updated : r))
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  return (
    <>
      <Header
        title="Resources"
        subtitle={`Relief assets and capacity in ${districtID}`}
      />

      {error && (
        <p className="mb-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}

      {loading ? (
        <div className="py-16 text-center text-muted">Loading resources…</div>
      ) : (
        <ResourceTable
          resources={resources}
          canEdit={canManageResources(claims?.role ?? "citizen")}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}

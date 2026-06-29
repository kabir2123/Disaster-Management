"use client";

import type { Resource, ResourceAvailability } from "@/lib/types/models";
import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const AVAILABILITY_CONFIG: Record<
  ResourceAvailability,
  { label: string; variant: "success" | "warning" | "danger" | "muted" | "default" }
> = {
  available: { label: "Available", variant: "success" },
  assigned: { label: "Assigned", variant: "default" },
  depleted: { label: "Depleted", variant: "warning" },
  offline: { label: "Offline", variant: "muted" },
};

interface ResourceTableProps {
  resources: Resource[];
  canEdit?: boolean;
  onStatusChange?: (resourceID: string, status: ResourceAvailability) => void;
}

export function ResourceTable({
  resources,
  canEdit,
  onStatusChange,
}: ResourceTableProps) {
  if (resources.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border bg-surface/50 py-16 text-center">
        <p className="text-muted font-medium">No resources registered</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60 bg-surface shadow-[var(--card-shadow)]">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border bg-background/50">
              <th className="px-6 py-4 font-bold text-muted">Type</th>
              <th className="px-6 py-4 font-bold text-muted">Capacity</th>
              <th className="px-6 py-4 font-bold text-muted">Status</th>
              <th className="px-6 py-4 font-bold text-muted">Coordinator</th>
              {canEdit && (
                <th className="px-6 py-4 font-bold text-muted">Update</th>
              )}
            </tr>
          </thead>
          <tbody>
            {resources.map((resource) => {
              const config =
                AVAILABILITY_CONFIG[resource.availability] ??
                AVAILABILITY_CONFIG.available;

              return (
                <tr
                  key={resource.resourceID}
                  className="border-b border-border/50 hover:bg-primary-light/20 transition-colors"
                >
                  <td className="px-6 py-4 font-semibold capitalize">
                    {resource.type}
                  </td>
                  <td className="px-6 py-4">{resource.capacity}</td>
                  <td className="px-6 py-4">
                    <Badge variant={config.variant}>{config.label}</Badge>
                  </td>
                  <td className="px-6 py-4 font-mono text-xs text-muted">
                    {resource.coordinatorID.slice(0, 8)}…
                  </td>
                  {canEdit && onStatusChange && (
                    <td className="px-6 py-4">
                      <select
                        value={resource.availability}
                        onChange={(e) =>
                          onStatusChange(
                            resource.resourceID,
                            e.target.value as ResourceAvailability
                          )
                        }
                        className={cn(
                          "rounded-lg border border-border bg-surface px-3 py-1.5 text-xs font-semibold",
                          "focus:border-primary focus:outline-none"
                        )}
                      >
                        {Object.entries(AVAILABILITY_CONFIG).map(([value, cfg]) => (
                          <option key={value} value={value}>
                            {cfg.label}
                          </option>
                        ))}
                      </select>
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

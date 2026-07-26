"use client";

import type { Resource, ResourceAvailability } from "@/lib/types/models";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/States";
import { cn } from "@/lib/utils";

// Resources carry no severity, so they carry no colour. Availability is shown
// by neutral emphasis and a plain-language label.
const AVAILABILITY: Record<
  ResourceAvailability,
  { label: string; tone: "default" | "strong" | "faint" | "outline" }
> = {
  available: { label: "Available", tone: "strong" },
  assigned: { label: "Assigned", tone: "default" },
  depleted: { label: "Depleted", tone: "default" },
  offline: { label: "Offline", tone: "faint" },
};

const COL = {
  type: "w-40 shrink-0",
  capacity: "hidden sm:block w-24 shrink-0 text-right",
  status: "w-28 shrink-0",
  coordinator: "hidden lg:block w-40 shrink-0",
};

function typeLabel(type: string): string {
  return type.replace(/_/g, " ");
}

function HeaderRow({ canEdit }: { canEdit?: boolean }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-wider text-muted">
      <span className={COL.type}>Type</span>
      <span className={COL.capacity}>Capacity</span>
      <span className={COL.status}>Status</span>
      <span className={cn(COL.coordinator, "flex-1")}>Coordinator</span>
      {canEdit && <span className="w-32 shrink-0 text-right">Update</span>}
    </div>
  );
}

interface ResourceTableProps {
  resources: Resource[];
  canEdit?: boolean;
  onStatusChange?: (resourceID: string, status: ResourceAvailability) => void;
}

export function ResourceTable({ resources, canEdit, onStatusChange }: ResourceTableProps) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <HeaderRow canEdit={canEdit} />
      {resources.map((resource) => {
        const config = AVAILABILITY[resource.availability] ?? AVAILABILITY.available;
        return (
          <div
            key={resource.resourceID}
            className="flex items-center gap-3 border-b border-line px-3 py-2.5 last:border-b-0"
          >
            <span className={cn(COL.type, "truncate text-[13px] font-medium capitalize text-fg")}>
              {typeLabel(resource.type)}
            </span>
            <span className={cn(COL.capacity, "font-mono text-xs tabular-nums text-muted")}>
              {resource.capacity.toLocaleString("en-IN")}
            </span>
            <span className={COL.status}>
              <Badge tone={config.tone}>{config.label}</Badge>
            </span>
            <span className={cn(COL.coordinator, "flex-1 truncate font-mono text-xs text-faint")}>
              {resource.coordinatorID.slice(0, 12)}…
            </span>
            {canEdit && onStatusChange && (
              <div className="w-32 shrink-0 text-right">
                <select
                  aria-label={`Set availability for ${typeLabel(resource.type)}`}
                  value={resource.availability}
                  onChange={(e) =>
                    onStatusChange(resource.resourceID, e.target.value as ResourceAvailability)
                  }
                  className="rounded-md border border-line bg-raised px-2 py-1 text-xs text-fg focus:border-muted focus:outline-none"
                >
                  {Object.entries(AVAILABILITY).map(([value, cfg]) => (
                    <option key={value} value={value} className="bg-surface">
                      {cfg.label}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function ResourceListSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="overflow-hidden rounded-md border border-line bg-surface">
      <HeaderRow />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 border-b border-line px-3 py-3 last:border-b-0">
          <Skeleton className="h-3.5 w-28" />
          <Skeleton className="hidden h-3 w-16 sm:block" />
          <Skeleton className="h-4 w-20" />
          <Skeleton className="hidden h-3 w-32 lg:block" />
        </div>
      ))}
    </div>
  );
}

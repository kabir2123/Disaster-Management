import { Badge } from "@/components/ui/Badge";
import type { IncidentStatus } from "@/lib/types/models";

const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; variant: "default" | "success" | "warning" | "danger" | "info" | "muted" }
> = {
  open: { label: "Open", variant: "info" },
  assigned: { label: "Assigned", variant: "default" },
  in_progress: { label: "In Progress", variant: "warning" },
  resolved: { label: "Resolved", variant: "success" },
  escalated: { label: "Escalated", variant: "danger" },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, variant: "muted" as const };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

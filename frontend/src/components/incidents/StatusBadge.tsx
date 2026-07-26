import { Badge } from "@/components/ui/Badge";
import type { IncidentStatus } from "@/lib/types/models";

// Status is neutral typography — no hue. Emphasis (strong vs. muted vs. faint)
// carries the meaning: escalated reads loudest, resolved fades back.
const STATUS_CONFIG: Record<
  IncidentStatus,
  { label: string; tone: "default" | "strong" | "faint" | "outline" }
> = {
  open: { label: "Open", tone: "outline" },
  assigned: { label: "Assigned", tone: "default" },
  in_progress: { label: "In progress", tone: "default" },
  escalated: { label: "Escalated", tone: "strong" },
  resolved: { label: "Resolved", tone: "faint" },
};

export function StatusBadge({ status }: { status: IncidentStatus }) {
  const config = STATUS_CONFIG[status] ?? { label: status, tone: "default" as const };
  return <Badge tone={config.tone}>{config.label}</Badge>;
}

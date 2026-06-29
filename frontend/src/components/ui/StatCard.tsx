import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  accent?: "primary" | "success" | "warning" | "danger" | "alert";
}

const accentStyles = {
  primary: "bg-primary-light text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
  danger: "bg-danger/15 text-danger",
  alert: "bg-alert/15 text-alert",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-surface border border-border/60 p-6 shadow-[var(--card-shadow)]">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{label}</p>
          <p className="mt-2 text-3xl font-bold text-foreground">{value}</p>
          {trend && (
            <p className="mt-2 text-xs font-semibold text-success">{trend}</p>
          )}
        </div>
        <div
          className={cn(
            "flex h-14 w-14 items-center justify-center rounded-2xl",
            accentStyles[accent]
          )}
        >
          <Icon className="h-7 w-7" />
        </div>
      </div>
    </div>
  );
}

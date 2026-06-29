import { Badge } from "@/components/ui/Badge";
import { cn } from "@/lib/utils";

const SEVERITY_CONFIG: Record<
  number,
  { label: string; variant: "success" | "info" | "warning" | "danger" | "default"; ring: string }
> = {
  1: { label: "Low", variant: "success", ring: "ring-success/30" },
  2: { label: "Moderate", variant: "info", ring: "ring-info/30" },
  3: { label: "Elevated", variant: "warning", ring: "ring-warning/30" },
  4: { label: "High", variant: "danger", ring: "ring-danger/30" },
  5: { label: "Critical", variant: "danger", ring: "ring-danger/50" },
};

export function SeverityBadge({ severity }: { severity: number }) {
  const config =
    SEVERITY_CONFIG[severity] ?? {
      label: `S${severity}`,
      variant: "default" as const,
      ring: "ring-primary/30",
    };

  return (
    <Badge
      variant={config.variant}
      className={cn(
        severity === 5 && "animate-pulse-alert ring-2",
        config.ring
      )}
    >
      {config.label} · {severity}/5
    </Badge>
  );
}

export function SeveritySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-2">
      {[1, 2, 3, 4, 5].map((level) => {
        const config = SEVERITY_CONFIG[level];
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            onClick={() => onChange(level)}
            className={cn(
              "rounded-xl border-2 py-3 text-center text-sm font-bold transition-all",
              selected
                ? "border-primary bg-primary-light text-primary scale-105"
                : "border-border bg-surface text-muted hover:border-primary/40",
              level === 5 && selected && "border-danger bg-danger/10 text-danger animate-pulse-alert"
            )}
          >
            {level}
            <span className="block text-[10px] font-medium mt-0.5 opacity-70">
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

import { AlertTriangle } from "lucide-react";
import { severityConfig } from "@/lib/severity";
import { cn } from "@/lib/utils";

// A single-line alert strip. Neutral by default; it only takes severity colour
// when the banner is literally about a severity level (a critical broadcast).
// No animation — urgency is carried by placement and wording, not motion.
export function AlertBanner({
  message,
  severity,
}: {
  message: string;
  severity?: number;
}) {
  const config = severity ? severityConfig(severity) : null;

  return (
    <div
      className={cn(
        "mb-4 flex items-center gap-2.5 rounded-md border border-line bg-surface px-3 py-2.5",
        config ? cn("border-l-2", config.border, config.tint) : "border-l-2 border-l-muted"
      )}
    >
      <AlertTriangle
        className={cn("h-4 w-4 shrink-0", config ? config.text : "text-muted")}
        strokeWidth={2}
      />
      <p className="text-[13px] text-fg">{message}</p>
    </div>
  );
}

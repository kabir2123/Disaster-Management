import { severityConfig } from "@/lib/severity";
import { cn } from "@/lib/utils";

// The severity chip: the tinted "N/5" tag. Colour + numeral, always together.
// In dense rows it stays compact (number only); the word label is for detail
// views where there's room. The word is what used to overflow the SEV column.
export function SeverityBadge({
  severity,
  compact = false,
}: {
  severity: number;
  compact?: boolean;
}) {
  const config = severityConfig(severity);
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5",
        "font-mono text-[11px] font-medium tabular-nums whitespace-nowrap",
        config.tint,
        config.text
      )}
      title={config.label}
    >
      <span className="font-semibold">{severity}/5</span>
      {!compact && (
        <span className="uppercase tracking-wide opacity-80">{config.label}</span>
      )}
    </span>
  );
}

// Severity picker for the report form: neutral until selected, then the row
// lights up in that severity's colour so the reporter sees exactly what they
// are declaring.
export function SeveritySelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="grid grid-cols-5 gap-1.5">
      {[1, 2, 3, 4, 5].map((level) => {
        const config = severityConfig(level);
        const selected = value === level;
        return (
          <button
            key={level}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(level)}
            className={cn(
              "flex flex-col items-center gap-1 rounded-md border py-2.5 transition-colors",
              selected
                ? cn("border-transparent", config.tint, config.text)
                : "border-line text-muted hover:border-muted"
            )}
          >
            <span className="font-mono text-base font-semibold tabular-nums">
              {level}
            </span>
            <span className="text-[10px] uppercase tracking-wide">
              {config.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}

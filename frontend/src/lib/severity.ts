// Single source of truth for the severity ramp — the only colour in the
// product. Every place that draws severity (rail, chip, selector) reads from
// here so red always means S5 and nothing else can borrow it.
//
// Class strings are written out in full: Tailwind only generates utilities it
// can see literally in source, so these must never be composed dynamically.
// Severity is double-encoded (colour + the "N/5" numeral) so it survives
// complete colour loss — colour-blind safety without adding a second hue.

export interface SeverityConfig {
  label: string;
  /** The rail / vertical bar fill. */
  bar: string;
  /** Left-border accent (banners, detail rail). */
  border: string;
  /** Chip foreground. */
  text: string;
  /** Chip tinted background. */
  tint: string;
}

export const SEVERITY: Record<number, SeverityConfig> = {
  1: { label: "Low", bar: "bg-sev-1", border: "border-l-sev-1", text: "text-sev-1", tint: "bg-sev-1/12" },
  2: { label: "Moderate", bar: "bg-sev-2", border: "border-l-sev-2", text: "text-sev-2", tint: "bg-sev-2/12" },
  3: { label: "Elevated", bar: "bg-sev-3", border: "border-l-sev-3", text: "text-sev-3", tint: "bg-sev-3/12" },
  4: { label: "High", bar: "bg-sev-4", border: "border-l-sev-4", text: "text-sev-4", tint: "bg-sev-4/12" },
  5: { label: "Critical", bar: "bg-sev-5", border: "border-l-sev-5", text: "text-sev-5", tint: "bg-sev-5/12" },
};

export function severityConfig(level: number): SeverityConfig {
  return (
    SEVERITY[level] ?? {
      label: `S${level}`,
      bar: "bg-muted",
      border: "border-l-muted",
      text: "text-muted",
      tint: "bg-raised",
    }
  );
}

/** Compact "3h" / "12m" / "2d" age from an ISO timestamp — utility-face data. */
export function shortAge(iso: string, now: number = Date.now()): string {
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "—";
  const secs = Math.max(0, Math.floor((now - then) / 1000));
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return `${Math.floor(days / 7)}w`;
}

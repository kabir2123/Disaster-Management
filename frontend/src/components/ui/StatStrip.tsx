import { cn } from "@/lib/utils";

// A dense inline counter row — replaces the four floating StatCards. Numbers
// are utility-face (tabular) so the board reads like an instrument panel.
export interface Stat {
  label: string;
  value: string | number;
  /** Optional: emphasise a count that demands attention (still neutral). */
  emphasis?: boolean;
}

export function StatStrip({ stats, loading }: { stats: Stat[]; loading?: boolean }) {
  return (
    <div className="flex flex-wrap items-stretch rounded-md border border-line bg-surface">
      {stats.map((stat, i) => (
        <div
          key={stat.label}
          className={cn(
            "flex min-w-[9rem] flex-1 flex-col gap-0.5 px-4 py-3",
            i > 0 && "border-l border-line"
          )}
        >
          <span className="text-[11px] font-medium uppercase tracking-wider text-muted">
            {stat.label}
          </span>
          <span
            className={cn(
              "font-mono text-2xl leading-none tabular-nums",
              loading ? "text-faint" : stat.emphasis ? "text-fg" : "text-fg"
            )}
          >
            {loading ? "—" : stat.value}
          </span>
        </div>
      ))}
    </div>
  );
}

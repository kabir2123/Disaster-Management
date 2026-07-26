import { cn } from "@/lib/utils";

// A neutral tag. Status and availability carry no hue — colour is reserved for
// severity — so these differ only by neutral emphasis (strong / muted / faint).
type Tone = "default" | "strong" | "faint" | "outline";

const tones: Record<Tone, string> = {
  default: "text-muted",
  strong: "text-fg",
  faint: "text-faint",
  outline: "text-muted border border-line",
};

export function Badge({
  children,
  tone = "default",
  className,
}: {
  children: React.ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-1.5 py-0.5",
        "font-mono text-[11px] font-medium uppercase tracking-wider",
        tones[tone],
        className
      )}
    >
      {children}
    </span>
  );
}

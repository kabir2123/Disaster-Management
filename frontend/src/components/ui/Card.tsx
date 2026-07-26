import { cn } from "@/lib/utils";

// A panel: a single flat surface with a hairline border. No drop shadow, no
// large radius — the DashStack "floating white card" is gone. Cards are for
// genuinely bounded content (a form, a detail block), not for wrapping lists.
interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: "none" | "sm" | "md";
}

const paddingMap = {
  none: "",
  sm: "p-3",
  md: "p-4",
};

export function Card({ children, className, padding = "md" }: CardProps) {
  return (
    <div
      className={cn(
        "rounded-md border border-line bg-surface",
        paddingMap[padding],
        className
      )}
    >
      {children}
    </div>
  );
}

export function CardHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex items-start justify-between gap-3">
      <div className="min-w-0">
        <h2 className="text-[13px] font-semibold uppercase tracking-wide text-muted">
          {title}
        </h2>
        {subtitle && <p className="mt-1 text-xs text-muted/80">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

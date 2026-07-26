import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "./Button";

// The four states that separate an application from a demo. All neutral —
// nothing here borrows severity colour, including errors.

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-raised", className)}
      aria-hidden
    />
  );
}

/** Empty is an invitation to act, not a shrug. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-line bg-surface px-6 py-16 text-center">
      <Icon className="h-6 w-6 text-faint" strokeWidth={1.5} />
      <div className="max-w-sm space-y-1">
        <p className="text-[13px] font-medium text-fg">{title}</p>
        <p className="text-xs text-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}

/** Error says what failed and what to do — distinct from "nothing here yet". */
export function ErrorState({
  icon: Icon,
  title,
  message,
  onRetry,
}: {
  icon: LucideIcon;
  title: string;
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-md border border-line bg-surface px-6 py-16 text-center">
      <Icon className="h-6 w-6 text-muted" strokeWidth={1.5} />
      <div className="max-w-md space-y-1">
        <p className="text-[13px] font-medium text-fg">{title}</p>
        <p className="text-xs text-muted">{message}</p>
      </div>
      {onRetry && (
        <Button size="sm" variant="secondary" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Compact inline notice for form/action feedback — neutral, never red. */
export function Notice({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p
      className={cn(
        "rounded-md border-l-2 border-l-muted bg-raised px-3 py-2 text-xs text-fg",
        className
      )}
    >
      {children}
    </p>
  );
}

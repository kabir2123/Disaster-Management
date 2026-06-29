import { AlertTriangle } from "lucide-react";

interface AlertBannerProps {
  message: string;
  level?: "warning" | "critical";
}

export function AlertBanner({ message, level = "warning" }: AlertBannerProps) {
  const isCritical = level === "critical";

  return (
    <div
      className={`mb-6 flex items-center gap-3 rounded-2xl px-5 py-4 ${
        isCritical
          ? "bg-danger/10 border border-danger/30 text-danger animate-pulse-alert"
          : "bg-alert/10 border border-alert/30 text-alert"
      }`}
    >
      <AlertTriangle className={`h-5 w-5 shrink-0 ${isCritical ? "animate-bounce" : ""}`} />
      <p className="text-sm font-semibold">{message}</p>
    </div>
  );
}

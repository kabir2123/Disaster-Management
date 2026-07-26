import { Shield } from "lucide-react";

// A solid split, no glass and no gradient. The left panel is a quiet status
// board — the only colour on the whole screen is the severity ramp in the
// legend, which is exactly the point.
export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-[44%] flex-col justify-between border-r border-line bg-surface p-10 lg:flex">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-raised">
            <Shield className="h-5 w-5 text-fg" strokeWidth={2} />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-fg">ResQ</p>
            <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
              Incident console
            </p>
          </div>
        </div>

        <div className="max-w-sm">
          <h1 className="text-xl font-semibold leading-snug text-fg">
            District incident coordination for disaster response.
          </h1>
          <p className="mt-2 text-[13px] text-muted">
            Report, triage, assign, and resolve — one board for the people
            working the emergency.
          </p>

          <div className="mt-8">
            <p className="mb-2 font-mono text-[10px] uppercase tracking-wider text-faint">
              Severity scale
            </p>
            <ul className="space-y-1.5">
              {[
                { n: 1, label: "Low", bar: "bg-sev-1" },
                { n: 2, label: "Moderate", bar: "bg-sev-2" },
                { n: 3, label: "Elevated", bar: "bg-sev-3" },
                { n: 4, label: "High", bar: "bg-sev-4" },
                { n: 5, label: "Critical", bar: "bg-sev-5" },
              ].map((s) => (
                <li key={s.n} className="flex items-center gap-2.5">
                  <span className={`h-3.5 w-1 rounded-full ${s.bar}`} />
                  <span className="font-mono text-xs tabular-nums text-muted">
                    {s.n}/5
                  </span>
                  <span className="text-xs text-muted">{s.label}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="font-mono text-[11px] text-faint">
          Built for coordinators, responders, and the people who report.
        </p>
      </aside>

      <main className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-sm">{children}</div>
      </main>
    </div>
  );
}

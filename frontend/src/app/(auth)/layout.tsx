export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex">
      {/* Cyclone Ready — crisis prep panel */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden bg-sidebar">
        <div className="absolute inset-0 bg-gradient-to-br from-sidebar via-[#24357a] to-primary opacity-90" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div>
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-white/60">
              Cyclone Ready
            </p>
            <h1 className="mt-4 text-4xl font-extrabold leading-tight">
              Stay prepared.<br />Respond faster.
            </h1>
            <p className="mt-4 max-w-md text-white/70 text-lg">
              Real-time incident reporting, resource coordination, and
              district-wide emergency alerts — all in one command center.
            </p>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10 p-5">
              <p className="text-xs font-bold uppercase tracking-wider text-alert">
                Active Alert Zone
              </p>
              <p className="mt-2 text-lg font-bold">Monsoon Season 2026</p>
              <p className="text-sm text-white/60 mt-1">
                Report flooding, landslides, and fire emergencies in your district
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Incidents", value: "Live" },
                { label: "Resources", value: "Tracked" },
                { label: "Alerts", value: "SNS" },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-xl bg-white/5 border border-white/10 p-4 text-center"
                >
                  <p className="text-xs text-white/50">{stat.label}</p>
                  <p className="text-sm font-bold mt-1">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* DashStack — login form panel */}
      <div className="flex flex-1 items-center justify-center p-6 sm:p-12 bg-background">
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}

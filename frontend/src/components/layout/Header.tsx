"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS, canListIncidents } from "@/lib/auth/roles";
import { listIncidents } from "@/lib/api/incidents";
import type { Incident } from "@/lib/types/models";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

export function Header({ title, subtitle }: HeaderProps) {
  const { claims } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);

  useEffect(() => {
    if (!claims || !canListIncidents(claims.role)) {
      return;
    }

    let cancelled = false;
    listIncidents(claims.districtID)
      .then((items) => {
        if (!cancelled) setIncidents(items);
      })
      .catch(() => {
        if (!cancelled) setIncidents([]);
      });

    return () => {
      cancelled = true;
    };
  }, [claims]);

  const notifications = useMemo(
    () =>
      incidents
        .filter(
          (incident) =>
            incident.status === "escalated" ||
            (incident.severity >= 4 && incident.status !== "resolved")
        )
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
        .slice(0, 5),
    [incidents]
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/incidents?q=${encodeURIComponent(query)}` : "/incidents");
  }

  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3">
        <form onSubmit={handleSearchSubmit} className="relative hidden sm:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            type="search"
            placeholder="Search incidents..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="w-64 rounded-xl border border-border bg-surface py-2.5 pl-10 pr-4 text-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          />
        </form>
        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-surface text-muted hover:text-primary transition-colors"
            aria-label="Notifications"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-5 w-5" />
            {notifications.length > 0 && (
              <span className="absolute right-2 top-2 h-2 w-2 rounded-full bg-alert" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-13 z-50 w-80 overflow-hidden rounded-xl border border-border bg-surface shadow-[var(--card-shadow)]">
              <div className="border-b border-border px-4 py-3">
                <p className="text-sm font-bold text-foreground">Notifications</p>
                <p className="text-xs text-muted">
                  Critical and escalated incidents
                </p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-sm text-muted">
                    No critical alerts right now
                  </p>
                ) : (
                  notifications.map((incident) => (
                    <Link
                      key={incident.incidentID}
                      href={`/incidents/${incident.incidentID}`}
                      onClick={() => setNotificationsOpen(false)}
                      className="block border-b border-border/60 px-4 py-3 last:border-0 hover:bg-primary-light/30"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <p className="truncate text-sm font-semibold text-foreground">
                          {incident.location}
                        </p>
                        <span className="rounded-full bg-alert/10 px-2 py-0.5 text-xs font-bold text-alert">
                          S{incident.severity}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-muted">
                        {incident.status} · {incident.description || "No description"}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
        <div className="flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-white">
            {claims?.userID.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-sm font-bold text-foreground">
              {claims ? ROLE_LABELS[claims.role] : "User"}
            </p>
            <p className="text-xs text-muted truncate max-w-[120px]">
              {claims?.userID.slice(0, 8)}…
            </p>
          </div>
        </div>
      </div>
    </header>
  );
}

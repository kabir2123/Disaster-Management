"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useEffect, useMemo, useState } from "react";
import { Bell, Check, Copy, Search } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { ROLE_LABELS, canListIncidents } from "@/lib/auth/roles";
import { listIncidents } from "@/lib/api/incidents";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { shortAge } from "@/lib/severity";
import type { Incident } from "@/lib/types/models";

interface HeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function Header({ title, subtitle, actions }: HeaderProps) {
  const { claims } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [copied, setCopied] = useState(false);

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
        .slice(0, 6),
    [incidents]
  );

  function handleSearchSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const query = search.trim();
    router.push(query ? `/incidents?q=${encodeURIComponent(query)}` : "/incidents");
  }

  async function copyUserID() {
    if (!claims) return;
    await navigator.clipboard.writeText(claims.userID);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  }

  return (
    <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <h1 className="text-lg font-semibold text-fg">{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-2">
        {actions}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-faint" />
          <input
            type="search"
            placeholder="Search reports…"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="h-9 w-56 rounded-md border border-line bg-raised pl-8 pr-3 text-[13px] text-fg placeholder:text-faint focus:border-muted focus:outline-none"
          />
        </form>

        <div className="relative">
          <button
            type="button"
            onClick={() => setNotificationsOpen((open) => !open)}
            className="relative flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-muted hover:text-fg"
            aria-label="Priority alerts"
            aria-expanded={notificationsOpen}
          >
            <Bell className="h-4 w-4" />
            {notifications.length > 0 && (
              <span className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-fg" />
            )}
          </button>

          {notificationsOpen && (
            <div className="absolute right-0 top-11 z-40 w-80 overflow-hidden rounded-md border border-line bg-surface shadow-lg shadow-black/40">
              <div className="border-b border-line px-3 py-2.5">
                <p className="text-[13px] font-medium text-fg">Priority alerts</p>
                <p className="text-xs text-muted">Critical and escalated, unresolved</p>
              </div>
              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-muted">
                    Nothing critical right now
                  </p>
                ) : (
                  notifications.map((incident) => (
                    <Link
                      key={incident.incidentID}
                      href={`/incidents/${incident.incidentID}`}
                      onClick={() => setNotificationsOpen(false)}
                      className="block border-b border-line px-3 py-2.5 last:border-0 hover:bg-raised"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <SeverityBadge severity={incident.severity} />
                        <span className="font-mono text-[11px] tabular-nums text-faint">
                          {shortAge(incident.updatedAt)}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-[13px] text-fg">
                        {incident.location}
                      </p>
                    </Link>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 rounded-md border border-line bg-raised px-2.5 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-md bg-line font-mono text-[11px] font-medium text-fg">
            {claims?.userID.slice(0, 2).toUpperCase()}
          </div>
          <div className="hidden sm:block">
            <p className="text-[11px] font-medium leading-tight text-fg">
              {claims ? ROLE_LABELS[claims.role] : "User"}
            </p>
            <button
              type="button"
              onClick={copyUserID}
              className="flex max-w-[150px] items-center gap-1 font-mono text-[10px] leading-tight text-faint hover:text-muted"
              title="Copy your user ID"
              aria-label="Copy your user ID"
            >
              <span className="truncate">{claims?.userID}</span>
              {copied ? (
                <Check className="h-3 w-3 shrink-0" />
              ) : (
                <Copy className="h-3 w-3 shrink-0" />
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}

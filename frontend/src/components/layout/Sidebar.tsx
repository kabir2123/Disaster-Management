"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  PlusCircle,
  Shield,
  Truck,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { getNavItems, ROLE_LABELS } from "@/lib/auth/roles";
import { cn } from "@/lib/utils";

const ICONS = {
  "layout-dashboard": LayoutDashboard,
  "alert-triangle": AlertTriangle,
  megaphone: Megaphone,
  truck: Truck,
  "plus-circle": PlusCircle,
} as const;

function Wordmark() {
  return (
    <div className="flex items-center gap-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-raised">
        <Shield className="h-4 w-4 text-fg" strokeWidth={2} />
      </div>
      <div className="leading-tight">
        <p className="text-[13px] font-semibold text-fg">ResQ</p>
        <p className="font-mono text-[10px] uppercase tracking-widest text-faint">
          Incident console
        </p>
      </div>
    </div>
  );
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const { claims, logout } = useAuth();
  if (!claims) return null;

  const navItems = getNavItems(claims.role);

  return (
    <>
      <nav className="flex-1 space-y-0.5 px-2 py-3">
        {navItems.map((item) => {
          const Icon = ICONS[item.icon as keyof typeof ICONS] ?? LayoutDashboard;
          const active =
            pathname === item.href ||
            (item.href === "/incidents" &&
              pathname.startsWith("/incidents/") &&
              pathname !== "/incidents/report") ||
            (item.href === "/resources" &&
              pathname.startsWith("/resources/") &&
              pathname !== "/resources/register");

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex items-center gap-2.5 rounded-md border-l-2 px-2.5 py-2 text-[13px] transition-colors",
                active
                  ? "border-l-fg bg-raised font-medium text-fg"
                  : "border-l-transparent text-muted hover:bg-raised hover:text-fg"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" strokeWidth={2} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line p-2">
        <div className="rounded-md bg-raised px-2.5 py-2">
          <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
            District
          </p>
          <p className="truncate text-[13px] font-medium capitalize text-fg">
            {claims.districtID}
          </p>
          <p className="text-[11px] text-muted">{ROLE_LABELS[claims.role]}</p>
        </div>
        <button
          onClick={logout}
          className="mt-1 flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-[13px] text-muted transition-colors hover:bg-raised hover:text-fg"
        >
          <LogOut className="h-4 w-4" strokeWidth={2} />
          Sign out
        </button>
      </div>
    </>
  );
}

export function Sidebar() {
  const { claims } = useAuth();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Close the mobile drawer on navigation.
  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  if (!claims) return null;

  return (
    <>
      {/* Desktop rail */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 flex-col border-r border-line bg-surface lg:flex">
        <div className="flex h-14 items-center border-b border-line px-3">
          <Wordmark />
        </div>
        <NavList />
      </aside>

      {/* Mobile top bar */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-line bg-surface px-3 lg:hidden">
        <Wordmark />
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-muted hover:text-fg"
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </button>
      </div>

      {/* Mobile drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/60"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute inset-y-0 left-0 flex w-64 flex-col border-r border-line bg-surface">
            <div className="flex h-14 items-center justify-between border-b border-line px-3">
              <Wordmark />
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-md border border-line bg-raised text-muted hover:text-fg"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <NavList onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AlertTriangle,
  LayoutDashboard,
  LogOut,
  Megaphone,
  PlusCircle,
  Shield,
  Truck,
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

export function Sidebar() {
  const pathname = usePathname();
  const { claims, logout } = useAuth();

  if (!claims) return null;

  const navItems = getNavItems(claims.role);

  return (
    <aside className="fixed inset-y-0 left-0 z-30 flex w-64 flex-col bg-sidebar text-white">
      <div className="flex items-center gap-3 px-6 py-7 border-b border-white/10">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary">
          <Shield className="h-6 w-6" />
        </div>
        <div>
          <p className="text-lg font-bold tracking-tight">ResQ</p>
          <p className="text-[11px] font-medium text-white/60 uppercase tracking-widest">
            Cyclone Ready
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-4 py-6">
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
              className={cn(
                "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-all",
                active
                  ? "bg-sidebar-active text-white shadow-lg shadow-primary/30"
                  : "text-white/70 hover:bg-sidebar-hover hover:text-white"
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="rounded-xl bg-white/5 px-4 py-3 mb-3">
          <p className="text-xs text-white/50">District</p>
          <p className="text-sm font-bold truncate">{claims.districtID}</p>
          <p className="text-xs text-primary-light mt-1">
            {ROLE_LABELS[claims.role]}
          </p>
        </div>
        <button
          onClick={logout}
          className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold text-white/70 hover:bg-sidebar-hover hover:text-white transition-all"
        >
          <LogOut className="h-5 w-5" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

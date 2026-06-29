import type { Role } from "@/lib/types/models";

export const ROLE_LABELS: Record<Role, string> = {
  citizen: "Citizen",
  responder: "Responder",
  admin: "District Admin",
  coordinator: "Relief Coordinator",
};

export function canListIncidents(role: Role): boolean {
  return role === "admin" || role === "responder" || role === "coordinator";
}

export function canAssignIncidents(role: Role): boolean {
  return role === "admin";
}

export function canResolveIncidents(role: Role): boolean {
  return role === "admin" || role === "responder";
}

export function canReportIncidents(role: Role): boolean {
  return role === "citizen" || role === "admin" || role === "responder";
}

export function canManageResources(role: Role): boolean {
  return role === "admin" || role === "coordinator";
}

export function canViewResources(role: Role): boolean {
  return role === "admin" || role === "coordinator" || role === "responder";
}

export interface NavItem {
  href: string;
  label: string;
  icon: string;
}

export function getNavItems(role: Role): NavItem[] {
  const items: NavItem[] = [
    { href: "/dashboard", label: "Overview", icon: "layout-dashboard" },
  ];

  if (canListIncidents(role)) {
    items.push({ href: "/incidents", label: "Incidents", icon: "alert-triangle" });
  }

  if (canReportIncidents(role)) {
    items.push({ href: "/incidents/report", label: "Report", icon: "megaphone" });
  }

  if (canViewResources(role)) {
    items.push({ href: "/resources", label: "Resources", icon: "truck" });
  }

  if (canManageResources(role)) {
    items.push({
      href: "/resources/register",
      label: "Add Resource",
      icon: "plus-circle",
    });
  }

  return items;
}

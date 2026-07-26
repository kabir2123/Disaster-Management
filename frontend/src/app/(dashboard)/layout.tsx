"use client";

import { Sidebar } from "@/components/layout/Sidebar";
import { useRequireAuth } from "@/hooks/useAuth";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading } = useRequireAuth();

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-canvas">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-line border-t-muted" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="lg:pl-56">
        <div className="mx-auto max-w-[100rem] px-4 py-5 sm:px-6">{children}</div>
      </div>
    </div>
  );
}

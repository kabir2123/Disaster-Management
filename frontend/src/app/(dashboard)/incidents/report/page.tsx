"use client";

import { Header } from "@/components/layout/Header";
import { ReportForm } from "@/components/incidents/ReportForm";
import { useAuth } from "@/hooks/useAuth";

export default function ReportIncidentPage() {
  const { claims } = useAuth();

  return (
    <>
      <Header
        title="Report Incident"
        subtitle="Submit a new emergency report to your district command center"
      />
      <ReportForm districtID={claims?.districtID ?? ""} />
    </>
  );
}

"use client";

import { Header } from "@/components/layout/Header";
import { ReportForm } from "@/components/incidents/ReportForm";
import { useAuth } from "@/hooks/useAuth";

export default function ReportIncidentPage() {
  const { claims } = useAuth();
  const districtID = claims?.districtID ?? "";
  const districtLabel = districtID.charAt(0).toUpperCase() + districtID.slice(1);

  return (
    <>
      <Header
        title="New report"
        subtitle={`Filing to ${districtLabel} · reaches the district board immediately`}
      />
      <ReportForm districtID={districtID} />
    </>
  );
}

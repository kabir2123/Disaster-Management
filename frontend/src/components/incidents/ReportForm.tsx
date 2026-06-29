"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ApiClientError } from "@/lib/api/client";
import { reportIncident } from "@/lib/api/incidents";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { SeveritySelector } from "./SeverityBadge";

export function ReportForm({ districtID }: { districtID: string }) {
  const router = useRouter();
  const [severity, setSeverity] = useState(3);
  const [location, setLocation] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const incident = await reportIncident({
        severity,
        location,
        description,
        districtID,
      });
      router.push(`/incidents/${incident.incidentID}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Failed to submit report"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card>
      <CardHeader
        title="Report an Incident"
        subtitle="Describe the emergency — severity 5 triggers district-wide alerts"
      />

      {severity === 5 && (
        <AlertBanner
          level="critical"
          message="Critical severity will broadcast an emergency alert to all responders"
        />
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label className="block text-sm font-semibold text-foreground mb-3">
            Severity Level
          </label>
          <SeveritySelector value={severity} onChange={setSeverity} />
        </div>

        <Input
          label="Location"
          placeholder="e.g. Main Street Bridge, Ward 4"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          required
        />

        <Textarea
          label="Description"
          placeholder="Describe what happened — flooding depth, injuries, blocked roads..."
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} size="lg" className="w-full sm:w-auto">
          Submit Report
        </Button>
      </form>
    </Card>
  );
}

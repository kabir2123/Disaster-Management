"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Image as ImageIcon, Upload } from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { StatusBadge } from "@/components/incidents/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { useAuth } from "@/hooks/useAuth";
import {
  canAssignIncidents,
  canResolveIncidents,
} from "@/lib/auth/roles";
import { ApiClientError } from "@/lib/api/client";
import {
  assignIncident,
  getIncident,
  getLocalEvidenceDataURL,
  requestEvidenceUpload,
  resolveIncident,
  uploadEvidenceFile,
} from "@/lib/api/incidents";
import type { Incident } from "@/lib/types/models";

export default function IncidentDetailPage() {
  const params = useParams();
  const incidentID = params.id as string;
  const { claims } = useAuth();
  const districtID = claims?.districtID ?? "";

  const [incident, setIncident] = useState<Incident | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [assignTo, setAssignTo] = useState("");
  const [resolveNote, setResolveNote] = useState("");
  const [actionLoading, setActionLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState("");
  const evidenceKeys = incident?.evidenceKeys;

  useEffect(() => {
    if (!districtID || !incidentID) return;

    getIncident(districtID, incidentID)
      .then(setIncident)
      .catch((err) => setError(err.message ?? "Incident not found"))
      .finally(() => setLoading(false));
  }, [districtID, incidentID]);

  const evidencePreviews = useMemo(() => {
    if (!evidenceKeys?.length) return {};
    return evidenceKeys.reduce<Record<string, string>>(
      (acc, key) => {
        const dataURL = getLocalEvidenceDataURL(key);
        if (dataURL) acc[key] = dataURL;
        return acc;
      },
      {}
    );
  }, [evidenceKeys]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTo.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await assignIncident(districtID, incidentID, assignTo);
      setIncident(updated);
      setAssignTo("");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Assign failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleResolve(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    setError("");
    try {
      const updated = await resolveIncident(districtID, incidentID, resolveNote);
      setIncident(updated);
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Resolve failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("Uploading…");
    setError("");
    try {
      const { uploadURL } = await requestEvidenceUpload(
        districtID,
        incidentID,
        file.name
      );
      await uploadEvidenceFile(uploadURL, file);
      const refreshed = await getIncident(districtID, incidentID);
      setIncident(refreshed);
      setUploadStatus("Evidence uploaded successfully");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadStatus("");
    }
  }

  if (loading) {
    return (
      <div className="py-16 text-center text-muted">Loading incident…</div>
    );
  }

  if (!incident) {
    return (
      <div className="py-16 text-center">
        <p className="text-danger font-semibold">{error || "Incident not found"}</p>
        <Link href="/incidents" className="mt-4 inline-block text-primary font-bold">
          ← Back to incidents
        </Link>
      </div>
    );
  }

  return (
    <>
      <Link
        href="/incidents"
        className="mb-4 inline-flex items-center gap-2 text-sm font-semibold text-muted hover:text-primary"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to incidents
      </Link>

      <Header
        title={incident.location}
        subtitle={`Incident ${incident.incidentID.slice(0, 8)}…`}
      />

      {incident.severity === 5 && (
        <AlertBanner
          level="critical"
          message="Critical severity — emergency broadcast sent to district responders"
        />
      )}

      {incident.status === "escalated" && (
        <AlertBanner
          level="critical"
          message="This incident has been escalated — unresolved for over 30 minutes"
        />
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Incident Details" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className="text-xs font-bold uppercase text-muted">Severity</dt>
              <dd className="mt-1">
                <SeverityBadge severity={incident.severity} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-muted">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={incident.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-muted">Reported</dt>
              <dd className="mt-1 text-sm font-semibold">
                {new Date(incident.timestamp).toLocaleString()}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-bold uppercase text-muted">Reporter</dt>
              <dd className="mt-1 font-mono text-xs">{incident.reporterID}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs font-bold uppercase text-muted">Description</dt>
              <dd className="mt-1 text-sm">
                {incident.description || "No description provided"}
              </dd>
            </div>
            {incident.assignedTo && (
              <div>
                <dt className="text-xs font-bold uppercase text-muted">Assigned To</dt>
                <dd className="mt-1 font-mono text-xs">{incident.assignedTo}</dd>
              </div>
            )}
            {incident.resolveNote && (
              <div className="sm:col-span-2">
                <dt className="text-xs font-bold uppercase text-muted">Resolution Note</dt>
                <dd className="mt-1 text-sm">{incident.resolveNote}</dd>
              </div>
            )}
          </dl>
        </Card>

        <div className="space-y-6">
          {canAssignIncidents(claims?.role ?? "citizen") &&
            incident.status !== "resolved" && (
              <Card>
                <CardHeader title="Assign Responder" />
                <form onSubmit={handleAssign} className="space-y-4">
                  <Input
                    label="Responder User ID"
                    placeholder="Paste responder userID"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    required
                  />
                  <Button type="submit" loading={actionLoading} className="w-full">
                    Assign
                  </Button>
                </form>
              </Card>
            )}

          {canResolveIncidents(claims?.role ?? "citizen") &&
            incident.status !== "resolved" && (
              <Card>
                <CardHeader title="Resolve Incident" />
                <form onSubmit={handleResolve} className="space-y-4">
                  <Textarea
                    label="Resolution note"
                    placeholder="Describe actions taken…"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={actionLoading}
                    className="w-full"
                  >
                    Mark Resolved
                  </Button>
                </form>
              </Card>
            )}

          <Card>
            <CardHeader title="Evidence" />
            <label className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-border py-8 hover:border-primary/40 hover:bg-primary-light/20 transition-all">
              <Upload className="h-8 w-8 text-muted" />
              <span className="text-sm font-semibold text-muted">
                Upload photo or document
              </span>
              <input
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={handleEvidenceUpload}
              />
            </label>
            {uploadStatus && (
              <p className="mt-3 text-sm font-medium text-success">{uploadStatus}</p>
            )}
            {incident.evidenceKeys && incident.evidenceKeys.length > 0 && (
              <ul className="mt-4 space-y-3">
                {incident.evidenceKeys.map((key) => (
                  <li
                    key={key}
                    className="overflow-hidden rounded-xl border border-border bg-background"
                  >
                    {evidencePreviews[key]?.startsWith("data:image/") ? (
                      <div>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={evidencePreviews[key]}
                          alt={evidenceFilename(key)}
                          className="h-44 w-full object-cover"
                        />
                        <div className="flex items-center gap-2 px-3 py-2">
                          <ImageIcon className="h-4 w-4 text-primary" />
                          <p className="truncate text-xs font-semibold text-foreground">
                            {evidenceFilename(key)}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 px-3 py-3">
                        <FileText className="h-5 w-5 shrink-0 text-primary" />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {evidenceFilename(key)}
                          </p>
                          <p className="truncate font-mono text-xs text-muted">
                            {key}
                          </p>
                        </div>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
          {error}
        </p>
      )}
    </>
  );
}

function evidenceFilename(key: string): string {
  return key.split("/").at(-1)?.replace(/^[a-f0-9-]+-/, "") ?? "Evidence file";
}

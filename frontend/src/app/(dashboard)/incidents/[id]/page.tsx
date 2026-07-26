"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  FileText,
  FileQuestion,
  Image as ImageIcon,
  Upload,
} from "lucide-react";
import { Header } from "@/components/layout/Header";
import { AlertBanner } from "@/components/layout/AlertBanner";
import { SeverityBadge } from "@/components/incidents/SeverityBadge";
import { StatusBadge } from "@/components/incidents/StatusBadge";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Select, Textarea } from "@/components/ui/Input";
import { ErrorState, Notice, Skeleton } from "@/components/ui/States";
import { severityConfig, shortAge } from "@/lib/severity";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";
import { canAssignIncidents, canResolveIncidents } from "@/lib/auth/roles";
import { ApiClientError } from "@/lib/api/client";
import {
  assignIncident,
  evidenceURL,
  getIncident,
  getLocalEvidenceDataURL,
  isImageEvidence,
  listResponders,
  requestEvidenceUpload,
  resolveIncident,
  uploadEvidenceFile,
} from "@/lib/api/incidents";
import type { Incident, Responder } from "@/lib/types/models";

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
  const [actionNotice, setActionNotice] = useState("");
  const [uploadStatus, setUploadStatus] = useState("");
  const [uploadedPreviews, setUploadedPreviews] = useState<Record<string, string>>({});
  const [responders, setResponders] = useState<Responder[]>([]);
  const canUploadEvidence = claims?.role !== "coordinator";
  const canAssign = canAssignIncidents(claims?.role ?? "citizen");

  useEffect(() => {
    if (!districtID || !incidentID) return;

    getIncident(districtID, incidentID)
      .then(setIncident)
      .catch((err) => setError(err.message ?? "Incident not found"))
      .finally(() => setLoading(false));
  }, [districtID, incidentID]);

  // Load the assignable responders so an admin picks a name, not a UUID.
  useEffect(() => {
    if (!districtID || !canAssign) return;
    listResponders(districtID)
      .then(setResponders)
      .catch(() => setResponders([]));
  }, [districtID, canAssign]);

  async function handleAssign(e: React.FormEvent) {
    e.preventDefault();
    if (!assignTo.trim()) return;
    setActionLoading(true);
    setError("");
    try {
      const updated = await assignIncident(districtID, incidentID, assignTo);
      setIncident(updated);
      setAssignTo("");
      setActionNotice("Assigned.");
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
      setActionNotice("Resolved.");
    } catch (err) {
      setError(err instanceof ApiClientError ? err.message : "Resolve failed");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEvidenceUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const input = e.currentTarget;
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadStatus("Adding…");
    setError("");
    try {
      const { uploadURL, key } = await requestEvidenceUpload(
        districtID,
        incidentID,
        file.name
      );
      await uploadEvidenceFile(uploadURL, file);
      const preview = getLocalEvidenceDataURL(key);
      if (preview) {
        setUploadedPreviews((current) => ({ ...current, [key]: preview }));
      }
      setIncident((current) => {
        if (!current) return current;
        const evidenceKeys = current.evidenceKeys ?? [];
        if (evidenceKeys.includes(key)) return current;
        return { ...current, evidenceKeys: [...evidenceKeys, key] };
      });
      setUploadStatus("Photo added.");

      getIncident(districtID, incidentID)
        .then(setIncident)
        .catch(() => {
          // The upload already completed; keep the optimistic evidence preview visible.
        });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
      setUploadStatus("");
    } finally {
      input.value = "";
    }
  }

  if (loading) {
    return <DetailSkeleton />;
  }

  if (!incident) {
    return (
      <ErrorState
        icon={FileQuestion}
        title="Report not found"
        message={
          error ||
          "This report may have been resolved and archived, or the link is wrong. Go back to the board to find it."
        }
        onRetry={undefined}
      />
    );
  }

  const config = severityConfig(incident.severity);
  const resolved = incident.status === "resolved";
  const evidence = evidenceItems(incident);
  const assignedName = responders.find(
    (r) => r.userID === incident.assignedTo
  )?.name;

  return (
    <>
      <Link
        href="/incidents"
        className="mb-3 inline-flex items-center gap-1.5 text-xs text-muted hover:text-fg"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to board
      </Link>

      <Header
        title={incident.location}
        subtitle={`Reported ${shortAge(incident.timestamp)} ago · ${incident.incidentID}`}
      />

      {incident.severity === 5 && (
        <AlertBanner
          severity={5}
          message="Critical — an emergency broadcast went to district responders when this was filed."
        />
      )}
      {incident.status === "escalated" && (
        <AlertBanner message="Escalated — this sat unresolved past 30 minutes. Assign a responder." />
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Details panel with the severity rail down its edge */}
        <div className="flex overflow-hidden rounded-md border border-line bg-surface lg:col-span-2">
          <span
            aria-hidden
            className={cn("w-1 shrink-0", resolved ? "bg-line" : config.bar)}
          />
          <div className={cn("min-w-0 flex-1 p-4", resolved && "opacity-70")}>
            <dl className="grid gap-x-4 gap-y-4 sm:grid-cols-2">
              <Field label="Severity">
                <SeverityBadge severity={incident.severity} />
              </Field>
              <Field label="Status">
                <StatusBadge status={incident.status} />
              </Field>
              <Field label="Reported">
                <span className="font-mono text-xs text-fg">
                  {new Date(incident.timestamp).toLocaleString("en-IN")}
                </span>
              </Field>
              <Field label="Reporter">
                <span className="text-[13px] text-fg">
                  {incident.reporterName || "Unknown citizen"}
                </span>
                <span className="mt-0.5 block break-all font-mono text-[11px] text-faint">
                  {incident.reporterID}
                </span>
              </Field>
              <div className="sm:col-span-2">
                <Field label="What's happening">
                  <p className="text-[13px] leading-relaxed text-fg">
                    {incident.description || (
                      <span className="text-muted">No description given.</span>
                    )}
                  </p>
                </Field>
              </div>
              {incident.assignedTo && (
                <Field label="Assigned to">
                  {assignedName ? (
                    <span className="text-[13px] text-fg">{assignedName}</span>
                  ) : (
                    <span className="break-all font-mono text-xs text-fg">
                      {incident.assignedTo}
                    </span>
                  )}
                </Field>
              )}
              {incident.resolveNote && (
                <div className="sm:col-span-2">
                  <Field label="Resolution note">
                    <p className="text-[13px] leading-relaxed text-fg">
                      {incident.resolveNote}
                    </p>
                  </Field>
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="space-y-4">
          {canAssign && incident.status !== "resolved" && (
            <Card>
              <CardHeader
                title="Assign responder"
                subtitle={
                  incident.assignedTo ? "Reassign to another team" : undefined
                }
              />
              {responders.length === 0 ? (
                <Notice>
                  No responders in this district yet. Add responder accounts to
                  assign this report.
                </Notice>
              ) : (
                <form onSubmit={handleAssign} className="space-y-3">
                  <Select
                    label="Responder"
                    value={assignTo}
                    onChange={(e) => setAssignTo(e.target.value)}
                    required
                    options={[
                      { value: "", label: "Choose a responder…" },
                      ...responders.map((r) => ({
                        value: r.userID,
                        label: r.name,
                      })),
                    ]}
                  />
                  <Button
                    type="submit"
                    loading={actionLoading}
                    disabled={!assignTo}
                    className="w-full"
                  >
                    Assign responder
                  </Button>
                </form>
              )}
            </Card>
          )}

          {canResolveIncidents(claims?.role ?? "citizen") &&
            incident.status !== "resolved" && (
              <Card>
                <CardHeader title="Resolve" />
                <form onSubmit={handleResolve} className="space-y-3">
                  <Textarea
                    label="What was done?"
                    placeholder="Action taken, outcome, anything to hand off…"
                    value={resolveNote}
                    onChange={(e) => setResolveNote(e.target.value)}
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    loading={actionLoading}
                    className="w-full"
                  >
                    Mark resolved
                  </Button>
                </form>
              </Card>
            )}

          <Card>
            <CardHeader
              title="Evidence"
              subtitle={evidence.length > 0 ? `${evidence.length} attached` : undefined}
            />
            {canUploadEvidence && (
              <label className="flex cursor-pointer flex-col items-center gap-2 rounded-md border border-dashed border-line py-6 transition-colors hover:border-muted hover:bg-raised">
                <Upload className="h-5 w-5 text-faint" />
                <span className="text-xs font-medium text-muted">
                  Add a photo or document
                </span>
                <input
                  type="file"
                  className="hidden"
                  accept="image/*,.pdf"
                  onChange={handleEvidenceUpload}
                />
              </label>
            )}
            {uploadStatus && (
              <p className="mt-2 text-xs text-muted">{uploadStatus}</p>
            )}
            {evidence.length > 0 && (
              <ul className="mt-3 grid grid-cols-2 gap-2">
                {evidence.map(({ key, url }) => {
                  const src = uploadedPreviews[key] || evidenceURL(key, url);
                  const isImage = src && isImageEvidence(src, key);
                  return (
                    <li
                      key={key}
                      className="overflow-hidden rounded-md border border-line bg-raised"
                    >
                      {isImage ? (
                        <>
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={src}
                            alt={evidenceFilename(key)}
                            className="h-24 w-full object-cover"
                          />
                          <p className="truncate px-2 py-1.5 text-[11px] text-muted">
                            {evidenceFilename(key)}
                          </p>
                        </>
                      ) : (
                        <div className="flex h-full items-start gap-2 p-2">
                          {isImageEvidence("", key) ? (
                            <ImageIcon className="h-4 w-4 shrink-0 text-faint" />
                          ) : (
                            <FileText className="h-4 w-4 shrink-0 text-faint" />
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[11px] font-medium text-fg">
                              {evidenceFilename(key)}
                            </p>
                            <p className="mt-0.5 text-[10px] text-faint">
                              Preview unavailable
                            </p>
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </Card>
        </div>
      </div>

      {actionNotice && !error && (
        <div className="mt-4">
          <Notice>{actionNotice}</Notice>
        </div>
      )}
      {error && (
        <div className="mt-4">
          <Notice>{error}</Notice>
        </div>
      )}
    </>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-w-0">
      <dt className="mb-1 font-mono text-[10px] uppercase tracking-wider text-muted">
        {label}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <Skeleton className="mb-3 h-3 w-24" />
      <Skeleton className="mb-5 h-6 w-64" />
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 rounded-md border border-line bg-surface p-4 lg:col-span-2">
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="space-y-2">
                <Skeleton className="h-2.5 w-16" />
                <Skeleton className="h-4 w-32" />
              </div>
            ))}
          </div>
          <Skeleton className="h-16 w-full" />
        </div>
        <div className="space-y-4">
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-40 w-full" />
        </div>
      </div>
    </>
  );
}

function evidenceFilename(key: string): string {
  return key.split("/").at(-1)?.replace(/^[a-f0-9-]+-/, "") ?? "Evidence file";
}

function evidenceItems(incident: Incident): { key: string; url?: string }[] {
  return (
    incident.evidenceFiles ??
    incident.evidenceKeys?.map((key) => ({ key })) ??
    []
  );
}

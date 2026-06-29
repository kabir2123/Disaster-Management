import { apiRequest } from "@/lib/api/client";
import type { EvidenceResponse, Incident } from "@/lib/types/models";

export interface ReportIncidentPayload {
  severity: number;
  location: string;
  description: string;
  districtID?: string;
}

export function listIncidents(districtID: string) {
  return apiRequest<Incident[]>(`/incident/${districtID}`, { method: "GET" });
}

export function getIncident(districtID: string, incidentID: string) {
  return apiRequest<Incident>(`/incident/${districtID}/${incidentID}`, {
    method: "GET",
  });
}

export function reportIncident(payload: ReportIncidentPayload) {
  return apiRequest<Incident>("/incident/report", {
    method: "POST",
    body: payload,
  });
}

export function assignIncident(
  districtID: string,
  incidentID: string,
  assignedTo: string
) {
  return apiRequest<Incident>(`/incident/${districtID}/${incidentID}/assign`, {
    method: "PATCH",
    body: { assignedTo },
  });
}

export function resolveIncident(
  districtID: string,
  incidentID: string,
  note: string
) {
  return apiRequest<Incident>(`/incident/${districtID}/${incidentID}/resolve`, {
    method: "PATCH",
    body: { note },
  });
}

export function requestEvidenceUpload(
  districtID: string,
  incidentID: string,
  filename: string
) {
  return apiRequest<EvidenceResponse>(
    `/incident/${districtID}/${incidentID}/evidence`,
    {
      method: "POST",
      body: { filename },
    }
  );
}

export async function uploadEvidenceFile(
  uploadURL: string,
  file: File
): Promise<void> {
  if (uploadURL.startsWith("local-evidence://")) {
    const key = uploadURL.replace("local-evidence://", "");
    localStorage.setItem(localEvidenceStorageKey(key), await fileToDataURL(file));
    return;
  }

  const response = await fetch(uploadURL, {
    method: "PUT",
    body: file,
    headers: { "Content-Type": file.type || "application/octet-stream" },
  });
  if (!response.ok) {
    throw new Error("Failed to upload evidence to storage");
  }
}

export function getLocalEvidenceDataURL(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(localEvidenceStorageKey(key));
}

function localEvidenceStorageKey(key: string): string {
  return `resq_evidence:${key}`;
}

function fileToDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

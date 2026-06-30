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
  const key = evidenceKeyFromUploadURL(uploadURL);
  const previewDataURL = await fileToDataURL(file);

  if (uploadURL.startsWith("local-evidence://")) {
    localStorage.setItem(localEvidenceStorageKey(key), previewDataURL);
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

  if (key) {
    localStorage.setItem(localEvidenceStorageKey(key), previewDataURL);
  }
}

export function getLocalEvidenceDataURL(key: string): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(localEvidenceStorageKey(key));
}

export function evidenceURL(key: string, url?: string): string {
  const localDataURL = getLocalEvidenceDataURL(key);
  if (localDataURL) return localDataURL;
  if (url?.startsWith("local-evidence://")) return "";
  return url ?? "";
}

export function isImageEvidence(src: string, key: string): boolean {
  if (src.startsWith("data:image/")) return true;
  return /\.(avif|gif|jpe?g|png|webp)$/i.test(key.split("?")[0]);
}

function localEvidenceStorageKey(key: string): string {
  return `resq_evidence:${key}`;
}

function evidenceKeyFromUploadURL(uploadURL: string): string {
  if (uploadURL.startsWith("local-evidence://")) {
    return uploadURL.replace("local-evidence://", "");
  }

  try {
    return decodeURIComponent(new URL(uploadURL).pathname.replace(/^\/+/, ""));
  } catch {
    return "";
  }
}

function fileToDataURL(file: File): Promise<string> {
  if (file.type.startsWith("image/")) {
    return imageFileToPreviewDataURL(file);
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function imageFileToPreviewDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read file"));
    reader.onload = () => {
      const source = String(reader.result);
      const image = new Image();
      image.onerror = () => resolve(source);
      image.onload = () => {
        const maxDimension = 1400;
        const scale = Math.min(
          1,
          maxDimension / Math.max(image.naturalWidth, image.naturalHeight)
        );
        if (scale === 1 && file.size < 1_500_000) {
          resolve(source);
          return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
        canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
        const context = canvas.getContext("2d");
        if (!context) {
          resolve(source);
          return;
        }

        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.82));
      };
      image.src = source;
    };
    reader.readAsDataURL(file);
  });
}

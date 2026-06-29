import { apiRequest } from "@/lib/api/client";
import type { Resource, ResourceAvailability } from "@/lib/types/models";

export interface RegisterResourcePayload {
  type: string;
  capacity: number;
  districtID?: string;
  coordinatorID?: string;
}

export function listResources(districtID: string) {
  return apiRequest<Resource[]>(`/resource/${districtID}`, { method: "GET" });
}

export function registerResource(payload: RegisterResourcePayload) {
  return apiRequest<Resource>("/resource/register", {
    method: "POST",
    body: payload,
  });
}

export function updateResourceStatus(
  districtID: string,
  resourceID: string,
  availability: ResourceAvailability
) {
  return apiRequest<Resource>(`/resource/${districtID}/${resourceID}/status`, {
    method: "PATCH",
    body: { availability },
  });
}

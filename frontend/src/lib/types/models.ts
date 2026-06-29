export type Role = "citizen" | "responder" | "admin" | "coordinator";

export type IncidentStatus =
  | "open"
  | "assigned"
  | "in_progress"
  | "resolved"
  | "escalated";

export type ResourceAvailability =
  | "available"
  | "assigned"
  | "depleted"
  | "offline";

export interface JwtClaims {
  userID: string;
  role: Role;
  districtID: string;
  exp: number;
  iat: number;
}

export interface User {
  userID: string;
  contact: string;
  role: Role;
  districtID: string;
  name: string;
  createdAt: string;
}

export interface Incident {
  districtID: string;
  incidentID: string;
  timestamp: string;
  updatedAt: string;
  reporterID: string;
  severity: number;
  location: string;
  description: string;
  status: IncidentStatus;
  assignedTo?: string;
  evidenceKeys?: string[];
  resolveNote?: string;
}

export interface Resource {
  districtID: string;
  resourceID: string;
  type: string;
  capacity: number;
  availability: ResourceAvailability;
  coordinatorID: string;
  createdAt: string;
}

export interface ApiError {
  error: string;
}

export interface LoginResponse {
  token: string;
}

export interface RegisterResponse {
  userID: string;
  role: Role;
  districtID: string;
}

export interface EvidenceResponse {
  uploadURL: string;
  key: string;
}

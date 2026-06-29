import { apiRequest } from "@/lib/api/client";
import type {
  LoginResponse,
  RegisterResponse,
  Role,
} from "@/lib/types/models";

export interface LoginPayload {
  contact: string;
  password: string;
}

export interface RegisterPayload {
  name: string;
  contact: string;
  password: string;
  role: Role;
  districtID: string;
}

export function login(payload: LoginPayload) {
  return apiRequest<LoginResponse>("/auth/login", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function register(payload: RegisterPayload) {
  return apiRequest<RegisterResponse>("/auth/register", {
    method: "POST",
    body: payload,
    auth: false,
  });
}

export function checkHealth() {
  return apiRequest<{ status: string }>("/health", {
    method: "GET",
    auth: false,
  });
}

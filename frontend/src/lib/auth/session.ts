import type { JwtClaims } from "@/lib/types/models";

const TOKEN_KEY = "resq_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken(): void {
  localStorage.removeItem(TOKEN_KEY);
}

export function decodeToken(token: string): JwtClaims | null {
	try {
		const payload = token.split(".")[1];
		if (!payload) return null;
		const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
		const padded = normalized.padEnd(
			normalized.length + ((4 - (normalized.length % 4)) % 4),
			"="
		);
		const json = atob(padded);
		return JSON.parse(json) as JwtClaims;
	} catch {
		return null;
	}
}

export function getClaims(): JwtClaims | null {
  const token = getToken();
  if (!token) return null;
  const claims = decodeToken(token);
  if (!claims || claims.exp * 1000 < Date.now()) {
    clearToken();
    return null;
  }
  return claims;
}

export function isAuthenticated(): boolean {
  return getClaims() !== null;
}

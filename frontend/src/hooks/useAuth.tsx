"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
} from "react";
import { useRouter } from "next/navigation";
import { login as apiLogin } from "@/lib/api/auth";
import {
	clearToken,
	decodeToken,
	getClaims,
	getToken,
	setToken,
} from "@/lib/auth/session";
import type { JwtClaims } from "@/lib/types/models";

const AUTH_EVENT = "resq-auth-change";
let cachedToken: string | null = null;
let cachedClaims: JwtClaims | null = null;

function subscribeAuth(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => undefined;
  window.addEventListener(AUTH_EVENT, onStoreChange);
  window.addEventListener("storage", onStoreChange);
  return () => {
    window.removeEventListener(AUTH_EVENT, onStoreChange);
    window.removeEventListener("storage", onStoreChange);
  };
}

function getAuthSnapshot(): JwtClaims | null {
	const token = getToken();
	if (token === cachedToken) {
		return cachedClaims;
	}
	cachedToken = token;
	cachedClaims = getClaims();
	return cachedClaims;
}

function notifyAuthChange() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_EVENT));
  }
}

interface AuthContextValue {
  claims: JwtClaims | null;
  loading: boolean;
  login: (contact: string, password: string) => Promise<void>;
  logout: () => void;
  refresh: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const claims = useSyncExternalStore(
    subscribeAuth,
    getAuthSnapshot,
    () => null
  );
  const mounted = useSyncExternalStore(
    () => () => undefined,
    () => true,
    () => false
  );

  const refresh = useCallback(() => {
    notifyAuthChange();
  }, []);

  const login = useCallback(
    async (contact: string, password: string) => {
      const { token } = await apiLogin({ contact, password });
      setToken(token);
      decodeToken(token);
      notifyAuthChange();
      router.push("/dashboard");
    },
    [router]
  );

	const logout = useCallback(() => {
		clearToken();
		cachedToken = null;
		cachedClaims = null;
		notifyAuthChange();
		router.push("/login");
	}, [router]);

  const value = useMemo(
    () => ({ claims, loading: !mounted, login, logout, refresh }),
    [claims, mounted, login, logout, refresh]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}

export function useRequireAuth() {
  const auth = useAuth();
  const router = useRouter();

	useEffect(() => {
		if (!auth.loading && !getClaims()) {
			router.replace("/login");
		}
	}, [auth.loading, router]);

  return auth;
}

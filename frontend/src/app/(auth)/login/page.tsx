"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ApiClientError } from "@/lib/api/client";
import { useAuth } from "@/hooks/useAuth";
import { getToken } from "@/lib/auth/session";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";

export default function LoginPage() {
  const { login } = useAuth();
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getToken()) {
      window.location.href = "/dashboard";
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(contact.trim().toLowerCase(), password);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? "That email or password doesn't match. Check both and try again."
          : "Couldn't reach the server. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-fg">Sign in</h2>
        <p className="mt-0.5 text-xs text-muted">
          Use your district credentials to open the board.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Email or contact"
          type="text"
          placeholder="admin@ernakulam.test"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
          autoComplete="username"
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          autoComplete="current-password"
        />

        {error && <Notice>{error}</Notice>}

        <Button type="submit" loading={loading} className="w-full">
          Sign in
        </Button>
      </form>

      <div className="mt-4 rounded-md border border-line bg-surface px-3 py-2.5">
        <p className="font-mono text-[10px] uppercase tracking-wider text-faint">
          Demo login
        </p>
        <p className="mt-1 font-mono text-xs text-muted">
          admin@ernakulam.test · demo1234
        </p>
      </div>

      <p className="mt-4 text-center text-xs text-muted">
        No account yet?{" "}
        <Link href="/register" className="text-fg underline underline-offset-2">
          Register
        </Link>
      </p>
    </div>
  );
}

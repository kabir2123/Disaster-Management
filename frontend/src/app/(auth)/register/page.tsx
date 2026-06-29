"use client";

import { useState } from "react";
import Link from "next/link";
import { Shield } from "lucide-react";
import { ApiClientError } from "@/lib/api/client";
import { register as apiRegister } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import type { Role } from "@/lib/types/models";

const ROLES: { value: Role; label: string }[] = [
  { value: "citizen", label: "Citizen" },
  { value: "responder", label: "Responder" },
  { value: "admin", label: "District Admin" },
  { value: "coordinator", label: "Relief Coordinator" },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("citizen");
  const [districtID, setDistrictID] = useState("district-a");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const normalizedContact = contact.trim().toLowerCase();
      await apiRegister({
        name: name.trim(),
        contact: normalizedContact,
        password,
        role,
        districtID: districtID.trim(),
      });
      try {
        await login(normalizedContact, password);
      } catch {
        setError("Account created. Sign in with the same contact and password.");
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Card padding="lg" className="border-0 shadow-[var(--card-shadow)]">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-white">
          <Shield className="h-7 w-7" />
        </div>
        <h2 className="text-2xl font-bold text-foreground">Create account</h2>
        <p className="mt-2 text-sm text-muted">
          Join your district&apos;s emergency response network
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Full name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <Input
          label="Email or contact"
          value={contact}
          onChange={(e) => setContact(e.target.value)}
          required
        />
        <Input
          label="Password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
          minLength={8}
        />
        <Select
          label="Role"
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          options={ROLES}
        />
        <Input
          label="District ID"
          value={districtID}
          onChange={(e) => setDistrictID(e.target.value)}
          required
          placeholder="district-a"
        />

        {error && (
          <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm font-medium text-danger">
            {error}
          </p>
        )}

        <Button type="submit" loading={loading} className="w-full" size="lg">
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted">
        Already registered?{" "}
        <Link href="/login" className="font-bold text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </Card>
  );
}

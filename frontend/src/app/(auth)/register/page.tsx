"use client";

import { useState } from "react";
import Link from "next/link";
import { ApiClientError } from "@/lib/api/client";
import { register as apiRegister } from "@/lib/api/auth";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Input, Select } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import type { Role } from "@/lib/types/models";

const ROLES: { value: Role; label: string }[] = [
  { value: "citizen", label: "Citizen — report and track" },
  { value: "responder", label: "Responder — work assigned reports" },
  { value: "admin", label: "District admin — assign and resolve" },
  { value: "coordinator", label: "Coordinator — manage resources" },
];

export default function RegisterPage() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<Role>("citizen");
  const [districtID, setDistrictID] = useState("ernakulam");
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
        setError("Account created. Sign in with the same email and password.");
      }
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : "Couldn't create the account. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-fg">Create account</h2>
        <p className="mt-0.5 text-xs text-muted">
          Join a district&apos;s response board.
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
          label="District"
          value={districtID}
          onChange={(e) => setDistrictID(e.target.value)}
          required
          placeholder="ernakulam"
        />

        {error && <Notice>{error}</Notice>}

        <Button type="submit" loading={loading} className="w-full">
          Create account
        </Button>
      </form>

      <p className="mt-4 text-center text-xs text-muted">
        Already have an account?{" "}
        <Link href="/login" className="text-fg underline underline-offset-2">
          Sign in
        </Link>
      </p>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ApiClientError } from "@/lib/api/client";
import { registerResource } from "@/lib/api/resources";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const RESOURCE_TYPES = [
  "vehicle",
  "shelter",
  "medical",
  "food",
  "water",
  "rescue_boat",
  "generator",
];

export default function RegisterResourcePage() {
  const router = useRouter();
  const { claims } = useAuth();
  const [type, setType] = useState("vehicle");
  const [capacity, setCapacity] = useState("10");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      await registerResource({
        type,
        capacity: parseInt(capacity, 10),
        districtID: claims?.districtID,
      });
      router.push("/resources");
    } catch (err) {
      setError(
        err instanceof ApiClientError ? err.message : "Registration failed"
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Register Resource"
        subtitle="Add vehicles, shelters, supplies, or equipment to your district inventory"
      />

      <Card className="max-w-lg">
        <CardHeader
          title="New Resource"
          subtitle="Resources are visible to admins, coordinators, and responders"
        />

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-foreground mb-2">
              Resource Type
            </label>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setType(t)}
                  className={`rounded-xl border-2 px-3 py-2.5 text-sm font-semibold capitalize transition-all ${
                    type === t
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border text-muted hover:border-primary/30"
                  }`}
                >
                  {t.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <Input
            label="Capacity"
            type="number"
            min={1}
            value={capacity}
            onChange={(e) => setCapacity(e.target.value)}
            required
          />

          {error && (
            <p className="rounded-xl bg-danger/10 px-4 py-3 text-sm text-danger">
              {error}
            </p>
          )}

          <Button type="submit" loading={loading}>
            Register Resource
          </Button>
        </form>
      </Card>
    </>
  );
}

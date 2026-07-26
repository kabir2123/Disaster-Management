"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Header } from "@/components/layout/Header";
import { ApiClientError } from "@/lib/api/client";
import { registerResource } from "@/lib/api/resources";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { Notice } from "@/components/ui/States";
import { cn } from "@/lib/utils";

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
        err instanceof ApiClientError
          ? err.message
          : "Couldn't add the resource. Check your connection and try again."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Header
        title="Add resource"
        subtitle="Register a boat, shelter, vehicle, or supply so it can be tracked and assigned"
      />

      <Card className="max-w-xl">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <label className="block text-xs font-medium text-muted">Type</label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
              {RESOURCE_TYPES.map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-[13px] capitalize transition-colors",
                    type === t
                      ? "border-muted bg-raised font-medium text-fg"
                      : "border-line text-muted hover:border-muted"
                  )}
                >
                  {t.replace(/_/g, " ")}
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

          {error && <Notice>{error}</Notice>}

          <Button type="submit" loading={loading}>
            Add resource
          </Button>
        </form>
      </Card>
    </>
  );
}

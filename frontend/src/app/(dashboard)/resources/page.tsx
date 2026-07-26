"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PackageOpen, ServerCrash } from "lucide-react";
import { Header } from "@/components/layout/Header";
import {
  ResourceTable,
  ResourceListSkeleton,
} from "@/components/resources/ResourceTable";
import { EmptyState, ErrorState, Notice } from "@/components/ui/States";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/hooks/useAuth";
import { canManageResources } from "@/lib/auth/roles";
import { listResources, updateResourceStatus } from "@/lib/api/resources";
import type { Resource, ResourceAvailability } from "@/lib/types/models";

type LoadState = "loading" | "ready" | "error";

export default function ResourcesPage() {
  const { claims } = useAuth();
  const districtID = claims?.districtID ?? "";
  const role = claims?.role ?? "citizen";
  const [resources, setResources] = useState<Resource[]>([]);
  const [state, setState] = useState<LoadState>("loading");
  const [notice, setNotice] = useState("");

  const canEdit = canManageResources(role);

  function reload() {
    if (!districtID) return;
    setState("loading");
    listResources(districtID)
      .then((items) => {
        setResources(items);
        setState("ready");
      })
      .catch(() => setState("error"));
  }

  useEffect(() => {
    reload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [districtID]);

  async function handleStatusChange(
    resourceID: string,
    availability: ResourceAvailability
  ) {
    setNotice("");
    try {
      const updated = await updateResourceStatus(districtID, resourceID, availability);
      setResources((prev) =>
        prev.map((r) => (r.resourceID === resourceID ? updated : r))
      );
    } catch {
      setNotice("Couldn't update that resource. Check your connection and try again.");
    }
  }

  const districtLabel = districtID.charAt(0).toUpperCase() + districtID.slice(1);
  const available = resources.filter((r) => r.availability === "available").length;

  return (
    <>
      <Header
        title="Resources"
        subtitle={
          state === "ready"
            ? `${resources.length} assets · ${available} available · ${districtLabel}`
            : districtLabel
        }
        actions={
          canEdit ? (
            <Link href="/resources/register">
              <Button size="md">Add resource</Button>
            </Link>
          ) : undefined
        }
      />

      {notice && (
        <div className="mb-4">
          <Notice>{notice}</Notice>
        </div>
      )}

      {state === "loading" ? (
        <ResourceListSkeleton rows={8} />
      ) : state === "error" ? (
        <ErrorState
          icon={ServerCrash}
          title="Couldn't load resources"
          message="The resource service didn't respond. Retry, or check the API connection."
          onRetry={reload}
        />
      ) : resources.length === 0 ? (
        <EmptyState
          icon={PackageOpen}
          title="No resources registered yet"
          description="Add boats, shelters, vehicles, and supplies so they can be tracked and assigned during a response."
          action={
            canEdit ? (
              <Link href="/resources/register">
                <Button size="sm">Add the first resource</Button>
              </Link>
            ) : undefined
          }
        />
      ) : (
        <ResourceTable
          resources={resources}
          canEdit={canEdit}
          onStatusChange={handleStatusChange}
        />
      )}
    </>
  );
}

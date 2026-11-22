import React, { useEffect, useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { AddStaffForm } from "../components/AddStaffForm";
import { listStaff } from "../staff.api";
import type { StaffMember } from "../types";

function labelRole(role: string): string {
  return role.replace(/_/g, " ");
}

function roleVariant(role: string): "success" | "warning" | "info" | "neutral" {
  if (role === "admin") return "success";
  if (role === "sales") return "info";
  if (role === "technician") return "warning";
  return "neutral";
}

export const StaffPage: React.FC = () => {
  const [rows, setRows] = useState<StaffMember[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);

  const load = () => {
    setIsLoading(true);
    setError(null);
    listStaff()
      .then((response) => setRows(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load staff."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div>
      <PageHeader
        title="Staff"
        description="People who can sign in to the SunPower operations portal."
        actions={
          showForm ? undefined : (
            <Button size="sm" onClick={() => {
              setCreatedNotice(null);
              setShowForm(true);
            }}>
              Add staff
            </Button>
          )
        }
      />

      {createdNotice && (
        <div style={{ padding: "12px var(--layout-gutter) 0" }}>
          <Alert variant="success" title="Staff created">
            {createdNotice}
          </Alert>
        </div>
      )}

      {showForm && (
        <div
          style={{
            margin: "16px var(--layout-gutter)",
            padding: "var(--space-4, 16px)",
            backgroundColor: "var(--card)",
            border: "var(--border-default)",
            borderRadius: "var(--radius-card, 6px)",
            maxWidth: 720
          }}
        >
          <AddStaffForm
            onCancel={() => setShowForm(false)}
            onCreated={(member) => {
              setShowForm(false);
              setCreatedNotice(`${member.name} (${member.email}) can sign in with the password you set.`);
              load();
            }}
          />
        </div>
      )}

      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={load}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}

      {isLoading && <SkeletonRows testId="staff-skeleton" />}

      {!isLoading && !error && rows.length === 0 && (
        <div data-testid="staff-empty" style={{ padding: "32px var(--layout-gutter)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No staff yet</h2>
          <p style={{ margin: "0 0 12px", color: "var(--text-muted)" }}>
            Add your first sales, warehouse, technician, or support account.
          </p>
          {!showForm && (
            <Button size="sm" onClick={() => setShowForm(true)}>
              Add staff
            </Button>
          )}
        </div>
      )}

      {!isLoading && !error && rows.length > 0 && (
        <Table
          data={rows}
          keyExtractor={(item) => item.id}
          columns={[
            { key: "name", header: "Name", render: (item) => item.name },
            { key: "email", header: "Email", render: (item) => item.email },
            {
              key: "role",
              header: "Role",
              render: (item) => <Badge variant={roleVariant(item.role)}>{labelRole(item.role)}</Badge>
            },
            { key: "id", header: "User ID", render: (item) => item.id }
          ]}
        />
      )}
    </div>
  );
};

import React, { useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { createInquiryQuestion, deleteInquiryQuestion, updateInquiryQuestion } from "../inquiry-form.api";
import { useInquiryQuestions } from "../hooks/useInquiryQuestions";
import type { InquiryFieldType, InquiryMapsTo, InquiryOption, InquiryQuestion } from "../types";

const FIELD_TYPES: { value: InquiryFieldType; label: string }[] = [
  { value: "single_choice", label: "Single choice" },
  { value: "select", label: "Select" },
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "boolean", label: "Yes / No" }
];

const MAPS_TO: { value: string; label: string }[] = [
  { value: "", label: "Notes only" },
  { value: "requestedKw", label: "Requested kW" },
  { value: "systemKind", label: "System kind" },
  { value: "wantsSubsidy", label: "Wants subsidy" },
  { value: "monthlyBillInr", label: "Monthly bill (INR)" },
  { value: "roofAreaSqft", label: "Roof area (sqft)" },
  { value: "gridSuitable", label: "Grid suitable" }
];

type FormState = {
  key: string;
  label: string;
  helpText: string;
  fieldType: InquiryFieldType;
  options: InquiryOption[];
  mapsTo: string;
  sortOrder: string;
  isRequired: boolean;
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  key: "",
  label: "",
  helpText: "",
  fieldType: "single_choice",
  options: [
    { value: "option_a", label: "Option A" },
    { value: "option_b", label: "Option B" }
  ],
  mapsTo: "",
  sortOrder: "100",
  isRequired: true,
  isActive: true
});

function fromQuestion(question: InquiryQuestion): FormState {
  return {
    key: question.key,
    label: question.label,
    helpText: question.helpText ?? "",
    fieldType: question.fieldType,
    options: question.options?.length
      ? question.options.map((opt) => ({ ...opt }))
      : [
          { value: "option_a", label: "Option A" },
          { value: "option_b", label: "Option B" }
        ],
    mapsTo: question.mapsTo ?? "",
    sortOrder: String(question.sortOrder),
    isRequired: question.isRequired,
    isActive: question.isActive
  };
}

function needsOptions(fieldType: InquiryFieldType): boolean {
  return fieldType === "single_choice" || fieldType === "select";
}

export const InquiryFormAdminPage: React.FC = () => {
  const { data, isLoading, error, refetch } = useInquiryQuestions();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<InquiryQuestion | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm());
    setFormError(null);
    setOpen(true);
  };

  const openEdit = (question: InquiryQuestion) => {
    setEditing(question);
    setForm(fromQuestion(question));
    setFormError(null);
    setOpen(true);
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    const payload = {
      key: form.key.trim(),
      label: form.label.trim(),
      helpText: form.helpText.trim() || null,
      fieldType: form.fieldType,
      options: needsOptions(form.fieldType) ? form.options : null,
      mapsTo: (form.mapsTo || null) as InquiryMapsTo,
      sortOrder: Number(form.sortOrder),
      isRequired: form.isRequired,
      isActive: form.isActive
    };
    try {
      if (editing) {
        await updateInquiryQuestion(editing.id, payload);
      } else {
        await createInquiryQuestion(payload);
      }
      setOpen(false);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not save question.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (question: InquiryQuestion) => {
    setSaving(true);
    setFormError(null);
    try {
      await deleteInquiryQuestion(question.id);
      await refetch();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Could not remove question.");
    } finally {
      setSaving(false);
    }
  };

  const updateOption = (index: number, patch: Partial<InquiryOption>) => {
    setForm((prev) => ({
      ...prev,
      options: prev.options.map((opt, i) => (i === index ? { ...opt, ...patch } : opt))
    }));
  };

  return (
    <div>
      <PageHeader
        title="Inquiry form"
        description="Questions shown on the public rooftop survey. Contact fields stay fixed."
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => void refetch()} isLoading={isLoading}>
              Refresh
            </Button>
            <Button size="sm" onClick={openCreate}>
              Add question
            </Button>
          </>
        }
      />

      {error && (
        <div style={{ padding: "0 var(--layout-gutter) 12px" }}>
          <Alert variant="danger" title="Could not load questions">
            {error.message}{" "}
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        </div>
      )}

      {formError && !open && (
        <div style={{ padding: "0 var(--layout-gutter) 12px" }}>
          <Alert variant="danger" title="Action failed">
            {formError}
          </Alert>
        </div>
      )}

      {isLoading && <SkeletonRows testId="inquiry-form-skeleton" rows={8} />}

      {!isLoading && !error && data.length === 0 && (
        <div data-testid="inquiry-form-empty" style={{ padding: "24px var(--layout-gutter)" }}>
          <h2 style={{ margin: "0 0 8px", fontSize: "var(--text-lg)" }}>No survey questions yet</h2>
          <p style={{ margin: "0 0 16px", color: "var(--text-muted)" }}>
            Add the first question to build the public rooftop survey.
          </p>
          <Button onClick={openCreate}>Add question</Button>
        </div>
      )}

      {!isLoading && data.length > 0 && (
        <Table
          data={data}
          keyExtractor={(item) => item.id}
          emptyMessage="No survey questions yet."
          columns={[
            { key: "sortOrder", header: "Order", render: (item) => String(item.sortOrder) },
            { key: "label", header: "Label", render: (item) => item.label },
            { key: "key", header: "Key", isMono: true, render: (item) => item.key },
            { key: "fieldType", header: "Type", render: (item) => item.fieldType },
            { key: "mapsTo", header: "Maps to", render: (item) => item.mapsTo ?? "notes" },
            {
              key: "status",
              header: "Status",
              render: (item) => (
                <Badge variant={item.isActive ? "success" : "warning"}>{item.isActive ? "Active" : "Inactive"}</Badge>
              )
            },
            {
              key: "actions",
              header: "",
              align: "right",
              render: (item) => (
                <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end" }}>
                  <Button variant="outline" size="sm" onClick={() => openEdit(item)}>
                    Edit
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => void remove(item)} disabled={saving}>
                    Remove
                  </Button>
                </div>
              )
            }
          ]}
        />
      )}

      <Dialog open={open} onClose={() => setOpen(false)} title={editing ? "Edit question" : "Add question"}>
        <form onSubmit={save} style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "70vh", overflowY: "auto" }}>
          {formError && (
            <Alert variant="danger" title="Could not save">
              {formError}
            </Alert>
          )}
          <Input
            label="Key"
            required
            value={form.key}
            helperText="Stable id, e.g. roof_type"
            onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
          />
          <Input
            label="Label"
            required
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />
          <Input
            label="Help text"
            value={form.helpText}
            onChange={(event) => setForm((prev) => ({ ...prev, helpText: event.target.value }))}
          />
          <Select
            label="Field type"
            value={form.fieldType}
            options={FIELD_TYPES}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, fieldType: event.target.value as InquiryFieldType }))
            }
          />
          <Select
            label="Maps to enquiry field"
            value={form.mapsTo}
            options={MAPS_TO}
            onChange={(event) => setForm((prev) => ({ ...prev, mapsTo: event.target.value }))}
          />
          <Input
            label="Sort order"
            type="number"
            min={0}
            required
            value={form.sortOrder}
            onChange={(event) => setForm((prev) => ({ ...prev, sortOrder: event.target.value }))}
          />
          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.isRequired}
              onChange={(event) => setForm((prev) => ({ ...prev, isRequired: event.target.checked }))}
            />
            Required
          </label>
          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Active on public survey
          </label>

          {needsOptions(form.fieldType) && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <strong>Options</strong>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      options: [...prev.options, { value: `option_${prev.options.length + 1}`, label: "New option" }]
                    }))
                  }
                >
                  Add option
                </Button>
              </div>
              {form.options.map((opt, index) => (
                <div key={index} style={{ display: "grid", gap: "8px", borderTop: "1px solid var(--line)", paddingTop: "8px" }}>
                  <Input
                    label="Value"
                    value={opt.value}
                    onChange={(event) => updateOption(index, { value: event.target.value })}
                  />
                  <Input
                    label="Label"
                    value={opt.label}
                    onChange={(event) => updateOption(index, { label: event.target.value })}
                  />
                  <Input
                    label="Map value"
                    value={opt.mapValue === undefined ? "" : String(opt.mapValue)}
                    helperText="Optional number or true/false for column mapping"
                    onChange={(event) => {
                      const raw = event.target.value.trim();
                      if (!raw) {
                        updateOption(index, { mapValue: undefined });
                        return;
                      }
                      if (raw === "true" || raw === "false") {
                        updateOption(index, { mapValue: raw === "true" });
                        return;
                      }
                      const num = Number(raw);
                      updateOption(index, { mapValue: Number.isNaN(num) ? raw : num });
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      setForm((prev) => ({
                        ...prev,
                        options: prev.options.filter((_, i) => i !== index)
                      }))
                    }
                  >
                    Remove option
                  </Button>
                </div>
              ))}
            </div>
          )}

          <Button type="submit" isLoading={saving}>
            Save question
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

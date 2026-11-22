import React, { useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Dialog } from "../../../components/ui/Dialog";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { createInquiryQuestion, deleteInquiryQuestion, updateInquiryQuestion } from "../inquiry-form.api";
import { useInquiryQuestions } from "../hooks/useInquiryQuestions";
import type { InquiryOption, InquiryQuestion, InquiryQuestionInput } from "../types";

type FormState = {
  label: string;
  optionLabels: string[];
  isActive: boolean;
};

const emptyForm = (): FormState => ({
  label: "",
  optionLabels: ["", ""],
  isActive: true
});

function fromQuestion(question: InquiryQuestion): FormState {
  return {
    label: question.label,
    optionLabels: question.options?.length ? question.options.map((opt) => opt.label) : ["", ""],
    isActive: question.isActive
  };
}

/** Stable API key from the question text (lowercase snake_case). */
function slugifyKey(label: string, fallback = "question"): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .replace(/_+/g, "_");
  if (!slug) return fallback;
  return /^[a-z]/.test(slug) ? slug : `q_${slug}`;
}

function uniqueSlugs(labels: string[]): string[] {
  const used = new Set<string>();
  return labels.map((label, index) => {
    const base = slugifyKey(label, `option_${index + 1}`);
    let candidate = base;
    let n = 2;
    while (used.has(candidate)) {
      candidate = `${base}_${n}`;
      n += 1;
    }
    used.add(candidate);
    return candidate;
  });
}

function nextSortOrder(questions: InquiryQuestion[]): number {
  if (questions.length === 0) return 10;
  return Math.max(...questions.map((q) => q.sortOrder)) + 10;
}

function uniqueQuestionKey(label: string, questions: InquiryQuestion[]): string {
  const used = new Set(questions.map((q) => q.key));
  const base = slugifyKey(label);
  if (!used.has(base)) return base;
  let n = 2;
  while (used.has(`${base}_${n}`)) n += 1;
  return `${base}_${n}`;
}

function buildOptions(optionLabels: string[], existing?: InquiryOption[] | null): InquiryOption[] {
  const cleaned = optionLabels.map((label) => label.trim()).filter(Boolean);
  const values = uniqueSlugs(cleaned);
  return cleaned.map((label, index) => {
    const priorByLabel = existing?.find((opt) => opt.label.trim() === label);
    const value = priorByLabel?.value ?? values[index];
    const option: InquiryOption = { value, label };
    if (priorByLabel?.mapValue !== undefined) {
      option.mapValue = priorByLabel.mapValue;
    }
    return option;
  });
}

function buildCreatePayload(form: FormState, questions: InquiryQuestion[]): InquiryQuestionInput {
  return {
    key: uniqueQuestionKey(form.label, questions),
    label: form.label.trim(),
    helpText: null,
    fieldType: "single_choice",
    options: buildOptions(form.optionLabels),
    mapsTo: null,
    sortOrder: nextSortOrder(questions),
    isRequired: true,
    isActive: form.isActive
  };
}

function buildUpdatePayload(form: FormState, existing: InquiryQuestion): InquiryQuestionInput {
  return {
    key: existing.key,
    label: form.label.trim(),
    helpText: existing.helpText,
    fieldType: "single_choice",
    options: buildOptions(form.optionLabels, existing.options),
    mapsTo: existing.mapsTo,
    sortOrder: existing.sortOrder,
    isRequired: existing.isRequired,
    isActive: form.isActive
  };
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

    const label = form.label.trim();
    const options = buildOptions(form.optionLabels);
    if (!label) {
      setFormError("Enter the question text.");
      setSaving(false);
      return;
    }
    if (options.length < 2) {
      setFormError("Add at least two answer choices.");
      setSaving(false);
      return;
    }

    const payload = editing ? buildUpdatePayload(form, editing) : buildCreatePayload(form, data);

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
            Add the first multiple-choice question for the public rooftop survey.
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
            { key: "label", header: "Question", render: (item) => item.label },
            {
              key: "options",
              header: "Answers",
              render: (item) =>
                item.options?.length ? item.options.map((opt) => opt.label).join(", ") : "—"
            },
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
        <form
          onSubmit={save}
          style={{ display: "flex", flexDirection: "column", gap: "12px", maxHeight: "70vh", overflowY: "auto" }}
        >
          {formError && (
            <Alert variant="danger" title="Could not save">
              {formError}
            </Alert>
          )}

          <Input
            label="Question"
            required
            value={form.label}
            placeholder="e.g. What is your roof type?"
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
          />

          <p style={{ margin: 0, fontSize: "var(--text-sm)", color: "var(--text-muted)" }}>
            Answer type: multiple choice (visitor picks one option).
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>Answer choices</strong>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={() => setForm((prev) => ({ ...prev, optionLabels: [...prev.optionLabels, ""] }))}
              >
                Add choice
              </Button>
            </div>
            {form.optionLabels.map((optionLabel, index) => (
              <div
                key={index}
                style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "8px", alignItems: "end" }}
              >
                <Input
                  label={`Choice ${index + 1}`}
                  value={optionLabel}
                  placeholder="e.g. Concrete terrace"
                  onChange={(event) =>
                    setForm((prev) => ({
                      ...prev,
                      optionLabels: prev.optionLabels.map((item, i) => (i === index ? event.target.value : item))
                    }))
                  }
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={form.optionLabels.length <= 2}
                  onClick={() =>
                    setForm((prev) => ({
                      ...prev,
                      optionLabels: prev.optionLabels.filter((_, i) => i !== index)
                    }))
                  }
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>

          <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <input
              type="checkbox"
              checked={form.isActive}
              onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
            />
            Show on public survey
          </label>

          <Button type="submit" isLoading={saving}>
            Save question
          </Button>
        </form>
      </Dialog>
    </div>
  );
};

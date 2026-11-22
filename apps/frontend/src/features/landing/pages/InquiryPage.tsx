import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { Skeleton } from "../../../components/ui/Skeleton";
import { submitPublicEnquiry } from "../../catalog/catalog.api";
import { usePublicInquiryForm } from "../../inquiry-form/hooks/usePublicInquiryForm";
import type { InquiryQuestionPublic } from "../../inquiry-form/types";
import { ChoiceGroup } from "../components/ChoiceGroup";

const CONTACT_STEP = "__contact__";
const DEFAULT_REQUESTED_KW = 3;

type AnswerMap = Record<string, string | number | boolean>;

function questionAnswered(question: InquiryQuestionPublic, answers: AnswerMap): boolean {
  if (!(question.id in answers)) return !question.isRequired;
  const value = answers[question.id];
  if (question.fieldType === "boolean") return typeof value === "boolean" || value === "true" || value === "false";
  if (question.fieldType === "number") {
    const num = typeof value === "number" ? value : Number(value);
    return !Number.isNaN(num);
  }
  return String(value ?? "").trim().length > 0;
}

function deriveRequestedKw(questions: InquiryQuestionPublic[], answers: AnswerMap): number {
  const mapped = questions.find((question) => question.mapsTo === "requestedKw");
  if (!mapped || !(mapped.id in answers)) return DEFAULT_REQUESTED_KW;
  const raw = answers[mapped.id];
  const num = typeof raw === "number" ? raw : Number(raw);
  return Number.isNaN(num) || num <= 0 ? DEFAULT_REQUESTED_KW : num;
}

export const InquiryPage: React.FC = () => {
  const { questions, isLoading, error: formError, refetch } = usePublicInquiryForm();
  const steps = useMemo(() => [...questions.map((question) => question.id), CONTACT_STEP], [questions]);
  const [stepIndex, setStepIndex] = useState(0);
  const [answers, setAnswers] = useState<AnswerMap>({});

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [pincode, setPincode] = useState("");

  const [fieldError, setFieldError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const safeStepIndex = Math.min(stepIndex, Math.max(steps.length - 1, 0));
  const currentStepId = steps[safeStepIndex] ?? CONTACT_STEP;
  const currentQuestion = questions.find((question) => question.id === currentStepId) ?? null;
  const isContact = currentStepId === CONTACT_STEP;
  const progress = steps.length > 0 ? Math.round(((safeStepIndex + 1) / steps.length) * 100) : 100;

  const contactReady = Boolean(name.trim() && phone.trim().length >= 8 && addressLine.trim() && city.trim());

  const canAdvance = (): boolean => {
    if (isContact) return contactReady;
    if (!currentQuestion) return false;
    return questionAnswered(currentQuestion, answers);
  };

  const setAnswer = (questionId: string, value: string | number | boolean) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    setFieldError(null);
  };

  const goNext = () => {
    if (!canAdvance()) {
      setFieldError(currentQuestion?.isRequired ? "Please answer this question." : null);
      return;
    }
    setStepIndex((index) => Math.min(index + 1, steps.length - 1));
  };

  const goBack = () => {
    setError(null);
    setFieldError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isContact) {
      goNext();
      return;
    }
    if (!contactReady) {
      setFieldError("Fill name, phone, address, and city.");
      return;
    }

    const payloadAnswers = questions
      .filter((question) => question.id in answers)
      .map((question) => ({
        questionId: question.id,
        value: answers[question.id]
      }));

    setFieldError(null);
    setIsSubmitting(true);
    setError(null);
    try {
      const response = await submitPublicEnquiry({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        addressLine: addressLine.trim(),
        city: city.trim(),
        pincode: pincode.trim() || undefined,
        customerType: "residential",
        requestedKw: deriveRequestedKw(questions, answers),
        answers: payloadAnswers
      });
      setDoneId(response.data.enquiry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the inquiry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderQuestion = (question: InquiryQuestionPublic) => {
    const value = answers[question.id];
    if (question.fieldType === "single_choice") {
      return (
        <ChoiceGroup
          label={question.label}
          value={typeof value === "string" ? value : ""}
          onChange={(next) => setAnswer(question.id, next)}
          columns={question.options && question.options.length > 3 ? 1 : 2}
          options={(question.options ?? []).map((opt) => ({ value: opt.value, label: opt.label }))}
        />
      );
    }
    if (question.fieldType === "select") {
      return (
        <Select
          label={question.label}
          value={typeof value === "string" ? value : ""}
          helperText={question.helpText ?? undefined}
          onChange={(event) => setAnswer(question.id, event.target.value)}
          options={[
            { value: "", label: "Select…" },
            ...(question.options ?? []).map((opt) => ({ value: opt.value, label: opt.label }))
          ]}
        />
      );
    }
    if (question.fieldType === "number") {
      return (
        <Input
          label={question.label}
          required={question.isRequired}
          type="number"
          step="0.1"
          value={value === undefined ? "" : String(value)}
          helperText={question.helpText ?? undefined}
          onChange={(event) => setAnswer(question.id, event.target.value)}
        />
      );
    }
    if (question.fieldType === "boolean") {
      const checked = value === true || value === "true";
      return (
        <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "var(--text-base, 15px)" }}>
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => setAnswer(question.id, event.target.checked)}
          />
          {question.label}
        </label>
      );
    }
    return (
      <Input
        label={question.label}
        required={question.isRequired}
        value={typeof value === "string" ? value : ""}
        helperText={question.helpText ?? undefined}
        onChange={(event) => setAnswer(question.id, event.target.value)}
      />
    );
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--page)" }}>
      <header
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          minHeight: "var(--navbar-height)",
          padding: "0 var(--layout-gutter)",
          borderBottom: "var(--border-default)"
        }}
      >
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <BrandMark />
        </Link>
        <Link to="/login" style={{ fontWeight: 600 }}>
          Sign in
        </Link>
      </header>

      <main
        style={{
          width: "min(640px, 100%)",
          margin: "0 auto",
          padding: "var(--space-6, 24px) var(--layout-gutter) var(--space-8, 32px)"
        }}
      >
        <h1 style={{ margin: "0 0 4px", fontSize: "var(--text-xl, 22px)", fontWeight: 650, color: "var(--text)" }}>
          Free rooftop solar survey
        </h1>
        <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
          {isLoading
            ? "Loading survey questions…"
            : `Step ${safeStepIndex + 1} of ${Math.max(steps.length, 1)}. Answer a few roof questions, then leave your contact details.`}
        </p>

        {isLoading && (
          <div data-testid="inquiry-form-public-skeleton" style={{ display: "grid", gap: "12px" }}>
            <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.45 } 50% { opacity: 0.9 } }`}</style>
            <Skeleton height={6} />
            <Skeleton height={28} width="70%" />
            <Skeleton height={48} />
            <Skeleton height={48} />
          </div>
        )}

        {formError && (
          <Alert variant="danger" title="Could not load survey">
            {formError.message}{" "}
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              Retry
            </Button>
          </Alert>
        )}

        {!isLoading && !formError && !doneId && (
          <div
            aria-hidden="true"
            style={{
              height: "6px",
              backgroundColor: "var(--line)",
              borderRadius: "var(--radius-badge)",
              marginBottom: "24px",
              overflow: "hidden"
            }}
          >
            <div
              style={{
                width: `${progress}%`,
                height: "100%",
                backgroundColor: "var(--brand)",
                transition: "var(--transition-fast)"
              }}
            />
          </div>
        )}

        {doneId && (
          <Alert variant="success" title="Inquiry received">
            Reference {doneId}. A sales person will follow up on this number. You can{" "}
            <Link to="/">return to packages</Link>.
          </Alert>
        )}

        {error && (
          <div style={{ marginBottom: "12px" }}>
            <Alert variant="danger" title="Could not send">
              {error}
            </Alert>
          </div>
        )}

        {!isLoading && !formError && !doneId && (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {currentQuestion && renderQuestion(currentQuestion)}

            {isContact && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>How can we reach you?</h2>
                {fieldError && (
                  <Alert variant="danger" title="Missing details">
                    {fieldError}
                  </Alert>
                )}
                <Input label="Full name" required value={name} onChange={(event) => setName(event.target.value)} />
                <Input label="WhatsApp / phone" required value={phone} onChange={(event) => setPhone(event.target.value)} />
                <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
                <Input
                  label="Address"
                  required
                  value={addressLine}
                  onChange={(event) => setAddressLine(event.target.value)}
                />
                <Input label="City" required value={city} onChange={(event) => setCity(event.target.value)} />
                <Input label="PIN code" value={pincode} onChange={(event) => setPincode(event.target.value)} />
              </div>
            )}

            {!isContact && fieldError && (
              <Alert variant="danger" title="Answer needed">
                {fieldError}
              </Alert>
            )}

            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "8px" }}>
              <Button type="button" variant="outline" onClick={goBack} disabled={safeStepIndex === 0 || isSubmitting}>
                Back
              </Button>
              {isContact ? (
                <Button type="submit" isLoading={isSubmitting} disabled={!canAdvance()}>
                  Submit inquiry
                </Button>
              ) : (
                <Button type="button" onClick={goNext} disabled={!canAdvance()}>
                  Next
                </Button>
              )}
            </div>
          </form>
        )}
      </main>
    </div>
  );
};

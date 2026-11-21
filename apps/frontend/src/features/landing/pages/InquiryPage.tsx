import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { submitPublicEnquiry } from "../../catalog/catalog.api";

/** Matches DB `requested_kw numeric(4, 1)` — max 999.9 */
const MIN_REQUESTED_KW = 0.5;
const MAX_REQUESTED_KW = 999.9;

function validateRequestedKw(raw: string): string | null {
  const value = Number(raw);
  if (!raw.trim() || Number.isNaN(value)) {
    return "Enter a system size in kW.";
  }
  if (value < MIN_REQUESTED_KW) {
    return `Requested kW must be at least ${MIN_REQUESTED_KW}.`;
  }
  if (value > MAX_REQUESTED_KW) {
    return `Requested kW must be at most ${MAX_REQUESTED_KW}.`;
  }
  return null;
}

export const InquiryPage: React.FC = () => {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("");
  const [pincode, setPincode] = useState("");
  const [customerType, setCustomerType] = useState("residential");
  const [requestedKw, setRequestedKw] = useState("3");
  const [systemKind, setSystemKind] = useState("on_grid");
  const [wantsSubsidy, setWantsSubsidy] = useState(false);
  const [notes, setNotes] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ requestedKw?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const requestedKwError = validateRequestedKw(requestedKw);
    if (requestedKwError) {
      setFieldErrors({ requestedKw: requestedKwError });
      setError(null);
      return;
    }
    setFieldErrors({});
    setIsLoading(true);
    setError(null);
    try {
      const response = await submitPublicEnquiry({
        name,
        phone,
        email: email || undefined,
        addressLine,
        city,
        pincode: pincode || undefined,
        customerType,
        requestedKw: Number(requestedKw),
        systemKind,
        wantsSubsidy,
        notes: notes || undefined
      });
      setDoneId(response.data.enquiry.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the inquiry.");
    } finally {
      setIsLoading(false);
    }
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
      <main style={{ width: "min(640px, 100%)", margin: "0 auto", padding: "var(--space-6, 24px) var(--layout-gutter) var(--space-8, 32px)" }}>
        <h1 style={{ margin: "0 0 8px", fontSize: "var(--text-xl, 22px)" }}>Inquiry</h1>
        <p style={{ margin: "0 0 20px", color: "var(--text-muted)" }}>
          Tell us the site and the system size. Sales will call, then a technician surveys the roof before any quote.
        </p>
        {doneId && (
          <Alert variant="success" title="Inquiry received">
            Reference {doneId}. A sales person will follow up on this number.
          </Alert>
        )}
        {error && (
          <div style={{ marginBottom: "12px" }}>
            <Alert variant="danger" title="Could not send">
              {error}
            </Alert>
          </div>
        )}
        {!doneId && (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <Input label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
            <Input label="Phone" required value={phone} onChange={(event) => setPhone(event.target.value)} />
            <Input label="Email" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
            <Input label="Address" required value={addressLine} onChange={(event) => setAddressLine(event.target.value)} />
            <Input label="City" required value={city} onChange={(event) => setCity(event.target.value)} />
            <Input label="Pincode" value={pincode} onChange={(event) => setPincode(event.target.value)} />
            <Select
              label="Customer type"
              value={customerType}
              onChange={(event) => setCustomerType(event.target.value)}
              options={[
                { value: "residential", label: "Residential" },
                { value: "commercial", label: "Commercial" }
              ]}
            />
            <Input
              label="Requested kW"
              required
              type="number"
              min={MIN_REQUESTED_KW}
              max={MAX_REQUESTED_KW}
              step="0.1"
              value={requestedKw}
              error={fieldErrors.requestedKw}
              helperText={`Between ${MIN_REQUESTED_KW} and ${MAX_REQUESTED_KW} kW`}
              onChange={(event) => {
                setRequestedKw(event.target.value);
                if (fieldErrors.requestedKw) {
                  setFieldErrors((prev) => ({ ...prev, requestedKw: undefined }));
                }
              }}
            />
            <Select
              label="System"
              value={systemKind}
              onChange={(event) => setSystemKind(event.target.value)}
              options={[
                { value: "on_grid", label: "On-grid" },
                { value: "off_grid", label: "Off-grid" }
              ]}
            />
            <label style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <input type="checkbox" checked={wantsSubsidy} onChange={(event) => setWantsSubsidy(event.target.checked)} />
              Wants subsidy
            </label>
            <Input label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
            <Button type="submit" isLoading={isLoading}>
              Submit inquiry
            </Button>
          </form>
        )}
      </main>
    </div>
  );
};

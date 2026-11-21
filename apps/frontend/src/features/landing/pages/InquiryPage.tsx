import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import { submitPublicEnquiry } from "../../catalog/catalog.api";
import { ChoiceGroup } from "../components/ChoiceGroup";

const MIN_REQUESTED_KW = 0.5;
const MAX_REQUESTED_KW = 999.9;

const STEPS = [
  "ownership",
  "roofType",
  "terrace",
  "powerCuts",
  "bill",
  "systemSize",
  "contact"
] as const;

type RoofOwnership = "yes" | "no";
type RoofType = "concrete" | "metal" | "brick" | "underconstructed";
type TerraceSize = "small" | "medium" | "big";
type PowerCuts = "none" | "under_1h" | "under_4h" | "over_4h";
type BillBand = "under_1500" | "1500_2500" | "2500_4000" | "over_4000";

const TERRACE_SQFT: Record<TerraceSize, number> = {
  small: 150,
  medium: 300,
  big: 500
};

const BILL_INR: Record<BillBand, number> = {
  under_1500: 1000,
  "1500_2500": 2000,
  "2500_4000": 3200,
  over_4000: 5000
};

const OWNERSHIP_LABEL: Record<RoofOwnership, string> = { yes: "Yes", no: "No" };
const ROOF_TYPE_LABEL: Record<RoofType, string> = {
  concrete: "Concrete roof",
  metal: "Metal sheet roof",
  brick: "Brick roof",
  underconstructed: "Underconstructed"
};
const TERRACE_LABEL: Record<TerraceSize, string> = {
  small: "< 200 sqft / Small",
  medium: "200 – 400 sqft / Medium",
  big: "400 + sqft / Big"
};
const POWER_LABEL: Record<PowerCuts, string> = {
  none: "No power cut",
  under_1h: "Less than 1 hour",
  under_4h: "Less than 4 hours",
  over_4h: "More than 4 hours"
};
const BILL_LABEL: Record<BillBand, string> = {
  under_1500: "Under ₹1,500",
  "1500_2500": "₹1,500 – ₹2,500",
  "2500_4000": "₹2,500 – ₹4,000",
  over_4000: "Over ₹4,000"
};

function validateRequestedKw(raw: string): string | null {
  const value = Number(raw);
  if (!raw.trim() || Number.isNaN(value)) return "Enter a system size in kW.";
  if (value < MIN_REQUESTED_KW) return `Requested kW must be at least ${MIN_REQUESTED_KW}.`;
  if (value > MAX_REQUESTED_KW) return `Requested kW must be at most ${MAX_REQUESTED_KW}.`;
  return null;
}

function buildPhaseNotes(input: {
  ownership: RoofOwnership;
  roofType: RoofType;
  terrace: TerraceSize;
  powerCuts: PowerCuts;
  bill: BillBand;
}): string {
  return [
    `Roof ownership: ${OWNERSHIP_LABEL[input.ownership]}`,
    `Roof type: ${ROOF_TYPE_LABEL[input.roofType]}`,
    `Terrace size: ${TERRACE_LABEL[input.terrace]}`,
    `Power cuts: ${POWER_LABEL[input.powerCuts]}`,
    `Monthly bill band: ${BILL_LABEL[input.bill]}`
  ].join("\n");
}

export const InquiryPage: React.FC = () => {
  const [stepIndex, setStepIndex] = useState(0);
  const step = STEPS[stepIndex];

  const [ownership, setOwnership] = useState<RoofOwnership | "">("");
  const [roofType, setRoofType] = useState<RoofType | "">("");
  const [terrace, setTerrace] = useState<TerraceSize | "">("");
  const [powerCuts, setPowerCuts] = useState<PowerCuts | "">("");
  const [bill, setBill] = useState<BillBand | "">("");
  const [requestedKw, setRequestedKw] = useState("3");
  const [systemKind, setSystemKind] = useState("on_grid");
  const [wantsSubsidy, setWantsSubsidy] = useState(true);

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [addressLine, setAddressLine] = useState("");
  const [city, setCity] = useState("Jalandhar");
  const [pincode, setPincode] = useState("");

  const [fieldErrors, setFieldErrors] = useState<{ requestedKw?: string; contact?: string }>({});
  const [error, setError] = useState<string | null>(null);
  const [doneId, setDoneId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const progress = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  const canAdvance = (): boolean => {
    switch (step) {
      case "ownership":
        return ownership !== "";
      case "roofType":
        return roofType !== "";
      case "terrace":
        return terrace !== "";
      case "powerCuts":
        return powerCuts !== "";
      case "bill":
        return bill !== "";
      case "systemSize":
        return validateRequestedKw(requestedKw) === null;
      case "contact":
        return Boolean(name.trim() && phone.trim().length >= 8 && addressLine.trim() && city.trim());
      default:
        return false;
    }
  };

  const goNext = () => {
    if (step === "systemSize") {
      const kwError = validateRequestedKw(requestedKw);
      if (kwError) {
        setFieldErrors({ requestedKw: kwError });
        return;
      }
      setFieldErrors({});
    }
    if (!canAdvance()) return;
    setStepIndex((index) => Math.min(index + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((index) => Math.max(index - 1, 0));
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (step !== "contact") {
      goNext();
      return;
    }
    if (!canAdvance() || !ownership || !roofType || !terrace || !powerCuts || !bill) {
      setFieldErrors({ contact: "Fill name, phone, address, and city." });
      return;
    }
    const kwError = validateRequestedKw(requestedKw);
    if (kwError) {
      setFieldErrors({ requestedKw: kwError });
      setStepIndex(STEPS.indexOf("systemSize"));
      return;
    }

    setFieldErrors({});
    setIsLoading(true);
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
        requestedKw: Number(requestedKw),
        systemKind,
        wantsSubsidy,
        monthlyBillInr: BILL_INR[bill],
        roofAreaSqft: TERRACE_SQFT[terrace],
        gridSuitable: ownership === "yes",
        notes: buildPhaseNotes({ ownership, roofType, terrace, powerCuts, bill })
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

      <main
        style={{
          width: "min(640px, 100%)",
          margin: "0 auto",
          padding: "var(--space-6, 24px) var(--layout-gutter) var(--space-8, 32px)"
        }}
      >
        <h1
          style={{
            margin: "0 0 4px",
            fontFamily: "var(--font-display)",
            fontSize: "clamp(24px, 4vw, 32px)",
            fontWeight: 800,
            color: "var(--text)"
          }}
        >
          Free rooftop solar survey
        </h1>
        <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
          Step {stepIndex + 1} of {STEPS.length}. Answer a few roof questions, then leave your contact details.
        </p>

        {!doneId && (
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

        {!doneId && (
          <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {step === "ownership" && (
              <ChoiceGroup
                label="Do you own the roof?"
                value={ownership}
                onChange={setOwnership}
                options={[
                  { value: "yes", label: "Yes" },
                  { value: "no", label: "No" }
                ]}
              />
            )}

            {step === "roofType" && (
              <ChoiceGroup
                label="What type of roof do you have?"
                value={roofType}
                onChange={setRoofType}
                options={[
                  { value: "concrete", label: "Concrete roof" },
                  { value: "metal", label: "Metal sheet roof" },
                  { value: "brick", label: "Brick roof" },
                  { value: "underconstructed", label: "Underconstructed" }
                ]}
              />
            )}

            {step === "terrace" && (
              <ChoiceGroup
                label="Terrace size"
                value={terrace}
                onChange={setTerrace}
                columns={1}
                options={[
                  { value: "small", label: "< 200 sqft / Small" },
                  { value: "medium", label: "200 – 400 sqft / Medium" },
                  { value: "big", label: "400 + sqft / Big" }
                ]}
              />
            )}

            {step === "powerCuts" && (
              <ChoiceGroup
                label="How often do you face power cuts?"
                value={powerCuts}
                onChange={setPowerCuts}
                options={[
                  { value: "none", label: "No power cut" },
                  { value: "under_1h", label: "Less than 1 hour" },
                  { value: "under_4h", label: "Less than 4 hours" },
                  { value: "over_4h", label: "More than 4 hours" }
                ]}
              />
            )}

            {step === "bill" && (
              <ChoiceGroup
                label="Monthly electricity bill"
                value={bill}
                onChange={setBill}
                options={[
                  { value: "under_1500", label: "Under ₹1,500" },
                  { value: "1500_2500", label: "₹1,500 – ₹2,500" },
                  { value: "2500_4000", label: "₹2,500 – ₹4,000" },
                  { value: "over_4000", label: "Over ₹4,000" }
                ]}
              />
            )}

            {step === "systemSize" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>System size</h2>
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
                <label style={{ display: "flex", gap: "8px", alignItems: "center", fontSize: "var(--text-base, 15px)" }}>
                  <input type="checkbox" checked={wantsSubsidy} onChange={(event) => setWantsSubsidy(event.target.checked)} />
                  Interested in government subsidy
                </label>
              </div>
            )}

            {step === "contact" && (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <h2 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>How can we reach you?</h2>
                {fieldErrors.contact && (
                  <Alert variant="danger" title="Missing details">
                    {fieldErrors.contact}
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

            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", marginTop: "8px" }}>
              <Button type="button" variant="outline" onClick={goBack} disabled={stepIndex === 0 || isLoading}>
                Back
              </Button>
              {step === "contact" ? (
                <Button type="submit" isLoading={isLoading} disabled={!canAdvance()}>
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

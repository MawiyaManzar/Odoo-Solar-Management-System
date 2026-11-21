import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { PageHeader } from "../../../components/ui/PageHeader";
import { Select } from "../../../components/ui/Select";
import { listPackages } from "../../catalog/catalog.api";
import type { PackageItem } from "../../catalog/types";
import { createQuote } from "../../quotes/quotes.api";
import { getEnquiry, listStaff, listSurveys, scheduleSurvey, updateEnquiry, updateSurvey } from "../enquiries.api";
import { labelStatus, statusVariant } from "../status";
import type { EnquiryItem, StaffMember, SurveyItem } from "../types";

export const EnquiryDetailPage: React.FC = () => {
  const { enquiryId = "" } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const canSales = user?.role === "sales" || user?.role === "admin";
  const canSurvey = user?.role === "technician" || user?.role === "admin";

  const [enquiry, setEnquiry] = useState<EnquiryItem | null>(null);
  const [surveys, setSurveys] = useState<SurveyItem[]>([]);
  const [techs, setTechs] = useState<StaffMember[]>([]);
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [bill, setBill] = useState("");
  const [roof, setRoof] = useState("");
  const [grid, setGrid] = useState("");
  const [notes, setNotes] = useState("");
  const [technicianId, setTechnicianId] = useState("");
  const [when, setWhen] = useState("");
  const [packageId, setPackageId] = useState("");
  const [direction, setDirection] = useState("south");
  const [tilt, setTilt] = useState("18");
  const [cable, setCable] = useState("");
  const [usable, setUsable] = useState("");
  const [shadow, setShadow] = useState("");
  const [result, setResult] = useState("approved");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [enquiryRes, surveyRes, staffRes, packageRes] = await Promise.all([
        getEnquiry(enquiryId),
        listSurveys(enquiryId),
        listStaff("technician"),
        listPackages()
      ]);
      setEnquiry(enquiryRes.data);
      setSurveys(surveyRes.data);
      setTechs(staffRes.data);
      setPackages(packageRes.data.filter((item) => item.isActive));
      setBill(enquiryRes.data.monthlyBillInr == null ? "" : String(enquiryRes.data.monthlyBillInr));
      setRoof(enquiryRes.data.roofAreaSqft == null ? "" : String(enquiryRes.data.roofAreaSqft));
      setGrid(enquiryRes.data.gridSuitable == null ? "" : enquiryRes.data.gridSuitable ? "yes" : "no");
      setNotes(enquiryRes.data.notes ?? "");
      setTechnicianId(staffRes.data[0]?.id ?? "");
      setPackageId(packageRes.data.find((item) => item.isActive)?.id ?? "");
      const latest = surveyRes.data[0];
      if (latest) {
        setDirection(latest.roofDirection ?? "south");
        setTilt(latest.tiltDegrees == null ? "" : String(latest.tiltDegrees));
        setCable(latest.cableDistanceM == null ? "" : String(latest.cableDistanceM));
        setUsable(latest.usableAreaSqft == null ? "" : String(latest.usableAreaSqft));
        setShadow(latest.shadowNotes ?? "");
        setResult(latest.result ?? "pending");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load enquiry.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enquiryId]);

  const approved = surveys.some((item) => item.result === "approved");
  const latest = surveys[0];

  const saveQualification = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateEnquiry(enquiryId, {
        monthlyBillInr: bill === "" ? null : Number(bill),
        roofAreaSqft: roof === "" ? null : Number(roof),
        gridSuitable: grid === "" ? null : grid === "yes",
        notes: notes || null,
        status: enquiry?.status === "new" ? "qualifying" : enquiry?.status
      });
      setInfo("Qualification saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  };

  const surveyMinLocal = (() => {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, "0");
    const d = String(now.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}T00:00`;
  })();

  const bookSurvey = async () => {
    setError(null);
    if (!when) {
      setError("Choose a survey date and time.");
      return;
    }
    if (when < surveyMinLocal) {
      setError("Survey can only be scheduled from today onwards.");
      return;
    }
    setSaving(true);
    try {
      await scheduleSurvey(enquiryId, {
        technicianId: technicianId || undefined,
        scheduledAt: new Date(when).toISOString()
      });
      setInfo("Survey scheduled.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not schedule.");
    } finally {
      setSaving(false);
    }
  };

  const saveSurvey = async () => {
    if (!latest) return;
    setSaving(true);
    setError(null);
    try {
      await updateSurvey(latest.id, {
        roofDirection: direction,
        tiltDegrees: tilt === "" ? null : Number(tilt),
        cableDistanceM: cable === "" ? null : Number(cable),
        usableAreaSqft: usable === "" ? null : Number(usable),
        shadowNotes: shadow || null,
        result
      });
      setInfo("Survey saved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save survey.");
    } finally {
      setSaving(false);
    }
  };

  const makeQuote = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await createQuote({ enquiryId, packageId });
      navigate(`/app/quotes/${response.data.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create quote.");
      setSaving(false);
    }
  };

  const markLost = async () => {
    setSaving(true);
    setError(null);
    try {
      await updateEnquiry(enquiryId, { status: "lost" });
      setInfo("Enquiry marked lost.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not close enquiry.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <PageHeader
        title={enquiry ? `${enquiry.customerName} · ${enquiry.requestedKw} kW` : "Enquiry"}
        description={enquiry ? `${labelStatus(enquiry.source)} · ${enquiry.city}` : undefined}
        actions={<Link to="/app/enquiries">Back to enquiries</Link>}
      />
      <div style={{ padding: "16px var(--layout-gutter)", display: "flex", flexDirection: "column", gap: "16px", maxWidth: "760px" }}>
        {isLoading && <p style={{ color: "var(--text-muted)" }}>Loading enquiry...</p>}
        {error && <Alert variant="danger" title="Request failed">{error}</Alert>}
        {info && <Alert variant="success" title="Saved">{info}</Alert>}
        {enquiry && (
          <>
            <Badge variant={statusVariant(enquiry.status)}>{labelStatus(enquiry.status)}</Badge>
            <section style={{ borderTop: "var(--border-default)", paddingTop: "12px" }}>
              <h3 style={{ margin: "0 0 8px" }}>Customer</h3>
              <p style={{ margin: 0 }}>{enquiry.customerName}</p>
              <p style={{ margin: "4px 0 0" }}>{enquiry.customerPhone}</p>
              <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>{enquiry.addressLine}, {enquiry.city}</p>
            </section>
            {canSales && (
              <section style={{ borderTop: "var(--border-default)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0 }}>Qualification</h3>
                <Input label="Monthly bill (INR)" type="number" min="0" value={bill} onChange={(event) => setBill(event.target.value)} />
                <Input label="Shadow-free roof (sq ft)" type="number" min="0" value={roof} onChange={(event) => setRoof(event.target.value)} />
                <Select
                  label="Grid suitable"
                  value={grid}
                  onChange={(event) => setGrid(event.target.value)}
                  options={[
                    { value: "", label: "Unknown" },
                    { value: "yes", label: "Yes" },
                    { value: "no", label: "No" }
                  ]}
                />
                <Input label="Notes" value={notes} onChange={(event) => setNotes(event.target.value)} />
                <div style={{ display: "flex", gap: "8px" }}>
                  <Button type="button" onClick={() => void saveQualification()} isLoading={saving}>Save qualification</Button>
                  <Button type="button" variant="danger" onClick={() => void markLost()} disabled={saving}>Lost</Button>
                </div>
              </section>
            )}
            {canSales && (
              <section style={{ borderTop: "var(--border-default)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0 }}>Schedule survey</h3>
                <Select
                  label="Technician"
                  value={technicianId}
                  onChange={(event) => setTechnicianId(event.target.value)}
                  options={techs.map((item) => ({ value: item.id, label: item.name }))}
                />
                <Input
                  label="When"
                  type="datetime-local"
                  min={surveyMinLocal}
                  value={when}
                  onChange={(event) => setWhen(event.target.value)}
                  required
                  helperText="Today or a future date"
                />
                <Button type="button" variant="secondary" onClick={() => void bookSurvey()} disabled={saving || techs.length === 0 || !when}>
                  Schedule survey
                </Button>
              </section>
            )}
            <section style={{ borderTop: "var(--border-default)", paddingTop: "12px" }}>
              <h3 style={{ margin: "0 0 8px" }}>Surveys</h3>
              {surveys.length === 0 && <p style={{ color: "var(--text-muted)" }}>None scheduled.</p>}
              {surveys.map((item) => (
                <p key={item.id} style={{ margin: "4px 0" }}>
                  {item.scheduledAt ? new Date(item.scheduledAt).toLocaleString() : "Unscheduled"} · {labelStatus(item.result ?? "pending")}
                </p>
              ))}
            </section>
            {canSurvey && latest && (
              <section style={{ borderTop: "var(--border-default)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0 }}>Record survey</h3>
                <Input label="Roof direction" value={direction} onChange={(event) => setDirection(event.target.value)} />
                <Input label="Tilt (degrees)" type="number" value={tilt} onChange={(event) => setTilt(event.target.value)} />
                <Input label="Cable distance (m)" type="number" value={cable} onChange={(event) => setCable(event.target.value)} />
                <Input label="Usable area (sq ft)" type="number" value={usable} onChange={(event) => setUsable(event.target.value)} />
                <Input label="Shadow notes" value={shadow} onChange={(event) => setShadow(event.target.value)} />
                <Select
                  label="Result"
                  value={result}
                  onChange={(event) => setResult(event.target.value)}
                  options={[
                    { value: "pending", label: "Pending" },
                    { value: "approved", label: "Approved" },
                    { value: "rejected", label: "Rejected" }
                  ]}
                />
                <Button type="button" onClick={() => void saveSurvey()} isLoading={saving}>Save survey</Button>
              </section>
            )}
            {canSales && (
              <section style={{ borderTop: "var(--border-default)", paddingTop: "12px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <h3 style={{ margin: 0 }}>Quote</h3>
                <Select
                  label="Package"
                  value={packageId}
                  onChange={(event) => setPackageId(event.target.value)}
                  options={packages.map((item) => ({ value: item.id, label: `${item.code} · ${item.name}` }))}
                />
                <Button type="button" onClick={() => void makeQuote()} disabled={!approved || !packageId || saving}>
                  Create quote
                </Button>
                {!approved && <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>Enabled after a survey is approved.</p>}
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
};

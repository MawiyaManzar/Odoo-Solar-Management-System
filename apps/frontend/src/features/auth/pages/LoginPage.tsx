import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { useAuth } from "../../../app/AuthProvider";
import { digitsOnlyPhone, parseIndianMobile } from "../../../lib/phone";
import { requestSignInOtp, setCustomerToken, verifySignInOtp } from "../../customer-quotes/customer-quote.api";
import { AuthLayout } from "../components/AuthLayout";

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<"staff" | "customer">("staff");
  const [email, setEmail] = useState("admin@sunpower.in");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStaff = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);
    const message = await login({ email, password });
    setIsLoading(false);
    if (message) {
      setError(message);
      return;
    }
    navigate("/app/dashboard");
  };

  const requestCode = async () => {
    const mobile = parseIndianMobile(phone);
    if (mobile == null) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setIsLoading(true);
    setError(null);
    setDevCode(null);
    try {
      const response = await requestSignInOtp(mobile);
      if (response.devCode) setDevCode(response.devCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send a code.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleCustomer = async (event: React.FormEvent) => {
    event.preventDefault();
    const mobile = parseIndianMobile(phone);
    if (mobile == null) {
      setError("Enter a 10-digit Indian mobile number.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await verifySignInOtp(mobile, code);
      setCustomerToken(response.data.token);
      navigate("/my/jobs");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout variant="split" heroImage="/images/solar-login.jpg">
      <div style={{ display: "flex", gap: "8px", marginBottom: "1.25rem", flexWrap: "wrap" }}>
        <Button
          type="button"
          size="sm"
          variant={mode === "staff" ? "primary" : "outline"}
          onClick={() => {
            setMode("staff");
            setError(null);
          }}
        >
          Staff sign in
        </Button>
        <Button
          type="button"
          size="sm"
          variant={mode === "customer" ? "primary" : "outline"}
          onClick={() => {
            setMode("customer");
            setError(null);
          }}
        >
          Customer sign in
        </Button>
      </div>
      {mode === "staff" ? (
        <form onSubmit={handleStaff} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.35rem", fontSize: "var(--text-xl, 22px)", fontWeight: 600, color: "var(--text)" }}>
              Staff sign in
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
              Sales, technician, and admin.
            </p>
          </div>
          {error && <Alert variant="danger" title="Sign in failed">{error}</Alert>}
          <Input
            label="Work email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <Button type="submit" isLoading={isLoading}>
            Sign in
          </Button>
        </form>
      ) : (
        <form onSubmit={handleCustomer} style={{ display: "flex", flexDirection: "column", gap: "1.1rem" }}>
          <div>
            <h2 style={{ margin: "0 0 0.35rem", fontSize: "var(--text-xl, 22px)", fontWeight: 600, color: "var(--text)" }}>
              Customer sign in
            </h2>
            <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
              Use the mobile number from your inquiry.
            </p>
          </div>
          {error && (
            <Alert variant="danger" title="Sign in failed">
              {error}{" "}
              {error.includes("inquiry") && <Link to="/inquire">Fill an inquiry</Link>}
            </Alert>
          )}
          {devCode && <Alert variant="neutral" title="Development code">{devCode}</Alert>}
          <Input
            label="Mobile number"
            required
            type="tel"
            inputMode="numeric"
            autoComplete="tel"
            value={phone}
            onChange={(event) => setPhone(digitsOnlyPhone(event.target.value))}
          />
          <Button type="button" variant="secondary" isLoading={isLoading} onClick={() => void requestCode()}>
            Request code
          </Button>
          <Input label="Code" required inputMode="numeric" value={code} onChange={(event) => setCode(event.target.value)} />
          <Button type="submit" isLoading={isLoading}>
            Sign in
          </Button>
        </form>
      )}
    </AuthLayout>
  );
};

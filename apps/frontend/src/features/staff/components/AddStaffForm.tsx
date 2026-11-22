import React, { useState } from "react";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { Select } from "../../../components/ui/Select";
import {
  ArrowRightIcon,
  BuildingIcon,
  EyeIcon,
  EyeOffIcon,
  LockIcon,
  MailIcon,
  UserIcon
} from "../../../components/ui/icons";
import { APP_CONFIG } from "../../../config/app.config";
import { ApiError } from "../../../lib/api-client";
import { createStaff } from "../staff.api";
import type { CreateStaffInput, StaffMember } from "../types";

interface Props {
  onCreated: (member: StaffMember) => void;
  onCancel: () => void;
}

const revealButtonStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: "2px",
  cursor: "pointer",
  color: "var(--text-muted)",
  display: "flex"
};

export const AddStaffForm: React.FC<Props> = ({ onCreated, onCancel }) => {
  const [formData, setFormData] = useState<CreateStaffInput>({
    fullName: "",
    email: "",
    companyName: "SunPower Solutions",
    role: APP_CONFIG.signupRoles[0]?.value || "sales",
    password: "",
    confirmPassword: ""
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    if (!formData.fullName.trim()) {
      setError("Full name is required.");
      return;
    }
    if (!formData.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      setError("Please provide a valid work email address.");
      return;
    }
    if (!formData.companyName.trim()) {
      setError("Company or organization name is required.");
      return;
    }
    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await createStaff({
        fullName: formData.fullName.trim(),
        email: formData.email.trim(),
        companyName: formData.companyName.trim(),
        role: formData.role,
        password: formData.password
      });
      onCreated(response.data);
    } catch (err: unknown) {
      if (err instanceof ApiError) setError(err.message);
      else if (err instanceof Error) setError(err.message);
      else setError("Could not create the staff account.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="staff-add-form" style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
      <style>{`
        .staff-add-form__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-4, 16px); }
        .staff-add-form__row--company { grid-template-columns: 1.2fr 0.8fr; }
        @media (max-width: 640px) {
          .staff-add-form__row, .staff-add-form__row--company { grid-template-columns: 1fr; }
        }
      `}</style>
      <div>
        <h2 style={{ margin: "0 0 0.35rem", fontSize: "var(--text-xl, 22px)", fontWeight: 600 }}>Add staff account</h2>
        <p style={{ margin: 0, fontSize: "var(--text-sm, 13px)", color: "var(--text-muted)" }}>
          Create a login for sales, warehouse, technician, or support. They sign in on the staff login page.
        </p>
      </div>

      {error && (
        <Alert variant="danger" title="Could not create account">
          {error}
        </Alert>
      )}

      <div className="staff-add-form__row">
        <Input
          label="Full name"
          required
          autoComplete="name"
          startAdornment={<UserIcon size={16} />}
          value={formData.fullName}
          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
          disabled={isLoading}
        />
        <Input
          label="Work email"
          type="email"
          required
          autoComplete="email"
          placeholder="name@sunpower.in"
          startAdornment={<MailIcon size={16} />}
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div className="staff-add-form__row staff-add-form__row--company">
        <Input
          label="Company"
          required
          autoComplete="organization"
          startAdornment={<BuildingIcon size={16} />}
          value={formData.companyName}
          onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
          disabled={isLoading}
        />
        <Select
          label="Role"
          required
          value={formData.role}
          onChange={(event) => setFormData({ ...formData, role: event.target.value })}
          disabled={isLoading}
          options={APP_CONFIG.signupRoles}
        />
      </div>

      <div className="staff-add-form__row">
        <Input
          label="Password"
          type={showPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          startAdornment={<LockIcon size={16} />}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={revealButtonStyle}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
          value={formData.password}
          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
          disabled={isLoading}
          helperText="At least 8 characters"
        />
        <Input
          label="Confirm password"
          type={showConfirmPassword ? "text" : "password"}
          required
          autoComplete="new-password"
          startAdornment={<LockIcon size={16} />}
          endAdornment={
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              style={revealButtonStyle}
              title={showConfirmPassword ? "Hide password" : "Show password"}
            >
              {showConfirmPassword ? <EyeOffIcon size={16} /> : <EyeIcon size={16} />}
            </button>
          }
          value={formData.confirmPassword}
          onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
          disabled={isLoading}
        />
      </div>

      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
        <Button type="submit" variant="primary" isLoading={isLoading}>
          <span>Create account</span>
          <ArrowRightIcon size={16} />
        </Button>
        <Button type="button" variant="outline" onClick={onCancel} disabled={isLoading}>
          Cancel
        </Button>
      </div>
    </form>
  );
};

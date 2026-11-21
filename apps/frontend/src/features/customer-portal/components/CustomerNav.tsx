import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { getCustomerToken, setCustomerToken } from "../../customer-quotes/customer-quote.api";

/** Same bar as the staff app shell: brand, nav links, then account actions. */
export const CustomerNav: React.FC = () => {
  const navigate = useNavigate();
  const signedIn = Boolean(getCustomerToken());

  return (
    <header
      style={{
        backgroundColor: "var(--page)",
        borderBottom: "var(--border-default)",
        padding: "0 var(--layout-gutter)",
        minHeight: "var(--navbar-height)",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "var(--space-4, 16px)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-4, 16px)", minWidth: 0 }}>
        <BrandMark />
        <nav style={{ display: "flex", alignItems: "stretch", gap: "var(--space-1, 4px)" }}>
          <NavLink to="/my/jobs" className={({ isActive }) => (isActive ? "nav-link nav-link--active" : "nav-link")}>
            My job
          </NavLink>
        </nav>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3, 12px)" }}>
        <Badge variant="neutral">Customer</Badge>
        {signedIn ? (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => {
              setCustomerToken(null);
              navigate("/login");
            }}
          >
            Sign out
          </Button>
        ) : (
          <Button variant="secondary" size="sm" onClick={() => navigate("/login")}>
            Sign in
          </Button>
        )}
      </div>
    </header>
  );
};

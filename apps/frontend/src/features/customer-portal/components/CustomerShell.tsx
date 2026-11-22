import React from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import {
  BriefcaseIcon,
  FileTextIcon,
  HeadsetIcon,
  MessageCircleIcon,
  WrenchIcon
} from "../../../components/ui/icons";
import { getCustomerToken, setCustomerToken } from "../../customer-quotes/customer-quote.api";

const NAV = [
  { to: "/my/jobs", label: "My Job", icon: BriefcaseIcon },
  { to: "/my/quotes", label: "My Quotes", icon: FileTextIcon },
  { to: "/my/service", label: "Service Requests", icon: WrenchIcon },
  { to: "/my/support", label: "Support", icon: MessageCircleIcon }
] as const;

export const CustomerShell: React.FC = () => {
  const navigate = useNavigate();
  const signedIn = Boolean(getCustomerToken());

  return (
    <div
      style={{
        flex: 1,
        display: "grid",
        gridTemplateColumns: "240px 1fr",
        minHeight: "100%",
        backgroundColor: "var(--page)"
      }}
    >
      <aside
        style={{
          borderRight: "var(--border-default)",
          backgroundColor: "var(--card)",
          display: "flex",
          flexDirection: "column",
          padding: "16px 12px",
          gap: "16px",
          minHeight: "100vh",
          position: "sticky",
          top: 0
        }}
      >
        <div style={{ padding: "4px 8px" }}>
          <BrandMark />
        </div>
        <nav style={{ display: "flex", flexDirection: "column", gap: "4px", flex: 1 }}>
          {NAV.map((item) => {
            const Icon = item.icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                style={({ isActive }) => ({
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-btn)",
                  textDecoration: "none",
                  fontSize: "var(--text-sm)",
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? "var(--brand)" : "var(--text)",
                  backgroundColor: isActive ? "var(--brand-tint)" : "transparent",
                  borderLeft: isActive ? "3px solid var(--brand)" : "3px solid transparent"
                })}
              >
                <Icon size={16} />
                {item.label}
              </NavLink>
            );
          })}
        </nav>
        <div
          style={{
            border: "var(--border-default)",
            borderRadius: "var(--radius-card)",
            padding: "14px",
            backgroundColor: "var(--section)",
            display: "grid",
            gap: "10px"
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--brand)" }}>
            <HeadsetIcon size={18} />
            <strong style={{ fontSize: "var(--text-sm)", color: "var(--text)" }}>Need help?</strong>
          </div>
          <p style={{ margin: 0, fontSize: "var(--text-xs)", color: "var(--text-muted)" }}>
            In-app support is coming soon. Contact SunPower by phone for payment, dispatch, warranty, or quote help.
          </p>
          <Badge variant="warning">Coming soon</Badge>
        </div>
      </aside>

      <div style={{ display: "flex", flexDirection: "column", minWidth: 0 }}>
        <header
          style={{
            minHeight: "var(--navbar-height)",
            borderBottom: "var(--border-default)",
            padding: "0 var(--layout-gutter)",
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            backgroundColor: "var(--page)"
          }}
        >
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
        </header>
        <Outlet />
      </div>
    </div>
  );
};

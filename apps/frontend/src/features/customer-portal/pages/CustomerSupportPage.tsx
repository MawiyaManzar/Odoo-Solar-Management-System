import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Badge } from "../../../components/ui/Badge";
import { getCustomerToken } from "../../customer-quotes/customer-quote.api";

export const CustomerSupportPage: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!getCustomerToken()) navigate("/login", { replace: true });
  }, [navigate]);

  return (
    <main
      style={{
        padding: "24px var(--layout-gutter) 48px",
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        maxWidth: "720px"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)" }}>Support</h1>
        <Badge variant="warning">Coming soon</Badge>
      </div>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
        In-app support is not available yet. Check back later, or contact SunPower by phone if you need help with
        payment, dispatch, warranty, or your quote.
      </p>
    </main>
  );
};

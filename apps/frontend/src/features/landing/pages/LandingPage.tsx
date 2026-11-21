import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { listPublicPackages } from "../../catalog/catalog.api";
import type { PackageItem } from "../../catalog/types";

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function kindLabel(kind: string): string {
  return kind.replace(/_/g, " ");
}

export const LandingPage: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listPublicPackages()
      .then((response) => {
        if (!cancelled) setPackages(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load packages.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

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
        <BrandMark />
        <Link to="/login" style={{ fontWeight: 600 }}>
          Sign in
        </Link>
      </header>

      <section style={{ padding: "var(--space-8, 32px) var(--layout-gutter) var(--space-6, 24px)" }}>
        <p style={{ margin: 0, fontSize: "var(--text-sm, 13px)", letterSpacing: "0.08em", textTransform: "uppercase", color: "var(--text-muted)" }}>
          Jalandhar rooftops
        </p>
        <h1 style={{ margin: "8px 0 0", fontSize: "clamp(40px, 6vw, 64px)", lineHeight: 1.05, fontWeight: 650, color: "var(--text)" }}>
          SunPower
        </h1>
        <p style={{ margin: "12px 0 0", maxWidth: "36rem", fontSize: "var(--text-lg, 18px)", color: "var(--text)" }}>
          On-grid and off-grid systems from 1 kW to 5 kW, fitted and tested at your site.
        </p>
        <div style={{ marginTop: "20px" }}>
          <Link to="/inquire">
            <Button type="button">Send an inquiry</Button>
          </Link>
        </div>
      </section>

      <section style={{ borderTop: "var(--border-default)", padding: "var(--space-6, 24px) var(--layout-gutter) var(--space-8, 32px)" }}>
        <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl, 22px)" }}>Packages</h2>
        <p style={{ margin: "0 0 16px", color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
          Ready-made systems. A site survey confirms the roof before a quote.
        </p>
        {isLoading && <p style={{ color: "var(--text-muted)" }}>Loading packages...</p>}
        {error && (
          <Alert variant="danger" title="Packages unavailable">
            {error}
          </Alert>
        )}
        {!isLoading && !error && packages.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No active packages yet.</p>
        )}
        {!isLoading && !error && packages.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}>
            {packages.map((item) => (
              <article
                key={item.id}
                style={{
                  backgroundColor: "var(--card)",
                  border: "var(--border-default)",
                  padding: "16px"
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--text-sm, 13px)", color: "var(--text-muted)" }}>{item.code}</p>
                <h3 style={{ margin: "4px 0 0", fontSize: "var(--text-lg, 18px)" }}>{item.name}</h3>
                <p style={{ margin: "8px 0 0", textTransform: "capitalize" }}>{kindLabel(item.systemKind)}</p>
                <p style={{ margin: "4px 0 0" }}>{item.capacityKw != null ? `${item.capacityKw} kW` : "Service"}</p>
                <p style={{ margin: "12px 0 0", fontWeight: 650 }}>{inr(item.basePriceInr)}</p>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

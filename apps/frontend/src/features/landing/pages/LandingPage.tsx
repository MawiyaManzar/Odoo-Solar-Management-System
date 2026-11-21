import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { Skeleton } from "../../../components/ui/Skeleton";
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

  const loadPackages = () => {
    setIsLoading(true);
    setError(null);
    listPublicPackages()
      .then((response) => setPackages(response.data))
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load packages.");
        setPackages([]);
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    listPublicPackages()
      .then((response) => {
        if (!cancelled) setPackages(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Could not load packages.");
        }
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
          borderBottom: "var(--border-default)",
          backgroundColor: "var(--page)"
        }}
      >
        <BrandMark />
        <nav style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <a href="#packages" style={{ fontWeight: 600, color: "var(--accent-text)", textDecoration: "none" }}>
            Packages
          </a>
          <Link to="/login" style={{ fontWeight: 600, color: "var(--text)", textDecoration: "none" }}>
            Sign in
          </Link>
        </nav>
      </header>

      <section
        className="landing-hero"
        style={{
          position: "relative",
          isolation: "isolate",
          minHeight: "min(82vh, 760px)",
          padding: "clamp(20px, 3vw, 36px) var(--layout-gutter) var(--space-12, 48px)",
          borderBottom: "var(--border-default)",
          backgroundImage: "url(/landing/hero-bg.jpg)",
          backgroundSize: "cover",
          backgroundPosition: "82% 12%"
        }}
      >
        <div
          aria-hidden="true"
          style={{
            position: "absolute",
            inset: 0,
            backgroundColor: "var(--text)",
            opacity: 0.28,
            zIndex: 0
          }}
        />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            maxWidth: "36rem"
          }}
        >
          <h1
            style={{
              margin: 0,
              fontFamily: "var(--font-hero)",
              fontSize: "clamp(34px, 5vw, 52px)",
              fontWeight: 700,
              fontStyle: "italic",
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              color: "var(--white)"
            }}
          >
            <span style={{ display: "block" }}>Go Solar at</span>
            <span
              style={{
                display: "inline-block",
                marginTop: "6px",
                backgroundColor: "var(--amber-2)",
                color: "var(--text)",
                padding: "2px 12px 0",
                lineHeight: 1.15
              }}
            >
              Zero Investment
            </span>
          </h1>
          <p
            style={{
              margin: "12px 0 0",
              maxWidth: "28rem",
              fontSize: "var(--text-base, 15px)",
              lineHeight: 1.45,
              color: "var(--white)"
            }}
          >
            Save up to 90% on electricity bills with government subsidy and easy EMIs. Tell us about your roof and we
            schedule a free site survey.
          </p>
        </div>

        <aside
          className="landing-hero-cta-card"
          style={{
            position: "absolute",
            zIndex: 1,
            top: "75%",
            right: "clamp(48px, 10vw, 120px)",
            transform: "translateY(-50%)",
            width: "min(100% - 32px, 510px)",
            backgroundColor: "var(--card)",
            border: "var(--border-default)",
            borderRadius: "var(--radius-card)",
            padding: "36px 30px",
            display: "flex",
            flexDirection: "column",
            gap: "18px"
          }}
        >
          <h2 style={{ margin: 0, fontSize: "var(--text-xl, 22px)", fontWeight: 650, color: "var(--text)" }}>
            Book a consultation
          </h2>
          <p style={{ margin: 0, fontSize: "var(--text-base, 15px)", lineHeight: 1.5, color: "var(--text-muted)" }}>
            Answer a few roof questions. Sales calls you back, then a technician visits.
          </p>
          <Link to="/inquire" style={{ textDecoration: "none", display: "block" }}>
            <Button type="button" className="landing-hero-cta">
              Book consultation
            </Button>
          </Link>
          <a
            href="#packages"
            style={{
              textAlign: "center",
              fontSize: "var(--text-base, 15px)",
              fontWeight: 600,
              color: "var(--accent-text)",
              textDecoration: "none"
            }}
          >
            View packages
          </a>
        </aside>
      </section>

      <style>{`
        .landing-hero-cta {
          width: 100%;
          min-height: 54px;
          font-size: 17px;
          font-weight: 700;
          padding: 16px 24px;
        }
        @media (max-width: 900px) {
          .landing-hero {
            min-height: auto !important;
            background-position: 70% 20% !important;
            padding-bottom: 24px !important;
          }
          .landing-hero-cta-card {
            position: relative !important;
            top: auto !important;
            right: auto !important;
            transform: none !important;
            width: 100% !important;
            margin-top: 24px;
          }
        }
      `}</style>

      <section
        id="packages"
        style={{ padding: "var(--space-8, 32px) var(--layout-gutter) var(--space-12, 48px)" }}
      >
        <h2 style={{ margin: "0 0 4px", fontSize: "var(--text-xl, 22px)", fontWeight: 650, color: "var(--text)" }}>
          Packages
        </h2>
        <p style={{ margin: "0 0 20px", color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>
          Base prices before subsidy and site adjustments. A survey confirms the roof before any quote.
        </p>

        {isLoading && (
          <div
            data-testid="landing-skeleton"
            style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "12px" }}
          >
            <style>{`@keyframes skeleton-pulse { 0%, 100% { opacity: 0.45 } 50% { opacity: 0.9 } }`}</style>
            {[0, 1, 2].map((index) => (
              <div
                key={index}
                style={{
                  backgroundColor: "var(--card)",
                  border: "var(--border-default)",
                  borderRadius: "var(--radius-card)",
                  padding: "16px",
                  display: "grid",
                  gap: "10px"
                }}
              >
                <Skeleton width="40%" height={12} />
                <Skeleton width="70%" height={18} />
                <Skeleton width="50%" height={14} />
                <Skeleton width="45%" height={16} />
              </div>
            ))}
          </div>
        )}

        {error && (
          <Alert variant="danger" title="Packages unavailable">
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={loadPackages}>
                Retry
              </Button>
            </div>
          </Alert>
        )}

        {!isLoading && !error && packages.length === 0 && (
          <div data-testid="landing-empty" style={{ padding: "24px 0" }}>
            <h3 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>No active packages yet</h3>
            <p style={{ margin: "8px 0 16px", color: "var(--text-muted)" }}>
              Catalog packages will appear here when an admin marks them active.
            </p>
            <Link to="/inquire">
              <Button type="button">Still book a survey</Button>
            </Link>
          </div>
        )}

        {!isLoading && !error && packages.length > 0 && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {packages.map((item) => (
              <article
                key={item.id}
                style={{
                  backgroundColor: "var(--card)",
                  border: "var(--border-default)",
                  borderRadius: "var(--radius-card)",
                  padding: "18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  gap: "4px"
                }}
              >
                <p style={{ margin: 0, fontSize: "var(--text-sm, 13px)", color: "var(--text-muted)", fontFamily: "var(--font-mono)" }}>
                  {item.code}
                </p>
                <h3 style={{ margin: "4px 0 0", fontSize: "var(--text-lg, 18px)" }}>{item.name}</h3>
                <p style={{ margin: "8px 0 0", textTransform: "capitalize", color: "var(--text-muted)" }}>
                  {kindLabel(item.systemKind)}
                  {item.capacityKw != null ? ` · ${item.capacityKw} kW` : ""}
                </p>
                <p style={{ margin: "16px 0 0", fontWeight: 700, fontSize: "var(--text-lg, 18px)", fontFamily: "var(--font-mono)" }}>
                  {inr(item.basePriceInr)}
                </p>
                <div style={{ marginTop: "auto", paddingTop: "16px" }}>
                  <Link to="/inquire">
                    <Button type="button" variant="outline" size="sm">
                      Get this sized for my roof
                    </Button>
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>

      <section
        style={{
          padding: "var(--space-8, 32px) var(--layout-gutter)",
          borderTop: "var(--border-default)",
          backgroundColor: "var(--section)"
        }}
      >
        <h2 style={{ margin: 0, fontSize: "var(--text-xl, 22px)" }}>What to expect</h2>
        <ol
          style={{
            margin: "16px 0 0",
            padding: 0,
            listStyle: "none",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
            gap: "12px"
          }}
        >
          {[
            {
              step: "1",
              title: "Tell us about the roof",
              body: "Ownership, type, terrace size, and bill in a short wizard."
            },
            {
              step: "2",
              title: "We call and visit",
              body: "Sales follows up, then a technician surveys the site."
            },
            {
              step: "3",
              title: "Quote after survey",
              body: "No price lock until the roof is checked."
            }
          ].map((item) => (
            <li
              key={item.step}
              style={{
                backgroundColor: "var(--card)",
                border: "var(--border-default)",
                borderRadius: "var(--radius-card)",
                padding: "16px"
              }}
            >
              <p
                style={{
                  margin: 0,
                  width: "28px",
                  height: "28px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: "var(--radius-badge)",
                  backgroundColor: "var(--accent-tint)",
                  color: "var(--accent-text)",
                  fontWeight: 700,
                  fontSize: "var(--text-sm, 13px)"
                }}
              >
                {item.step}
              </p>
              <h3 style={{ margin: "10px 0 4px", fontSize: "var(--text-base, 15px)" }}>{item.title}</h3>
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>{item.body}</p>
            </li>
          ))}
        </ol>
        <div style={{ marginTop: "20px" }}>
          <Link to="/inquire">
            <Button type="button">Start the survey form</Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

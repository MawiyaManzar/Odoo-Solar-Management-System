import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { APP_CONFIG } from "../../../config/app.config";
import { listPublicPackages } from "../../catalog/catalog.api";
import type { PackageItem } from "../../catalog/types";
import { ProcessPipeline } from "../stageshow/ProcessPipeline";
import "../landing.css";

function inr(value: number): string {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value);
}

function kindLabel(kind: string): string {
  return kind.replace(/_/g, " ");
}

function talkerFor(item: PackageItem): string {
  if (item.systemKind === "hybrid") return "Backup for power cuts";
  if ((item.capacityKw ?? 0) >= 5) return "Higher bill homes & premises";
  return "Most homes · subsidy eligible";
}

export const LandingPage: React.FC = () => {
  const [packages, setPackages] = useState<PackageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pageRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const root = pageRef.current;
    if (!root) return;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduceMotion) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const y = window.scrollY;
        root.style.setProperty("--lp-plane-far-y", `${y * 0.08}px`);
        root.style.setProperty("--lp-plane-mid-y", `${y * 0.18}px`);
        root.style.setProperty("--lp-plane-near-y", `${y * 0.28}px`);
      });
    };

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
    };
  }, []);

  const peekPackages = packages.slice(0, 3);

  return (
    <div className="landing-page" ref={pageRef}>
      <section className="landing-hero" aria-label="SunPower rooftop solar">
        <div className="landing-plane landing-plane--far" aria-hidden="true" />
        <div className="landing-plane landing-plane--fern" aria-hidden="true" />
        <div className="landing-plane landing-plane--near" aria-hidden="true" />

        <div className="landing-cel">
          <header className="landing-nav">
            <Link to="/" className="landing-brand">
              <img src="/logo.png" alt="" width={28} height={28} />
              {APP_CONFIG.name}
            </Link>
            <nav className="landing-nav-links" aria-label="Landing">
              <a href="#packages">Packages</a>
              <a href="#how-it-works">How it works</a>
              <Link to="/login">Sign in</Link>
            </nav>
          </header>

          <div className="landing-hero-copy">
            <h1>
              Go Solar at
              <br />
              <span className="lamp-hit">Zero Investment</span>
            </h1>
            <p>
              Government subsidy and easy EMIs for Jalandhar rooftops and commercial premises. Tell us about your site
              and we schedule a free survey before any quote.
            </p>
            <Link to="/inquire" className="landing-lamp">
              Book consultation
            </Link>
          </div>

          {(isLoading || peekPackages.length > 0 || (!error && packages.length === 0)) && (
            <div className="landing-hero-peek" aria-busy={isLoading || undefined}>
              {isLoading && (
                <div className="landing-peek-item landing-peek-item--skeleton" aria-hidden="true">
                  <span className="landing-peek-skel" />
                  <span className="landing-peek-skel landing-peek-skel--short" />
                </div>
              )}
              {!isLoading &&
                peekPackages.map((item) => (
                  <div key={item.id} className="landing-peek-item">
                    <strong>{item.code}</strong>
                    <span>
                      {kindLabel(item.systemKind)}
                      {item.capacityKw != null ? ` · ${item.capacityKw} kW` : ""}
                      {" · "}
                      <span className="mono">{inr(item.basePriceInr)}</span>
                    </span>
                  </div>
                ))}
              {!isLoading && !error && packages.length === 0 && (
                <div className="landing-peek-item">
                  <strong>Packages</strong>
                  <span>Catalog opens when packages are marked active</span>
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      <section id="packages" className="landing-section">
        <h2>Packages</h2>
        <p className="lede">
          Base prices before subsidy and site adjustments. A survey confirms the roof before any quote.
        </p>

        {isLoading && (
          <div className="landing-skeleton-grid" data-testid="landing-skeleton">
            {[0, 1, 2].map((index) => (
              <div key={index} className="landing-skeleton-row" />
            ))}
          </div>
        )}

        {error && (
          <div className="landing-error-wrap">
            <Alert variant="danger" title="Packages unavailable">
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                <span>{error}</span>
                <button type="button" className="landing-retry" onClick={loadPackages}>
                  Retry
                </button>
              </div>
            </Alert>
          </div>
        )}

        {!isLoading && !error && packages.length === 0 && (
          <div className="landing-empty" data-testid="landing-empty">
            <h3 style={{ margin: 0, fontFamily: "var(--lp-font-display)", fontSize: "22px" }}>
              No active packages yet
            </h3>
            <p style={{ margin: "8px 0 16px", color: "var(--lp-muted)" }}>
              Catalog packages will appear here when an admin marks them active.
            </p>
            <Link to="/inquire" className="landing-lamp">
              Still book a survey
            </Link>
          </div>
        )}

        {!isLoading && !error && packages.length > 0 && (
          <table className="landing-pkg-table">
            <thead>
              <tr>
                <th scope="col">Code</th>
                <th scope="col">System</th>
                <th scope="col">Capacity</th>
                <th scope="col">Base</th>
                <th scope="col">
                  <span className="sr-only">Action</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {packages.map((item) => (
                <tr key={item.id}>
                  <td data-label="Code" className="mono">
                    {item.code}
                  </td>
                  <td data-label="System">
                    {item.name}
                    <span className="talker">{talkerFor(item)}</span>
                  </td>
                  <td data-label="Capacity" className="mono">
                    {item.capacityKw != null ? `${item.capacityKw} kW` : "—"}
                  </td>
                  <td data-label="Base" className="mono">
                    {inr(item.basePriceInr)}
                  </td>
                  <td data-label="Next">
                    <Link to="/inquire" className="landing-pkg-cta">
                      Size for my roof
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section id="how-it-works" className="landing-section landing-section--haze">
        <h2>What to expect</h2>
        <p className="lede">Three steps into the real install pipeline — survey before any price lock.</p>
        <ol className="landing-steps">
          <li>
            <span className="step-label">Step 1</span>
            <h3>Tell us about the roof</h3>
            <p>Ownership, type, terrace size, and bill in a short wizard.</p>
          </li>
          <li>
            <span className="step-label">Step 2</span>
            <h3>We call and visit</h3>
            <p>Sales follows up, then a technician surveys the site.</p>
          </li>
          <li>
            <span className="step-label">Step 3</span>
            <h3>Quote after survey</h3>
            <p>No price lock until the roof is checked.</p>
          </li>
        </ol>
        <div className="landing-section-action">
          <Link to="/inquire" className="landing-lamp">
            Start the survey form
          </Link>
        </div>
      </section>

      <footer className="landing-footer">
        <div className="landing-footer-grid">
          <div>
            <div className="brand-line">{APP_CONFIG.name}</div>
            <p>
              Rooftop and commercial solar for Jalandhar. Public enquiries enter the live install pipeline —
              survey, quote, order, and install.
            </p>
          </div>
          <div>
            <h3>Explore</h3>
            <ul>
              <li>
                <a href="#packages">Packages</a>
              </li>
              <li>
                <a href="#how-it-works">How it works</a>
              </li>
              <li>
                <Link to="/inquire">Book consultation</Link>
              </li>
              <li>
                <Link to="/login">Staff sign in</Link>
              </li>
            </ul>
          </div>
          <div>
            <h3>Contact</h3>
            <ul>
              <li>Jalandhar, Punjab</li>
              <li>
                <a href="mailto:sales@sunpower.in">sales@sunpower.in</a>
              </li>
              <li>
                <Link to="/inquire">Request a site survey</Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="landing-footer-bar">
          <span>
            © {new Date().getFullYear()} {APP_CONFIG.name}
          </span>
          <span>Survey before quote · Live catalog rates</span>
        </div>
      </footer>

      <nav className="landing-bottom-bar" aria-label="Quick actions">
        <a href="#packages">Packages</a>
        <a href="#how-it-works">Steps</a>
        <Link to="/inquire" className="landing-lamp">
          Book consultation
        </Link>
      </nav>
    </div>
  );
};

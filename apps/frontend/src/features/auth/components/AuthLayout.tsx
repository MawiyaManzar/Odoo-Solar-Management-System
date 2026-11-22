import React from "react";
import { Link } from "react-router-dom";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Card } from "../../../components/ui/Card";
import { APP_CONFIG } from "../../../config/app.config";

interface AuthLayoutProps {
  children: React.ReactNode;
  /** Link shown on the right of the header, e.g. "Create an account". */
  headerLink: { to: string; label: string; prefix?: string };
  /** "wide" is used by the signup form (two-column fields). */
  width?: "default" | "wide";
  /** Optional note rendered under the card. */
  belowCard?: React.ReactNode;
  /**
   * `split` = desktop hero image + form panel (login).
   * `default` = centered card on a full-bleed page (signup).
   */
  variant?: "default" | "split";
  /** Full-bleed image for the split layout left panel. */
  heroImage?: string;
}

const HeaderLink: React.FC<AuthLayoutProps["headerLink"]> = ({ to, label, prefix }) => (
  <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2, 8px)", fontSize: "var(--text-sm, 13px)" }}>
    {prefix && <span style={{ color: "var(--text-muted)" }}>{prefix}</span>}
    <Link to={to} style={{ fontWeight: 600, color: "var(--accent-text)", textDecoration: "none" }}>
      {label}
    </Link>
  </div>
);

/**
 * Shared auth page frame. The header, page background, and footer are full-bleed
 * (edge to edge). Only the form card is width-limited, because forms should not stretch.
 */
export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  headerLink,
  width = "default",
  belowCard,
  variant = "default",
  heroImage = "/images/solar-login.jpg"
}) => {
  if (variant === "split") {
    return (
      <div className="auth-split">
        <aside className="auth-split__visual" aria-hidden="true">
          <img
            className="auth-split__image"
            src={heroImage}
            alt=""
            width={1200}
            height={1600}
          />
        </aside>

        <div className="auth-split__panel">
          <header className="auth-split__header">
            <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
              <BrandMark />
            </Link>
            <HeaderLink {...headerLink} />
          </header>

          <main className="auth-split__main">
            <div className="auth-split__card-wrap">
              <Card style={{ padding: "2rem" }}>{children}</Card>
              {belowCard && (
                <div
                  style={{
                    marginTop: "var(--space-4, 16px)",
                    textAlign: "center",
                    fontSize: "var(--text-sm, 13px)",
                    color: "var(--text-muted)"
                  }}
                >
                  {belowCard}
                </div>
              )}
            </div>
          </main>

          <footer className="auth-split__footer">
            &copy; {new Date().getFullYear()} {APP_CONFIG.name}
          </footer>
        </div>

        <style>{`
          .auth-split {
            flex: 1;
            display: grid;
            grid-template-columns: 1fr 1fr;
            min-height: 100vh;
            width: 100%;
            background-color: var(--page);
          }

          .auth-split__visual {
            position: relative;
            min-height: 100vh;
            overflow: hidden;
            background-color: var(--section);
          }

          .auth-split__image {
            display: block;
            width: 100%;
            height: 100%;
            object-fit: cover;
            object-position: left center;
          }

          .auth-split__panel {
            display: flex;
            flex-direction: column;
            min-height: 100vh;
            background-color: var(--page);
          }

          .auth-split__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            gap: var(--space-4, 16px);
            min-height: var(--navbar-height);
            padding: 0 var(--space-8, 32px);
            border-bottom: var(--border-default);
            background-color: var(--page);
          }

          .auth-split__main {
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            padding: var(--space-8, 32px) var(--space-8, 32px);
          }

          .auth-split__card-wrap {
            width: 100%;
            max-width: 420px;
          }

          .auth-split__footer {
            padding: var(--space-3, 12px) var(--space-8, 32px);
            border-top: var(--border-default);
            font-size: var(--text-xs, 12px);
            color: var(--text-muted);
            background-color: var(--page);
          }

          @media (max-width: 1024px) {
            .auth-split {
              grid-template-columns: 2fr 3fr;
            }
          }

          @media (max-width: 720px) {
            .auth-split {
              grid-template-columns: 1fr;
              grid-template-rows: 148px minmax(0, 1fr);
            }

            .auth-split__visual {
              min-height: 148px;
              height: 148px;
            }

            .auth-split__panel {
              min-height: calc(100vh - 148px);
            }

            .auth-split__header,
            .auth-split__main,
            .auth-split__footer {
              padding-left: var(--layout-gutter);
              padding-right: var(--layout-gutter);
            }

            .auth-split__main {
              align-items: flex-start;
              padding-top: var(--space-6, 24px);
              padding-bottom: var(--space-6, 24px);
            }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--page)" }}>
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
        <Link to="/" style={{ textDecoration: "none", color: "inherit" }}>
          <BrandMark />
        </Link>
        <HeaderLink {...headerLink} />
      </header>

      <main
        style={{
          flex: 1,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8, 32px) var(--layout-gutter)"
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: width === "wide" ? "var(--auth-card-width-wide)" : "var(--auth-card-width)"
          }}
        >
          <Card>{children}</Card>
          {belowCard && (
            <div
              style={{
                marginTop: "var(--space-4, 16px)",
                textAlign: "center",
                fontSize: "var(--text-sm, 13px)",
                color: "var(--text-muted)"
              }}
            >
              {belowCard}
            </div>
          )}
        </div>
      </main>

      <footer
        style={{
          borderTop: "var(--border-default)",
          backgroundColor: "var(--page)",
          padding: "var(--space-3, 12px) var(--layout-gutter)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: "var(--text-xs, 12px)",
          color: "var(--text-muted)"
        }}
      >
        <div>
          &copy; {new Date().getFullYear()} {APP_CONFIG.name}
        </div>
      </footer>
    </div>
  );
};

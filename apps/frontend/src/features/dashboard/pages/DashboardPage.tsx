import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { PageHeader } from "../../../components/ui/PageHeader";
import { listEnquiries } from "../../enquiries/enquiries.api";
import { listQuotes } from "../../quotes/quotes.api";

interface Tile {
  label: string;
  value: string;
  href: string;
}

export const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    Promise.all([listEnquiries(), listQuotes()])
      .then(([enquiries, quotes]) => {
        if (cancelled || !user) return;
        const open = enquiries.data.filter((item) => item.status !== "won" && item.status !== "lost").length;
        const fresh = enquiries.data.filter((item) => item.status === "new").length;
        const waiting = quotes.data.filter((item) => item.status === "sent").length;
        const surveys = enquiries.data.filter((item) => item.status === "survey_scheduled").length;
        if (user.role === "technician") {
          setTiles([
            { label: "Surveys scheduled", value: surveys === 0 ? "None" : String(surveys), href: "/app/enquiries" },
            { label: "Open enquiries", value: open === 0 ? "None" : String(open), href: "/app/enquiries" }
          ]);
          return;
        }
        if (user.role === "admin") {
          setTiles([
            { label: "Unfinished enquiries", value: open === 0 ? "None" : String(open), href: "/app/enquiries" },
            { label: "Quotes waiting", value: waiting === 0 ? "None" : String(waiting), href: "/app/quotes" },
            { label: "Catalog", value: "Open", href: "/app/catalog" }
          ]);
          return;
        }
        setTiles([
          { label: "New enquiries", value: fresh === 0 ? "None" : String(fresh), href: "/app/enquiries" },
          { label: "Quotes waiting", value: waiting === 0 ? "None" : String(waiting), href: "/app/quotes" },
          { label: "Surveys scheduled", value: surveys === 0 ? "None" : String(surveys), href: "/app/enquiries" }
        ]);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load today's work.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <div>
      <PageHeader title="Today" description="Jalandhar rooftop operations" />
      {isLoading && <p style={{ padding: "24px var(--layout-gutter)", color: "var(--text-muted)" }}>Loading today's work...</p>}
      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">{error}</Alert>
        </div>
      )}
      {!isLoading && !error && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", padding: "16px var(--layout-gutter)" }}>
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              to={tile.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "var(--card)",
                border: "var(--border-default)",
                padding: "16px"
              }}
            >
              <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "var(--text-sm, 13px)" }}>{tile.label}</p>
              <p style={{ margin: "8px 0 0", fontSize: "var(--text-xl, 22px)", fontWeight: 650 }}>{tile.value}</p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

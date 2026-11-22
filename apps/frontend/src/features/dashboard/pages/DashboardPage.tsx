import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { listEnquiries } from "../../enquiries/enquiries.api";
import { listQuotes } from "../../quotes/quotes.api";
import { listServiceTickets } from "../../reports/reports.api";
import { countOpenTickets } from "../../reports/status";
import { DirectorDashboard } from "../components/DirectorDashboard";

interface Tile {
  label: string;
  value: string;
  href: string;
}

/** Non-admin roles keep the compact role tiles; admin gets the director overview. */
export const DashboardPage: React.FC = () => {
  const { user } = useAuth();

  if (user?.role === "admin") {
    return <DirectorDashboard />;
  }

  return <RoleDashboard />;
};

const RoleDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tiles, setTiles] = useState<Tile[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [primaryAction, setPrimaryAction] = useState<{ label: string; href: string } | null>(null);

  const load = () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);

    const role = user.role;

    const request =
      role === "technician"
        ? Promise.all([listEnquiries()]).then(([enquiries]) => {
            const open = enquiries.data.filter((item) => item.status !== "won" && item.status !== "lost").length;
            const surveys = enquiries.data.filter((item) => item.status === "survey_scheduled").length;
            setTiles([
              {
                label: "Surveys scheduled",
                value: surveys === 0 ? "None" : String(surveys),
                href: "/app/enquiries"
              },
              {
                label: "Open enquiries",
                value: open === 0 ? "None" : String(open),
                href: "/app/enquiries"
              }
            ]);
            setPrimaryAction({ label: "Open my job", href: "/app/enquiries" });
          })
        : role === "warehouse"
          ? Promise.resolve().then(() => {
              setTiles([
                { label: "Orders to pack", value: "Open warehouse", href: "/app/warehouse" },
                { label: "Dispatches", value: "Open warehouse", href: "/app/warehouse" }
              ]);
              setPrimaryAction({ label: "Pack next order", href: "/app/warehouse" });
            })
          : role === "support"
            ? listServiceTickets().then((tickets) => {
                const openTickets = countOpenTickets(tickets.data.map((item) => item.status));
                setTiles([
                  {
                    label: "Open tickets",
                    value: openTickets === 0 ? "None" : String(openTickets),
                    href: "/app/dashboard"
                  }
                ]);
                setPrimaryAction(null);
              })
            : Promise.all([listEnquiries(), listQuotes()]).then(([enquiries, quotes]) => {
                const fresh = enquiries.data.filter((item) => item.status === "new").length;
                const waiting = quotes.data.filter((item) => item.status === "sent").length;
                const surveys = enquiries.data.filter((item) => item.status === "survey_scheduled").length;
                setTiles([
                  {
                    label: "New enquiries",
                    value: fresh === 0 ? "None" : String(fresh),
                    href: "/app/enquiries"
                  },
                  {
                    label: "Quotes waiting",
                    value: waiting === 0 ? "None" : String(waiting),
                    href: "/app/quotes"
                  },
                  {
                    label: "Surveys scheduled",
                    value: surveys === 0 ? "None" : String(surveys),
                    href: "/app/enquiries"
                  }
                ]);
                setPrimaryAction({ label: "New enquiry", href: "/app/enquiries" });
              });

    request
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Could not load today's work.");
      })
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  return (
    <div>
      <PageHeader
        title="Today"
        description="Jalandhar rooftop operations"
        actions={
          primaryAction ? (
            <Button size="sm" onClick={() => navigate(primaryAction.href)}>
              {primaryAction.label}
            </Button>
          ) : undefined
        }
      />
      {isLoading && <SkeletonRows testId="dashboard-skeleton" rows={3} />}
      {error && (
        <div style={{ padding: "16px var(--layout-gutter)" }}>
          <Alert variant="danger" title="Request failed">
            {error}
            <div style={{ marginTop: "8px" }}>
              <Button size="sm" variant="outline" onClick={load}>
                Retry
              </Button>
            </div>
          </Alert>
        </div>
      )}
      {!isLoading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
            padding: "16px var(--layout-gutter)"
          }}
        >
          {tiles.map((tile) => (
            <Link
              key={tile.label}
              to={tile.href}
              style={{
                textDecoration: "none",
                color: "inherit",
                backgroundColor: "var(--section)",
                border: "var(--border-default)",
                padding: "16px",
                borderRadius: "var(--radius-card, 6px)"
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

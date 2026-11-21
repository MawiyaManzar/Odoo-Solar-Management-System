import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../../../app/AuthProvider";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { PageHeader } from "../../../components/ui/PageHeader";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { listEnquiries } from "../../enquiries/enquiries.api";
import { listOrders } from "../../orders/orders.api";
import { listQuotes } from "../../quotes/quotes.api";
import { listJobMargins, listServiceTickets } from "../../reports/reports.api";
import {
  calendarMonthInIndia,
  countOpenTickets,
  formatInr,
  isUnfinished
} from "../../reports/status";

interface Tile {
  label: string;
  value: string;
  href: string;
}

export const DashboardPage: React.FC = () => {
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
      role === "admin"
        ? Promise.all([listOrders(), listServiceTickets(), listJobMargins()]).then(([orders, tickets, margins]) => {
            const unfinished = orders.data.filter((item) => isUnfinished(item.status)).length;
            const openTickets = countOpenTickets(tickets.data.map((item) => item.status));
            const month = calendarMonthInIndia();
            const monthMargin = margins.data
              .filter(
                (item) =>
                  item.status === "completed" &&
                  item.completedAt &&
                  calendarMonthInIndia(new Date(item.completedAt)) === month
              )
              .reduce((sum, item) => sum + item.grossMarginInr, 0);
            setTiles([
              {
                label: "Unfinished jobs",
                value: unfinished === 0 ? "None" : String(unfinished),
                href: "/app/orders"
              },
              {
                label: "Open tickets",
                value: openTickets === 0 ? "None" : String(openTickets),
                href: "/app/reports"
              },
              {
                label: "Gross margin this month",
                value: monthMargin === 0 ? "None" : formatInr(monthMargin),
                href: "/app/reports"
              }
            ]);
            setPrimaryAction({ label: "Open reports", href: "/app/reports" });
          })
        : Promise.all([listEnquiries(), listQuotes()]).then(([enquiries, quotes]) => {
            const open = enquiries.data.filter((item) => item.status !== "won" && item.status !== "lost").length;
            const fresh = enquiries.data.filter((item) => item.status === "new").length;
            const waiting = quotes.data.filter((item) => item.status === "sent").length;
            const surveys = enquiries.data.filter((item) => item.status === "survey_scheduled").length;

            if (role === "technician") {
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
              return;
            }

            if (role === "warehouse") {
              setTiles([
                { label: "Orders to pack", value: "Open warehouse", href: "/app/warehouse" },
                { label: "Dispatches", value: "Open warehouse", href: "/app/warehouse" }
              ]);
              setPrimaryAction({ label: "Pack next order", href: "/app/warehouse" });
              return;
            }

            if (role === "support") {
              return listServiceTickets().then((tickets) => {
                const openTickets = countOpenTickets(tickets.data.map((item) => item.status));
                setTiles([
                  {
                    label: "Open tickets",
                    value: openTickets === 0 ? "None" : String(openTickets),
                    href: "/app/dashboard"
                  },
                  { label: "Under warranty", value: "None", href: "/app/dashboard" },
                  { label: "Billable repairs", value: "None", href: "/app/dashboard" }
                ]);
                setPrimaryAction(null);
              });
            }

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

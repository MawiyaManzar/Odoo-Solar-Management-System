import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { Table } from "../../../components/ui/Table";
import { labelStatus, statusVariant } from "../../enquiries/status";
import { formatInr } from "../../orders/status";
import { labelStatus as labelTicketStatus } from "../../service-tickets/status";
import {
  confirmCustomerCheckout,
  getCustomerToken,
  listCustomerOrders,
  listCustomerTickets,
  type CustomerOrder,
  type CustomerServiceTicket
} from "../../customer-quotes/customer-quote.api";
import { CustomerPayForm } from "../components/CustomerPayForm";
import { CustomerServiceForm } from "../components/CustomerServiceForm";
import { OrderStatusStepper } from "../components/OrderStatusStepper";

type Tab = "payments" | "dispatch" | "serials" | "service";

export const CustomerJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [tickets, setTickets] = useState<CustomerServiceTicket[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [tabByOrder, setTabByOrder] = useState<Record<string, Tab>>({});

  const load = () => {
    setIsLoading(true);
    setError(null);
    Promise.all([listCustomerOrders(), listCustomerTickets()])
      .then(([ordersResponse, ticketsResponse]) => {
        setOrders(ordersResponse.data);
        setTickets(ticketsResponse.data);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load your orders."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!getCustomerToken()) {
      navigate("/login", { replace: true });
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get("session_id");
    const orderId = params.get("order_id");
    const cancelled = params.get("cancelled") === "1";

    const clearQuery = () => {
      window.history.replaceState({}, "", "/my/jobs");
    };

    if (cancelled) {
      setNotice("Checkout was cancelled. No payment was taken.");
      clearQuery();
      load();
      return;
    }

    if (sessionId && orderId) {
      setIsLoading(true);
      confirmCustomerCheckout(orderId, sessionId)
        .then(() => {
          setNotice("Payment received. Packing unlocks once 30% of the order total is paid.");
          clearQuery();
          load();
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err.message : "Could not confirm the Stripe payment.");
          setIsLoading(false);
          clearQuery();
        });
      return;
    }

    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  const tab = (orderId: string): Tab => tabByOrder[orderId] ?? "payments";

  return (
    <main style={{ padding: "24px var(--layout-gutter) 48px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)" }}>My Job</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Track your order, make payments, check dispatch, warranty, and raise service requests.
        </p>
      </div>

      {notice && (
        <Alert variant="success" title="Payment">
          {notice}
        </Alert>
      )}

      {isLoading && <SkeletonRows testId="customer-jobs-skeleton" />}
      {error && (
        <Alert variant="danger" title="Request failed">
          {error}
          <div style={{ marginTop: "8px" }}>
            <Button size="sm" variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </Alert>
      )}
      {!isLoading && !error && orders.length === 0 && (
        <div data-testid="customer-jobs-empty">
          <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem" }}>No orders yet</h2>
          <p style={{ margin: 0, color: "var(--text-muted)" }}>
            An order appears after you accept a quote. Check <Link to="/my/quotes">My Quotes</Link>.
          </p>
        </div>
      )}

      {orders.map((order) => {
        const activeTab = tab(order.id);
        const orderTickets = tickets.filter(
          (ticket) => ticket.orderId === order.id || order.serials.some((serial) => serial.id === ticket.serialUnitId)
        );
        const dispatchStatus = order.dispatches[0]?.status ?? null;
        const isActive = order.status !== "cancelled" && order.status !== "completed";
        const canRequestService = order.serials.some((serial) => Boolean(serial.deliveredAt));

        return (
          <div key={order.id} style={{ display: "flex", flexDirection: "column", gap: "16px", minWidth: 0 }}>
            <section
              style={{
                border: "var(--border-default)",
                borderRadius: "var(--radius-card)",
                backgroundColor: "var(--card)",
                padding: "16px"
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                <div>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <h2 style={{ margin: 0, fontSize: "var(--text-lg)", fontFamily: "var(--font-mono)" }}>
                      #{order.id}
                    </h2>
                    <Badge variant={isActive ? "success" : order.status === "cancelled" ? "danger" : "neutral"}>
                      {isActive ? "Active" : labelStatus(order.status)}
                    </Badge>
                  </div>
                  <p style={{ margin: "8px 0 0" }}>{order.siteAddress}</p>
                  <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
                    {order.systemKw} kW · {labelStatus(order.systemKind)}
                  </p>
                </div>
                {canRequestService && (
                  <Button size="sm" variant="outline" onClick={() => navigate("/my/service")}>
                    Request Service
                  </Button>
                )}
              </div>
              <OrderStatusStepper
                status={order.status}
                dispatchStatus={dispatchStatus}
                balanceInr={order.balanceInr}
              />
            </section>

            <CustomerPayForm order={order} />

            <section
              style={{
                border: "var(--border-default)",
                borderRadius: "var(--radius-card)",
                backgroundColor: "var(--card)",
                overflow: "hidden"
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "4px",
                  borderBottom: "var(--border-default)",
                  padding: "0 8px",
                  overflowX: "auto"
                }}
              >
                {(
                  [
                    ["payments", "Payments"],
                    ["dispatch", "Dispatch"],
                    ["serials", "Serials & Warranty"],
                    ["service", "Service Requests"]
                  ] as const
                ).map(([key, label]) => {
                  const selected = activeTab === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setTabByOrder((prev) => ({ ...prev, [order.id]: key }))}
                      style={{
                        border: "none",
                        background: "transparent",
                        padding: "12px 14px",
                        cursor: "pointer",
                        fontSize: "var(--text-sm)",
                        fontWeight: selected ? 600 : 500,
                        color: selected ? "var(--brand)" : "var(--text-muted)",
                        borderBottom: selected ? "2px solid var(--brand)" : "2px solid transparent"
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
              <div style={{ padding: "16px" }}>
                {activeTab === "payments" &&
                  (order.payments.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-muted)" }}>No payments recorded yet.</p>
                  ) : (
                    <Table
                      data={order.payments}
                      keyExtractor={(payment) => payment.id}
                      emptyMessage="No payments recorded yet."
                      columns={[
                        {
                          key: "paidAt",
                          header: "Date",
                          isMono: true,
                          render: (payment) => new Date(payment.paidAt).toLocaleDateString("en-IN")
                        },
                        {
                          key: "amountInr",
                          header: "Amount",
                          isMono: true,
                          render: (payment) => formatInr(payment.amountInr)
                        },
                        {
                          key: "kind",
                          header: "Type",
                          render: (payment) => <Badge variant="info">{labelStatus(payment.kind)}</Badge>
                        },
                        {
                          key: "method",
                          header: "Method",
                          render: (payment) => (payment.method ? labelStatus(payment.method) : "—")
                        },
                        {
                          key: "reference",
                          header: "Reference",
                          isMono: true,
                          render: (payment) => payment.reference ?? "—"
                        }
                      ]}
                    />
                  ))}
                {activeTab === "dispatch" &&
                  (order.dispatches.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-muted)" }}>Not dispatched yet.</p>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {order.dispatches.map((dispatch) => (
                        <p key={dispatch.id} style={{ margin: 0 }}>
                          <Badge variant={statusVariant(dispatch.status)}>{labelStatus(dispatch.status)}</Badge>
                          {dispatch.vehicleNotes ? ` · ${dispatch.vehicleNotes}` : ""}
                        </p>
                      ))}
                    </div>
                  ))}
                {activeTab === "serials" &&
                  (order.serials.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-muted)" }}>
                      No serial numbers yet. Warranty starts when the kit is delivered.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "12px" }}>
                      {order.serials.map((serial) => (
                        <div key={serial.id} style={{ display: "grid", gap: "6px" }}>
                          <p style={{ margin: 0 }}>
                            {serial.productName} ·{" "}
                            <span style={{ fontFamily: "var(--font-mono)" }}>{serial.serialNumber}</span>
                            {serial.warrantyEndsAt
                              ? ` · until ${new Date(serial.warrantyEndsAt).toLocaleDateString("en-IN")}`
                              : serial.deliveredAt
                                ? " · no warranty period on file"
                                : " · warranty not started"}
                            {serial.underWarranty === true && " · Under warranty"}
                            {serial.underWarranty === false && " · Out of warranty"}
                          </p>
                          <CustomerServiceForm serial={serial} onCreated={load} />
                        </div>
                      ))}
                    </div>
                  ))}
                {activeTab === "service" &&
                  (orderTickets.length === 0 ? (
                    <p style={{ margin: 0, color: "var(--text-muted)" }}>
                      No service requests yet. Use Serials & Warranty after delivery, or open{" "}
                      <Link to="/my/service">Service Requests</Link>.
                    </p>
                  ) : (
                    <div style={{ display: "grid", gap: "8px" }}>
                      {orderTickets.map((ticket) => (
                        <p key={ticket.id} style={{ margin: 0 }}>
                          <span style={{ fontFamily: "var(--font-mono)" }}>{ticket.id}</span>
                          {" · "}
                          {ticket.serialNumber || "—"} · {labelTicketStatus(ticket.status)} · {ticket.description}
                        </p>
                      ))}
                    </div>
                  ))}
              </div>
            </section>
          </div>
        );
      })}
    </main>
  );
};

import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { BrandMark } from "../../../components/ui/BrandMark";
import { Button } from "../../../components/ui/Button";
import { labelStatus, statusVariant } from "../../enquiries/status";
import {
  getCustomerToken,
  listCustomerOrders,
  setCustomerToken,
  type CustomerOrder
} from "../../customer-quotes/customer-quote.api";

function inr(value: number): string {
  return value.toLocaleString("en-IN");
}

export const CustomerJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!getCustomerToken()) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    listCustomerOrders()
      .then((response) => {
        if (!cancelled) setOrders(response.data);
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : "Could not load your orders.");
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [navigate]);

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
      </header>
      <main style={{ padding: "24px var(--layout-gutter) 48px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl, 22px)" }}>My job</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Payment, dispatch, and warranty for your orders.</p>
        </div>
        {isLoading && <p style={{ color: "var(--text-muted)" }}>Loading your orders...</p>}
        {error && <Alert variant="danger" title="Request failed">{error}</Alert>}
        {!isLoading && !error && orders.length === 0 && (
          <p style={{ color: "var(--text-muted)" }}>No orders yet. An order appears after you accept a quote.</p>
        )}
        {orders.map((order) => (
          <article key={order.id} style={{ borderTop: "var(--border-default)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>{order.id}</h2>
              <Badge variant={statusVariant(order.status)}>{labelStatus(order.status)}</Badge>
            </div>
            <p style={{ margin: 0 }}>{order.siteAddress}</p>
            <p style={{ margin: 0 }}>{order.systemKw} kW · {labelStatus(order.systemKind)}</p>
            <p style={{ margin: 0 }}>Total {inr(order.totalInr)} · Paid {inr(order.paidInr)} · Balance {inr(order.balanceInr)}</p>
            <h3 style={{ margin: "8px 0 0", fontSize: "var(--text-base, 15px)" }}>Payments</h3>
            {order.payments.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>No payments recorded yet.</p>}
            {order.payments.map((payment) => (
              <p key={payment.id} style={{ margin: 0 }}>
                {inr(payment.amountInr)} · {labelStatus(payment.kind)} · {payment.method ? labelStatus(payment.method) : "—"} · {payment.reference ?? "No reference"}
              </p>
            ))}
            <h3 style={{ margin: "8px 0 0", fontSize: "var(--text-base, 15px)" }}>Dispatch</h3>
            {order.dispatches.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>Not dispatched yet.</p>}
            {order.dispatches.map((dispatch) => (
              <p key={dispatch.id} style={{ margin: 0 }}>
                <Badge variant={statusVariant(dispatch.status)}>{labelStatus(dispatch.status)}</Badge>
                {dispatch.vehicleNotes ? ` · ${dispatch.vehicleNotes}` : ""}
              </p>
            ))}
            <h3 style={{ margin: "8px 0 0", fontSize: "var(--text-base, 15px)" }}>Serials and warranty</h3>
            {order.serials.length === 0 && (
              <p style={{ margin: 0, color: "var(--text-muted)" }}>No serial numbers yet. Warranty starts when the kit is delivered.</p>
            )}
            {order.serials.map((serial) => (
              <p key={serial.id} style={{ margin: 0 }}>
                {serial.productName} · {serial.serialNumber}
                {serial.warrantyEndsAt
                  ? ` · until ${new Date(serial.warrantyEndsAt).toLocaleDateString("en-IN")}`
                  : " · warranty not started"}
                {serial.underWarranty === true && " · Under warranty"}
                {serial.underWarranty === false && " · Out of warranty"}
              </p>
            ))}
          </article>
        ))}
        <Link to="/">Back to SunPower</Link>
      </main>
    </div>
  );
};

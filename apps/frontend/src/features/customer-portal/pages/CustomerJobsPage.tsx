import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Badge } from "../../../components/ui/Badge";
import { Button } from "../../../components/ui/Button";
import { SkeletonRows } from "../../../components/ui/Skeleton";
import { labelStatus, statusVariant } from "../../enquiries/status";
import { formatInr } from "../../orders/status";
import { CustomerNav } from "../components/CustomerNav";
import { CustomerPayForm } from "../components/CustomerPayForm";
import {
  getCustomerToken,
  listCustomerOrders,
  type CustomerOrder
} from "../../customer-quotes/customer-quote.api";

export const CustomerJobsPage: React.FC = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState<CustomerOrder[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const load = () => {
    setIsLoading(true);
    setError(null);
    listCustomerOrders()
      .then((response) => setOrders(response.data))
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not load your orders."))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!getCustomerToken()) {
      navigate("/login", { replace: true });
      return;
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [navigate]);

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", backgroundColor: "var(--page)" }}>
      <CustomerNav />
      <main style={{ padding: "24px var(--layout-gutter) 48px", display: "flex", flexDirection: "column", gap: "16px" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "var(--text-xl, 22px)" }}>My job</h1>
          <p style={{ margin: "4px 0 0", color: "var(--text-muted)" }}>Payment, dispatch, and warranty for your orders.</p>
        </div>
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
            <p style={{ margin: 0, color: "var(--text-muted)" }}>An order appears after you accept a quote.</p>
          </div>
        )}
        {orders.map((order) => (
          <article key={order.id} style={{ borderTop: "var(--border-default)", paddingTop: "16px", display: "flex", flexDirection: "column", gap: "8px" }}>
            <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
              <h2 style={{ margin: 0, fontSize: "var(--text-lg, 18px)" }}>{order.id}</h2>
              <Badge variant={statusVariant(order.status)}>{labelStatus(order.status)}</Badge>
            </div>
            <p style={{ margin: 0 }}>{order.siteAddress}</p>
            <p style={{ margin: 0 }}>{order.systemKw} kW · {labelStatus(order.systemKind)}</p>
            <p style={{ margin: 0 }}>Total {formatInr(order.totalInr)} · Paid {formatInr(order.paidInr)} · Balance {formatInr(order.balanceInr)}</p>
            <CustomerPayForm order={order} onPaid={load} />
            <h3 style={{ margin: "8px 0 0", fontSize: "var(--text-base, 15px)" }}>Payments</h3>
            {order.payments.length === 0 && <p style={{ margin: 0, color: "var(--text-muted)" }}>No payments recorded yet.</p>}
            {order.payments.map((payment) => (
              <p key={payment.id} style={{ margin: 0 }}>
                {formatInr(payment.amountInr)} · {labelStatus(payment.kind)} · {payment.method ? labelStatus(payment.method) : "—"} · {payment.reference ?? "No reference"}
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
      </main>
    </div>
  );
};

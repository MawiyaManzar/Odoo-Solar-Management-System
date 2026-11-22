import { useCallback, useEffect, useState } from "react";
import { listEnquiries } from "../../enquiries/enquiries.api";
import type { EnquiryItem } from "../../enquiries/types";
import { listOrders } from "../../orders/orders.api";
import type { OrderItem } from "../../orders/types";
import { listQuotes } from "../../quotes/quotes.api";
import type { QuoteItem } from "../../quotes/types";
import { listJobMargins, listServiceTickets } from "../../reports/reports.api";
import type { JobMarginItem } from "../../reports/types";
import {
  buildAttention,
  buildJobRows,
  buildKpis,
  buildPipeline,
  buildProfitability,
  type AttentionItem,
  type DirectorKpis,
  type JobProfitRow,
  type PipelineCounts,
  type ProfitabilityTotals
} from "../metrics";
import type { DashboardPeriod } from "../period";

export interface DirectorDashboardData {
  kpis: DirectorKpis;
  pipeline: PipelineCounts;
  profitability: ProfitabilityTotals;
  attention: AttentionItem[];
  jobs: JobProfitRow[];
}

interface State {
  isLoading: boolean;
  error: string | null;
  data: DirectorDashboardData | null;
}

export function useDirectorDashboard(period: DashboardPeriod) {
  const [state, setState] = useState<State>({ isLoading: true, error: null, data: null });
  const [raw, setRaw] = useState<{
    margins: JobMarginItem[];
    orders: OrderItem[];
    enquiries: EnquiryItem[];
    quotes: QuoteItem[];
    ticketStatuses: string[];
  } | null>(null);

  const load = useCallback(() => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    Promise.all([listJobMargins(), listOrders(), listEnquiries(), listQuotes(), listServiceTickets()])
      .then(([margins, orders, enquiries, quotes, tickets]) => {
        setRaw({
          margins: margins.data,
          orders: orders.data,
          enquiries: enquiries.data,
          quotes: quotes.data,
          ticketStatuses: tickets.data.map((item) => item.status)
        });
      })
      .catch((err: unknown) => {
        setRaw(null);
        setState({
          isLoading: false,
          error: err instanceof Error ? err.message : "Could not load the director dashboard.",
          data: null
        });
      });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!raw) return;
    const now = new Date();
    setState({
      isLoading: false,
      error: null,
      data: {
        kpis: buildKpis(raw.margins, raw.orders, period, now),
        pipeline: buildPipeline(raw.enquiries, raw.quotes, raw.orders),
        profitability: buildProfitability(raw.margins, period, now),
        attention: buildAttention(raw.enquiries, raw.quotes, raw.orders, raw.ticketStatuses),
        jobs: buildJobRows(raw.margins, raw.orders)
      }
    });
  }, [raw, period]);

  return {
    isLoading: state.isLoading,
    error: state.error,
    data: state.data,
    reload: load
  };
}

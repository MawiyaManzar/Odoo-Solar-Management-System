import React from "react";
import { Link } from "react-router-dom";
import {
  CircleAlertIcon,
  CreditCardIcon,
  FileTextIcon,
  HeadsetIcon,
  MessageCircleIcon,
  WrenchIcon
} from "../../../components/ui/icons";
import type { AttentionItem } from "../metrics";
import "../dashboard.css";

interface Props {
  items: AttentionItem[];
}

const icons: Record<string, React.FC<{ size?: number }>> = {
  "enquiries-follow-up": MessageCircleIcon,
  "surveys-pending": WrenchIcon,
  "quotes-awaiting": FileTextIcon,
  "orders-payment": CreditCardIcon,
  "open-tickets": HeadsetIcon
};

export const AttentionRequired: React.FC<Props> = ({ items }) => (
  <section className="director-card">
    <h3 className="director-card__title">Attention Required</h3>
    <div className="director-attention">
      {items.map((item) => {
        const Icon = icons[item.id] ?? CircleAlertIcon;
        const danger = item.urgency === "danger" && item.count > 0;
        const warning = item.urgency === "warning" && item.count > 0;
        return (
          <div key={item.id} className="director-attention__row">
            <span
              className="director-attention__icon"
              style={{
                background: danger ? "var(--danger-bg)" : warning ? "var(--warning-bg)" : "var(--section)",
                color: danger ? "var(--danger)" : warning ? "var(--warning)" : "var(--text-muted)"
              }}
            >
              <Icon size={18} />
            </span>
            <div>
              <p className="director-attention__title">{item.title}</p>
              <p className="director-attention__desc">{item.description}</p>
            </div>
            <span
              className="director-attention__badge"
              style={{
                background: danger ? "var(--danger)" : warning ? "var(--warning)" : "var(--line)",
                color: danger || warning ? "var(--on-brand)" : "var(--text)"
              }}
            >
              {item.count}
            </span>
            <Link to={item.href} className="btn btn--outline btn--sm">
              View
            </Link>
          </div>
        );
      })}
    </div>
  </section>
);

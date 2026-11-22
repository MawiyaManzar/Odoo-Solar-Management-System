import React from "react";
import { Link } from "react-router-dom";
import {
  ArrowRightIcon,
  CheckIcon,
  FileTextIcon,
  MessageCircleIcon,
  SendIcon,
  WrenchIcon
} from "../../../components/ui/icons";
import type { PipelineCounts } from "../metrics";
import "../dashboard.css";

interface Props {
  pipeline: PipelineCounts;
}

const stages: {
  key: keyof PipelineCounts;
  label: string;
  href: string;
  tint: string;
  ink: string;
  Icon: React.FC<{ size?: number }>;
}[] = [
  {
    key: "enquiries",
    label: "Enquiries",
    href: "/app/enquiries",
    tint: "var(--brand-tint)",
    ink: "var(--brand)",
    Icon: MessageCircleIcon
  },
  {
    key: "surveys",
    label: "Surveys",
    href: "/app/enquiries",
    tint: "var(--accent-tint)",
    ink: "var(--accent)",
    Icon: WrenchIcon
  },
  {
    key: "quotes",
    label: "Quotes",
    href: "/app/quotes",
    tint: "var(--brand-tint)",
    ink: "var(--brand-press)",
    Icon: FileTextIcon
  },
  {
    key: "orders",
    label: "Orders",
    href: "/app/orders",
    tint: "var(--section)",
    ink: "var(--text)",
    Icon: SendIcon
  },
  {
    key: "completed",
    label: "Completed",
    href: "/app/orders",
    tint: "var(--success-bg)",
    ink: "var(--success)",
    Icon: CheckIcon
  }
];

export const OperationsPipeline: React.FC<Props> = ({ pipeline }) => (
  <section className="director-card">
    <h3 className="director-card__title">Operations Pipeline</h3>
    <div className="director-pipeline">
      {stages.map((stage, index) => (
        <React.Fragment key={stage.key}>
          {index > 0 && (
            <span className="director-pipeline__chevron" aria-hidden="true">
              <ArrowRightIcon size={16} />
            </span>
          )}
          <Link
            to={stage.href}
            className="director-pipeline__stage"
            style={{ background: stage.tint, color: stage.ink }}
          >
            <stage.Icon size={18} />
            <p className="director-pipeline__label" style={{ color: "var(--text-muted)" }}>
              {stage.label}
            </p>
            <p className="director-pipeline__count">{pipeline[stage.key]}</p>
          </Link>
        </React.Fragment>
      ))}
    </div>
  </section>
);

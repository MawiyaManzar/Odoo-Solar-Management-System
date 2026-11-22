import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Alert } from "../../../components/ui/Alert";
import { Button } from "../../../components/ui/Button";
import { Input } from "../../../components/ui/Input";
import { SendIcon } from "../../../components/ui/icons";
import { askCustomerSupport, getCustomerToken } from "../../customer-quotes/customer-quote.api";

type ChatLine = { role: "user" | "bot"; text: string; topic?: string };

const SUGGESTIONS = [
  "What is my payment balance?",
  "Where is my dispatch?",
  "Is my inverter under warranty?",
  "How do I accept my quote?",
  "How do I raise a service request?"
];

export const CustomerSupportPage: React.FC = () => {
  const navigate = useNavigate();
  const [question, setQuestion] = useState("");
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "bot",
      text: "Ask about payment, dispatch, warranty, quotes, installation, or service. Answers use your live order data.",
      topic: "general"
    }
  ]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!getCustomerToken()) navigate("/login", { replace: true });
  }, [navigate]);

  const ask = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);
    setBusy(true);
    setLines((prev) => [...prev, { role: "user", text: trimmed }]);
    setQuestion("");
    askCustomerSupport(trimmed)
      .then((response) => {
        setLines((prev) => [...prev, { role: "bot", text: response.data.answer, topic: response.data.topic }]);
      })
      .catch((err: unknown) => setError(err instanceof Error ? err.message : "Could not reach support."))
      .finally(() => setBusy(false));
  };

  return (
    <main
      style={{
        padding: "24px var(--layout-gutter) 48px",
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        maxWidth: "720px"
      }}
    >
      <div>
        <h1 style={{ margin: 0, fontSize: "var(--text-xl)" }}>Ask Support</h1>
        <p style={{ margin: "4px 0 0", color: "var(--text-muted)", fontSize: "var(--text-sm)" }}>
          Rule-based answers from your orders and quotes. No chat history is stored on the server.
        </p>
      </div>

      <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
        {SUGGESTIONS.map((item) => (
          <Button key={item} size="sm" variant="outline" disabled={busy} onClick={() => ask(item)}>
            {item}
          </Button>
        ))}
      </div>

      {error && (
        <Alert variant="danger" title="Support bot">
          {error}
        </Alert>
      )}

      <div
        style={{
          border: "var(--border-default)",
          borderRadius: "var(--radius-card)",
          backgroundColor: "var(--card)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          gap: "12px",
          minHeight: "320px"
        }}
      >
        {lines.map((line, index) => (
          <div
            key={`${line.role}-${index}`}
            style={{
              alignSelf: line.role === "user" ? "flex-end" : "flex-start",
              maxWidth: "85%",
              padding: "10px 12px",
              borderRadius: "var(--radius-card)",
              backgroundColor: line.role === "user" ? "var(--brand-tint)" : "var(--section)",
              border: line.role === "user" ? "1px solid var(--brand-line)" : "var(--border-default)",
              fontSize: "var(--text-sm)"
            }}
          >
            {line.topic && line.role === "bot" && (
              <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--text-muted)", marginBottom: "4px" }}>
                {line.topic}
              </div>
            )}
            {line.text}
          </div>
        ))}
      </div>

      <form
        onSubmit={(event) => {
          event.preventDefault();
          ask(question);
        }}
        style={{ display: "flex", gap: "8px", alignItems: "flex-end" }}
      >
        <div style={{ flex: 1 }}>
          <Input
            label="Your question"
            value={question}
            onChange={(event) => setQuestion(event.target.value)}
            placeholder="e.g. What is my payment balance?"
          />
        </div>
        <Button type="submit" variant="primary" isLoading={busy} disabled={!question.trim()}>
          <SendIcon size={16} /> Ask
        </Button>
      </form>
    </main>
  );
};

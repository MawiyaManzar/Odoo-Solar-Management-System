export interface ChoiceOption<T extends string> {
  value: T;
  label: string;
}

interface ChoiceGroupProps<T extends string> {
  label: string;
  options: ChoiceOption<T>[];
  value: T | "";
  onChange: (value: T) => void;
  columns?: number;
}

/** Flat pill tiles for phased inquiry. Selected = plum fill; no shadows or gradients. */
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
  columns = 2
}: ChoiceGroupProps<T>) {
  return (
    <fieldset style={{ margin: 0, padding: 0, border: "none" }}>
      <legend
        style={{
          margin: "0 0 12px",
          fontSize: "var(--text-lg, 18px)",
          fontWeight: 650,
          color: "var(--text)"
        }}
      >
        {label}
      </legend>
      <div
        role="group"
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
          gap: "10px"
        }}
      >
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={selected}
              onClick={() => onChange(option.value)}
              style={{
                margin: 0,
                padding: "14px 16px",
                textAlign: "left",
                fontFamily: "var(--font-sans)",
                fontSize: "var(--text-base, 15px)",
                fontWeight: 600,
                cursor: "pointer",
                borderRadius: "var(--radius-card)",
                border: selected ? "1px solid var(--brand)" : "var(--border-default)",
                backgroundColor: selected ? "var(--brand)" : "var(--card)",
                color: selected ? "var(--on-brand)" : "var(--text)",
                transition: "var(--transition-fast)"
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

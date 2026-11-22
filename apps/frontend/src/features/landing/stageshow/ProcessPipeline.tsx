import { Badge, Bar, Check, Roll, Stage, Swap, Window, type Act } from "./kit";
import "./process.css";

/** Install pipeline demo: inquiry → survey → quote approved → dispatched → installed. */

type StepId = 0 | 1 | 2 | 3 | 4;

type S = {
  ready: boolean;
  step: StepId;
};

const START: S = { ready: false, step: 0 };
const POSTER: S = { ready: true, step: 4 };

const STEPS: { id: StepId; label: string; status: string }[] = [
  { id: 0, label: "Inquiry", status: "New enquiry" },
  { id: 1, label: "Site survey", status: "Survey done" },
  { id: 2, label: "Quote approved", status: "Customer accepted" },
  { id: 3, label: "Dispatched", status: "Parts in transit" },
  { id: 4, label: "Installed", status: "Live on roof" }
];

async function script(a: Act<S>) {
  await a.wait(500);
  a.mark("open");
  a.put({ ready: true, step: 0 });
  await a.wait(1100);
  a.mark("survey");
  a.put({ step: 1 });
  await a.wait(1200);
  a.mark("quote");
  a.put({ step: 2 });
  await a.wait(1300);
  a.mark("dispatch");
  a.put({ step: 3 });
  await a.wait(1200);
  a.mark("installed");
  a.put({ step: 4 });
  await a.wait(2200);
}

function statusTone(step: StepId): "neutral" | "accent" | "success" | "warning" {
  if (step >= 4) return "success";
  if (step >= 2) return "accent";
  if (step === 1) return "warning";
  return "neutral";
}

export function ProcessPipeline() {
  return (
    <Stage<S>
      width={920}
      height={420}
      compact={{ below: 720, width: 358, height: 520 }}
      theme="light"
      play="once"
      initial={START}
      poster={POSTER}
      script={script}
      className="look-sunpower-pipeline sp-pipe"
      tokens={{
        "--ss-accent": "#c4a35a",
        "--ss-accent-2": "#f2b24a",
        "--ss-accent-soft": "rgba(196, 163, 90, 0.16)",
        "--ss-accent-text": "#1e3a2e",
        "--ss-success": "#3f5a45",
        "--ss-success-soft": "rgba(107, 143, 113, 0.18)",
        "--ss-success-text": "#1e3a2e",
        "--ss-warning": "#c4a35a",
        "--ss-warning-soft": "rgba(242, 178, 74, 0.2)",
        "--ss-warning-text": "#5a5160",
        "--ss-canvas": "#f7f4ec",
        "--ss-surface": "#fffdf8",
        "--ss-chrome": "#fffdf8",
        "--ss-well": "#f4efe6",
        "--ss-raised": "#fffdf8",
        "--ss-line": "rgba(43, 36, 48, 0.16)",
        "--ss-line-faint": "rgba(43, 36, 48, 0.08)",
        "--ss-text-strong": "#2b2430",
        "--ss-text": "#5a5160",
        "--ss-text-faint": "#8a8290",
        "--ss-font": '"Manrope", system-ui, sans-serif',
        "--ss-radius-md": "6px",
        "--ss-radius-window": "10px"
      }}
    >
      {(s, _rect, layout) => {
        const compact = layout === "compact";
        const current = STEPS[s.step];
        return (
          <>
            <div className="sp-pipe-wash" aria-hidden="true" />
            <Window
              url="app.sunpower.in/enquiries"
              className="sp-pipe-win"
              sidebarWidth={compact ? undefined : 148}
              sidebar={
                compact ? undefined : (
                  <div className="sp-pipe-side">
                    <div className="sp-pipe-side__brand">SunPower</div>
                    <div className="sp-pipe-side__nav">
                      <span data-on>Enquiries</span>
                      <Bar w={72} h={8} tone={2} />
                      <Bar w={64} h={8} tone={1} />
                      <Bar w={80} h={8} tone={1} />
                    </div>
                  </div>
                )
              }
            >
              <div className="sp-pipe-body" data-in={s.ready || undefined}>
                <header className="sp-pipe-head">
                  <div className="sp-pipe-title">Enquiry</div>
                  <Badge tone={statusTone(s.step)} className="sp-pipe-badge">
                    <Swap id={`st-${s.step}`}>{current.status}</Swap>
                  </Badge>
                </header>

                <div className="sp-pipe-card" data-target="enquiry">
                  <div className="sp-pipe-card__who">
                    <span className="sp-pipe-avatar">P</span>
                    <div>
                      <div className="sp-pipe-name">Priya Sharma</div>
                      <div className="sp-pipe-meta">Model Town · 3 kW on-grid</div>
                    </div>
                  </div>
                  <div className="sp-pipe-fields">
                    <div className="sp-pipe-field">
                      <span className="sp-pipe-muted">Source</span>
                      <span>Web form</span>
                    </div>
                    <div className="sp-pipe-field">
                      <span className="sp-pipe-muted">Stage</span>
                      <span className="sp-pipe-stage">
                        <Roll variant="fade">{current.label}</Roll>
                      </span>
                    </div>
                  </div>
                </div>

                <ol className="sp-pipe-rail" aria-label="Install pipeline">
                  {STEPS.map((step, i) => {
                    const done = s.ready && s.step > step.id;
                    const active = s.ready && s.step === step.id;
                    return (
                      <li
                        key={step.id}
                        className="sp-pipe-rail__item"
                        data-target={`step-${step.id}`}
                        data-done={done || undefined}
                        data-active={active || undefined}
                        style={{ transitionDelay: s.ready ? `${i * 40}ms` : "0ms" }}
                      >
                        <span className="sp-pipe-rail__dot">
                          {done ? <Check on size={12} /> : <span className="sp-pipe-rail__num">{i + 1}</span>}
                        </span>
                        <span className="sp-pipe-rail__label">{step.label}</span>
                        {i < STEPS.length - 1 && <span className="sp-pipe-rail__line" aria-hidden="true" />}
                      </li>
                    );
                  })}
                </ol>

                <div className="sp-pipe-foot" data-on={s.step >= 4 || undefined}>
                  <Check on={s.step >= 4} pending={s.step === 3} size={14} />
                  <Swap id={s.step >= 4 ? "live" : "wait"}>
                    {s.step >= 4 ? "Delivered and installed" : "Pipeline in progress"}
                  </Swap>
                </div>
              </div>
            </Window>
          </>
        );
      }}
    </Stage>
  );
}

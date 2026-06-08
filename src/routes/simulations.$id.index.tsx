import { createFileRoute, Link, useNavigate, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

import { getScenario, type Scenario } from "@/lib/scenarios";
import { reactToDecision, generateReport } from "@/lib/simulation.functions";
import { useI18n } from "@/lib/i18n";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Timer,
  TrendingDown,
  TrendingUp,
  Minus,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/simulations/$id/")({
  loader: ({ params }) => {
    const s = getScenario(params.id);
    if (!s) throw notFound();
    return { scenarioId: s.id };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `ProductPush — ${loaderData?.scenarioId ?? "Simulation"}` },
    ],
  }),
  component: SimulationRunner,
  notFoundComponent: () => (
    <AppShell>
      <div className="p-10">Сценарий не найден.</div>
    </AppShell>
  ),
  errorComponent: ({ error }) => (
    <AppShell>
      <div className="p-10 text-destructive">Error: {error.message}</div>
    </AppShell>
  ),
});

type HistoryItem = { step: number; decision: string; reaction: string };
type LiveMetric = { label: string; value: string; delta?: string; trend?: "up" | "down" | "flat" };

function resourceDetail(resource: string, scenario: Scenario, step: number) {
  const lower = resource.toLowerCase();
  const metric = scenario.metrics[(step - 1) % scenario.metrics.length];
  const message = scenario.messages[(step - 1) % Math.max(1, scenario.messages.length)];
  const update = scenario.updates[(step - 1) % Math.max(1, scenario.updates.length)];

  if (lower.includes("конкур") || lower.includes("competitor") || lower.includes("teardown")) {
    return `Главный конкурент уже продвигает похожее решение. Сильная сторона — скорость запуска и ясный value proposition; слабая — слабая интеграция в текущий workflow клиентов ${scenario.company.name}.`;
  }
  if (lower.includes("интерв") || lower.includes("interview") || lower.includes("feedback")) {
    return message
      ? `${message.from} (${message.role}): «${message.text}» Дополнительный сигнал: клиенты хотят меньше ручной работы и более понятный результат.`
      : `В интервью чаще всего повторяется запрос на более быстрый workflow и понятный ROI.`;
  }
  if (lower.includes("ёмкость") || lower.includes("capacity") || lower.includes("cost") || lower.includes("стоим")) {
    return `Предварительная оценка: MVP потребует 2–3 инженеров на 4–6 недель. Самые дорогие зоны — интеграции, качество данных и UX для первого запуска.`;
  }
  if (lower.includes("analytics") || lower.includes("dashboard") || lower.includes("аналит")) {
    return `${metric.label}: ${metric.value}${metric.delta ? ` (${metric.delta})` : ""}. Тренд требует проверить сегменты и сравнить поведение до/после последних изменений.`;
  }
  if (lower.includes("risk") || lower.includes("риск") || lower.includes("error") || lower.includes("лог")) {
    return update ? `Последний сигнал: ${update.text}. Риск: решение без быстрого owner-а и срока может усилить давление стейкхолдеров.` : `Основной риск — потеря времени на обсуждение без явного владельца следующего шага.`;
  }
  return `${resource}: рабочий артефакт для сценария «${scenario.scenario}». Используй его, чтобы уточнить гипотезу, риски и следующий шаг.`;
}

function ResourceIcon({ resource }: { resource: string }) {
  const r = resource.toLowerCase();
  if (r.includes("dashboard") || r.includes("аналит")) return <BarChart3 className="size-4 text-primary" />;
  if (r.includes("feedback") || r.includes("interview") || r.includes("интерв")) return <MessageSquare className="size-4 text-primary" />;
  if (r.includes("error") || r.includes("risk") || r.includes("лог") || r.includes("риск")) return <AlertTriangle className="size-4 text-warning" />;
  if (r.includes("capacity") || r.includes("ёмкость") || r.includes("стоим")) return <ClipboardList className="size-4 text-primary" />;
  return <FileText className="size-4 text-primary" />;
}

function SimulationRunner() {
  const { scenarioId } = Route.useLoaderData();
  const { getScenario } = useI18n();
  const scenario = getScenario(scenarioId);
  const [phase, setPhase] = useState<"briefing" | "running" | "complete">("briefing");

  if (!scenario) {
    return (
      <AppShell>
        <div className="p-10">Сценарий не найден.</div>
      </AppShell>
    );
  }

  if (phase === "briefing") return <Briefing scenario={scenario} onStart={() => setPhase("running")} />;
  if (phase === "running") return <Running scenario={scenario} onComplete={() => setPhase("complete")} />;
  return <Complete scenario={scenario} />;
}

/* ---------- BRIEFING ---------- */
function Briefing({ scenario, onStart }: { scenario: Scenario; onStart: () => void }) {
  const { t, tRole, tLevel } = useI18n();
  return (
    <AppShell>
      <div className="px-6 lg:px-10 py-8 max-w-5xl mx-auto">
        <Link to="/simulations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1 mb-6">
          <ArrowLeft className="size-4" /> {t("card.back")}
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_1fr] gap-6">
          <div className="rounded-2xl border bg-card p-6 shadow-card">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm font-medium text-muted-foreground">{t("brief.label")}</div>
              <Button onClick={onStart} className="bg-gradient-primary text-primary-foreground shadow-glow">
                {t("brief.start")}
              </Button>
            </div>

            <div className="aspect-[16/9] rounded-xl bg-gradient-primary mb-6 relative overflow-hidden grid place-items-center">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.25),transparent_50%)]" />
              <div className="relative text-white text-center px-6">
                <div className="text-xs uppercase tracking-widest opacity-80">{scenario.company.name}</div>
                <div className="mt-2 text-2xl font-bold max-w-md">{scenario.scenario}</div>
              </div>
            </div>

            <h1 className="text-2xl font-bold tracking-tight">{scenario.title}</h1>
            <p className="mt-2 text-muted-foreground">{scenario.briefing}</p>

            <h3 className="mt-6 font-semibold">{t("brief.h.objectives")}</h3>
            <ul className="mt-2 space-y-1.5">
              {scenario.objectives.map((o) => (
                <li key={o} className="flex gap-2 text-sm">
                  <CheckCircle2 className="size-4 text-primary shrink-0 mt-0.5" /> {o}
                </li>
              ))}
            </ul>

            <div className="mt-6 grid grid-cols-2 gap-4">
              <InfoBox label={t("brief.info.duration")} value={scenario.durationMin} />
              <InfoBox label={t("brief.info.difficulty")} value={tLevel(scenario.level)} />
              <InfoBox label={t("brief.info.steps")} value={String(scenario.totalSteps)} />
              <InfoBox label={t("brief.info.role")} value={tRole(scenario.role)} />
            </div>

            <h3 className="mt-6 font-semibold">{t("brief.h.evaluated")}</h3>
            <div className="mt-2 flex flex-wrap gap-2">
              {scenario.evaluatedOn.map((e) => (
                <span key={e} className="rounded-md bg-accent text-accent-foreground text-xs font-medium px-2 py-1">
                  {e}
                </span>
              ))}
            </div>
          </div>

          <div className="rounded-2xl border bg-card p-6 shadow-card h-fit">
            <h3 className="font-semibold mb-3">{t("brief.h.about")}</h3>
            <p className="text-sm text-muted-foreground">{scenario.company.about}</p>
            <div className="mt-4 space-y-3 text-sm">
              <InfoLine label={t("brief.info.employees")} value={scenario.company.employees} />
              <InfoLine label={t("brief.info.products")} value={scenario.company.products} />
              <InfoLine label={t("brief.info.market")} value={scenario.company.market} />
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-secondary/50 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

/* ---------- RUNNING ---------- */
function Running({ scenario, onComplete }: { scenario: Scenario; onComplete: () => void }) {
  const { t, tRole, lang } = useI18n();
  const react = useServerFn(reactToDecision);
  const buildReport = useServerFn(generateReport);
  const navigate = useNavigate();

  const [step, setStep] = useState(1);
  const [decision, setDecision] = useState("");
  const [pending, setPending] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [metrics, setMetrics] = useState<LiveMetric[]>(scenario.metrics);
  const [updates, setUpdates] = useState(scenario.updates);
  const [messages, setMessages] = useState(scenario.messages);
  const [suggested, setSuggested] = useState(scenario.suggestedActions);
  const [lastReaction, setLastReaction] = useState<string | null>(null);
  const [selectedResource, setSelectedResource] = useState(scenario.resources[0] ?? "");

  async function submit(text: string) {
    if (!text.trim() || pending) return;
    setPending(true);
    setDecision("");
    try {
      const res = await react({
        data: {
          scenarioId: scenario.id,
          step,
          totalSteps: scenario.totalSteps,
          decision: text,
          currentSuggestedActions: suggested,
          history,
          language: lang,
        },
      });

      setHistory((h) => [...h, { step, decision: text, reaction: res.reaction }]);
      setLastReaction(res.reaction);

      // merge metric changes
      setMetrics((cur) =>
        cur.map((m) => {
          const changed = res.metricChanges.find((c) => c.label.toLowerCase() === m.label.toLowerCase());
          return changed ? { ...m, value: changed.value, delta: changed.delta } : m;
        }),
      );

      if (res.newUpdate) setUpdates((u) => [{ time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }), text: res.newUpdate }, ...u]);
      if (res.newMessage) {
        setMessages((m) => [
          {
            from: res.newMessage.from,
            role: res.newMessage.role,
            time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            text: res.newMessage.text,
          },
          ...m,
        ]);
      }
      if (res.suggestedActions?.length) setSuggested(res.suggestedActions);

      if (step >= scenario.totalSteps) {
        // build & store report
        const report = await buildReport({
          data: {
            scenarioId: scenario.id,
            history: [...history, { step, decision: text, reaction: res.reaction }],
            language: lang,
          },
        });
        try {
          localStorage.setItem(
            `pp:result:${scenario.id}`,
            JSON.stringify({ report, scenarioId: scenario.id, at: Date.now() }),
          );
        } catch {}
        navigate({ to: "/simulations/$id/results", params: { id: scenario.id } });
        onComplete();
        return;
      }
      setStep((s) => s + 1);
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || String(e);
      setLastReaction(`${t("run.errorHiccup")} (${msg})`);
    } finally {
      setPending(false);
    }
  }

  return (
    <AppShell>
      <div className="px-6 lg:px-10 py-6 max-w-[1400px] mx-auto">
        {/* Top bar */}
        <div className="flex items-center justify-between mb-6">
          <Link to="/simulations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1">
            <ArrowLeft className="size-4" /> {t("card.backToSims")}
          </Link>
          <div className="text-sm font-medium">
            {tRole(scenario.role)} {t("run.simulationSuffix")} · <span className="text-muted-foreground">{t("run.stepOf", { n: step, total: scenario.totalSteps })}</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-sm font-mono">
              <Timer className="size-3.5 text-muted-foreground" /> 24:35
            </div>
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/simulations" })}>
              {t("run.end")}
            </Button>
          </div>
        </div>

        <div className="grid lg:grid-cols-[1.5fr_1fr] gap-6">
          {/* LEFT */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">{t("run.scenario")}</div>
                  <h1 className="mt-1 text-2xl font-bold tracking-tight">{scenario.scenario}</h1>
                </div>
                <div className="rounded-lg bg-secondary/60 p-3 text-xs max-w-[220px]">
                  <div className="font-medium text-muted-foreground">{t("run.companyGoal")}</div>
                  <div className="mt-1 text-foreground">{scenario.companyGoal}</div>
                </div>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{scenario.briefing}</p>

              <h3 className="mt-6 font-semibold text-sm">{t("run.keyMetrics")}</h3>
              <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-3">
                {metrics.map((m) => (
                  <MetricCard key={m.label} metric={m} />
                ))}
              </div>

              {lastReaction && (
                <div className="mt-6 rounded-lg border border-primary/20 bg-primary/5 p-4">
                  <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
                    <Sparkles className="size-3.5" /> {t("run.reaction")}
                  </div>
                  <p className="mt-1.5 text-sm text-foreground">{lastReaction}</p>
                </div>
              )}
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-semibold">{t("run.recentUpdates")}</h3>
              <div className="mt-3 space-y-2.5">
                {updates.map((u, i) => (
                  <div key={i} className="flex gap-3 text-sm">
                    <span className="text-xs font-mono text-muted-foreground w-16 shrink-0 pt-0.5">{u.time}</span>
                    <span className="size-1.5 rounded-full bg-primary mt-2 shrink-0" />
                    <span className="text-foreground">{u.text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decision */}
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-semibold">{t("run.yourDecision")}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{t("run.yourDecisionSub")}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {suggested.map((a) => (
                  <button
                    key={a}
                    disabled={pending}
                    onClick={() => submit(a)}
                    className={cn(
                      "rounded-lg border px-3 py-2 text-sm text-left transition-all",
                      "hover:border-primary hover:bg-primary/5 hover:text-primary",
                      "disabled:opacity-50 disabled:cursor-not-allowed",
                    )}
                  >
                    {a}
                  </button>
                ))}
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(decision);
                }}
                className="mt-4 flex gap-2"
              >
                <Input
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  placeholder={t("run.placeholder")}
                  disabled={pending}
                />
                <Button type="submit" disabled={pending || !decision.trim()} className="bg-gradient-primary text-primary-foreground shadow-glow">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : <><Send className="size-4" /> {t("run.submit")}</>}
                </Button>
              </form>
            </div>
          </div>

          {/* RIGHT */}
          <div className="space-y-6">
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <div className="flex items-center gap-2 mb-4 border-b pb-3">
                <MessageSquare className="size-4 text-primary" />
                <span className="font-semibold text-sm">{t("run.messages")}</span>
              </div>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                {messages.map((m, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="size-9 rounded-full bg-gradient-primary text-white grid place-items-center text-xs font-semibold shrink-0">
                      {m.from.split(" ").map((p) => p[0]).slice(0, 2).join("")}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-medium text-sm">{m.from}</div>
                        <div className="text-[11px] text-muted-foreground">{m.time}</div>
                      </div>
                      <div className="text-sm text-muted-foreground mt-0.5">{m.text}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-semibold text-sm mb-3">{t("run.resources")}</h3>
              <div className="space-y-2">
                {scenario.resources.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setSelectedResource(r)}
                    className={cn(
                      "w-full flex items-center gap-3 rounded-lg border p-3 text-sm text-left transition-all",
                      selectedResource === r
                        ? "border-primary bg-primary/5 text-primary"
                        : "hover:border-primary/50 hover:bg-secondary/50",
                    )}
                  >
                    <ResourceIcon resource={r} />
                    {r}
                  </button>
                ))}
              </div>
              {selectedResource && (
                <div className="mt-4 rounded-lg bg-secondary/40 border p-4">
                  <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
                    <ClipboardList className="size-3.5" /> {selectedResource}
                  </div>
                  <p className="mt-2 text-sm text-foreground leading-relaxed">
                    {resourceDetail(selectedResource, scenario, step)}
                  </p>
                </div>
              )}
            </div>

            {/* Step timeline */}
            <div className="rounded-2xl border bg-card p-6 shadow-card">
              <h3 className="font-semibold text-sm mb-3">{t("run.timeline")}</h3>
              <div className="flex flex-wrap items-center gap-1.5">
                {Array.from({ length: scenario.totalSteps }, (_, i) => i + 1).map((n) => (
                  <div
                    key={n}
                    className={cn(
                      "size-7 rounded-full grid place-items-center text-[11px] font-semibold border",
                      n < step && "bg-primary text-primary-foreground border-primary",
                      n === step && "bg-primary/15 text-primary border-primary ring-2 ring-primary/30",
                      n > step && "bg-secondary text-muted-foreground border-border",
                    )}
                  >
                    {n}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function MetricCard({ metric }: { metric: LiveMetric }) {
  const Icon = metric.trend === "down" ? TrendingDown : metric.trend === "up" ? TrendingUp : Minus;
  const color = metric.trend === "down" ? "text-destructive" : metric.trend === "up" ? "text-success" : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-secondary/30 p-3">
      <div className="text-xs text-muted-foreground">{metric.label}</div>
      <div className="text-xl font-bold mt-0.5">{metric.value}</div>
      {metric.delta && (
        <div className={`mt-1 flex items-center gap-1 text-[11px] ${color}`}>
          <Icon className="size-3" /> {metric.delta}
        </div>
      )}
    </div>
  );
}

/* ---------- COMPLETE redirect handled via navigate; this is fallback ---------- */
function Complete({ scenario }: { scenario: Scenario }) {
  return (
    <AppShell>
      <div className="p-10 text-center">
        <Link to="/simulations/$id/results" params={{ id: scenario.id }} className="text-primary underline">
          View results
        </Link>
      </div>
    </AppShell>
  );
}

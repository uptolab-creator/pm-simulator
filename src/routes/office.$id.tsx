import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { getMission } from "@/lib/missions";
import { useMissionEngine } from "@/lib/missions/engine";
import type { Choice, DeskObjectId, Step } from "@/lib/missions/types";
import { TONE_LABELS } from "@/lib/missions/types";
import { getStudent, saveStudentProgress, useStudent } from "@/lib/student/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  Target,
  Wallet,
  Clock,
  Heart,
  Wifi,
  Battery,
  SignalHigh,
  X,
  Sparkles,
  MonitorPlay,
  FolderOpen,
  Smartphone,
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Skull,
  Trophy,
  RotateCcw,
  PhoneCall,
  MessageSquare,
  Mail,
  FileText,
} from "lucide-react";
import officeBg from "@/assets/office-bg.jpg";
import laptopImg from "@/assets/office-laptop.png";
import phoneImg from "@/assets/office-phone.png";
import mugImg from "@/assets/office-mug.png";
import plantImg from "@/assets/office-plant.png";
import notebookImg from "@/assets/office-notebook.png";

export const Route = createFileRoute("/office/$id")({
  component: MissionRunner,
});

const OBJECT_META: Record<DeskObjectId, { label: string; icon: typeof Target }> = {
  dashboard: { label: "Доска на стене", icon: LayoutDashboard },
  folder: { label: "Папка с документами", icon: FolderOpen },
  phone: { label: "Телефон", icon: Smartphone },
  laptop: { label: "Ноутбук · Zoom", icon: MonitorPlay },
};

const CHANNEL_ICON = { chat: MessageSquare, email: Mail, call: PhoneCall } as const;

function MissionRunner() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const student = useStudent();
  const mission = getMission(id);

  useEffect(() => {
    if (student === null) navigate({ to: "/login" });
  }, [student, navigate]);

  if (!student) return null;

  if (!mission) {
    return (
      <div className="min-h-screen grid place-items-center bg-[oklch(0.14_0.02_265)] text-white">
        <div className="text-center">
          <p>Миссия не найдена.</p>
          <Link to="/app" className="text-primary hover:underline">К списку</Link>
        </div>
      </div>
    );
  }

  return <MissionStage key={mission.id} mission={mission} navigate={navigate} />;
}

function MissionStage({
  mission,
  navigate,
}: {
  mission: NonNullable<ReturnType<typeof getMission>>;
  navigate: ReturnType<typeof useNavigate>;
}) {
  const engine = useMissionEngine(mission);
  const { state, currentStep, metricPct, start, reset, choose } = engine;
  const [open, setOpen] = useState<DeskObjectId | null>(null);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const student = getStudent();
    if (!student) return;
    const status = state.status === "won" ? "completed" : "in_progress";
    void saveStudentProgress({
      studentId: student.id,
      kind: "office",
      itemId: mission.id,
      step: state.stepIndex,
      status,
      score: state.status === "won" ? metricPct : null,
    }).catch(() => {});
  }, [state.status, state.stepIndex, mission.id, metricPct]);


  const activeObject = state.status === "playing" ? currentStep?.object : null;
  const playing = state.status === "playing";

  function handleChoice(step: Step, choice: Choice) {
    choose(step, choice);
    setOpen(null);
  }

  function objectClick(obj: DeskObjectId) {
    if (!playing && obj !== "dashboard") return;
    setOpen(obj);
  }

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-[oklch(0.16_0.025_265)] text-white">
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 65% -10%, oklch(0.28 0.04 260 / 0.9), transparent 55%), radial-gradient(ellipse at 10% 110%, oklch(0.1 0.02 260 / 0.9), transparent 60%), linear-gradient(180deg, oklch(0.20 0.03 265), oklch(0.12 0.02 265))",
        }}
        aria-hidden
      />

      {/* Header */}
      <div className="relative z-10 px-4 md:px-6 lg:px-8 py-3">
        <div className="flex flex-wrap items-center gap-3 justify-between rounded-xl bg-black/40 backdrop-blur-md px-4 py-2 border border-white/10 shadow-xl">
          <div className="flex items-center gap-3 min-w-0">
            <Link to="/app" className="inline-flex items-center text-xs text-white/70 hover:text-white gap-1 shrink-0">
              <ArrowLeft className="size-3.5" />
            </Link>
            <div className="flex items-center gap-2 min-w-0">
              <div className="size-7 rounded-md bg-gradient-primary grid place-items-center shrink-0 shadow-glow">
                <Sparkles className="size-3.5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-[0.18em] text-white/50 leading-none">Симулятор PM · миссия</div>
                <div className="text-sm font-semibold truncate">{mission.title}</div>
              </div>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-[11px] font-mono text-white/60">
            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10">{mission.covers}</span>
            {playing && (
              <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10">
                Шаг {state.stepIndex + 1} / {mission.steps.length}
              </span>
            )}
            <span className="px-2 py-1 rounded-md bg-white/5 border border-white/10 inline-flex items-center gap-1.5">
              <SignalHigh className="size-3" /> <Wifi className="size-3" /> <Battery className="size-3.5" />
            </span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate({ to: "/app" })}
            className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white h-8"
          >
            Выйти из офиса
          </Button>
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 px-3 md:px-6 lg:px-8 pb-6 grid gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
        {/* SIDEBAR — live dashboard */}
        <aside className="rounded-2xl bg-black/45 backdrop-blur-xl border border-white/10 shadow-2xl p-4 space-y-5 self-start lg:sticky lg:top-3">
          <section>
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2 inline-flex items-center gap-1.5">
              <Target className="size-3" /> Цель миссии
            </div>
            <p className="text-[13px] leading-snug text-white/85">{mission.goalLabel}</p>
            <div className="mt-3">
              <div className="flex items-baseline justify-between mb-1">
                <span className="text-[11px] text-white/60">{mission.metric.label}</span>
                <span className="text-base font-bold tabular-nums text-amber-300">
                  {state.metric}
                  {mission.metric.unit} <span className="text-white/40 text-[11px]">/ {mission.metric.target}{mission.metric.unit}</span>
                </span>
              </div>
              <div className="h-2.5 w-full rounded-full bg-white/10 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all duration-500" style={{ width: `${metricPct}%` }} />
              </div>
            </div>
          </section>

          <section className="space-y-3">
            <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50">Критические шкалы</div>
            <ScaleBar icon={Wallet} label="Бюджет" value={state.scales.budget} tone="amber" />
            <ScaleBar icon={Clock} label="Сроки" value={state.scales.timeline} tone="sky" />
            <ScaleBar icon={Heart} label="Мотивация команды" value={state.scales.morale} tone="rose" />
            <p className="text-[10px] text-white/40 leading-snug">Если любая шкала упадёт до нуля — миссия провалена.</p>
          </section>

          {state.log.length > 0 && (
            <section>
              <div className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/50 mb-2">Лента событий</div>
              <ul className="space-y-1.5 max-h-52 overflow-y-auto pr-1">
                {state.log.slice().reverse().map((l, i) => (
                  <li key={i} className="rounded-md bg-white/5 border border-white/10 px-2 py-1.5 text-[11px] leading-snug text-white/70">
                    <span className="text-white/40">{l.phase}</span>
                    <div className="text-white/85">{l.feedback}</div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </aside>

        {/* STAGE */}
        <div className="relative">
          <div className="relative w-full rounded-2xl overflow-hidden border border-white/10 shadow-2xl" style={{ aspectRatio: "16 / 10", minHeight: 520 }}>
            <img src={officeBg} alt="Интерьер IT-офиса: рабочее место проектного менеджера" draggable={false} className="absolute inset-0 w-full h-full object-cover select-none" />
            <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse at 50% 35%, transparent 40%, rgba(0,0,0,0.55) 100%)" }} aria-hidden />

            {/* Dashboard / whiteboard on the wall */}
            <button
              type="button"
              onClick={() => objectClick("dashboard")}
              className={cn("absolute group cursor-pointer text-left", activeObject === "dashboard" && "office-bob")}
              style={{ left: "24%", top: "7%", width: "52%", height: "38%" }}
              aria-label="Открыть доску на стене с метриками"
            >
              <div className="relative w-full h-full rounded-md p-[10px] shadow-[0_25px_45px_-15px_rgba(0,0,0,0.85)]" style={{ background: "linear-gradient(145deg, oklch(0.75 0.02 80), oklch(0.42 0.03 70) 50%, oklch(0.62 0.03 75))" }}>
                <div className="relative w-full h-full rounded-sm bg-[oklch(0.98_0.005_90)] overflow-hidden p-[5%] text-[oklch(0.25_0.04_260)]">
                  <div className="font-marker text-[clamp(10px,1.1vw,16px)] uppercase text-[oklch(0.45_0.18_260)]">Цель миссии</div>
                  <div className="font-handwriting font-bold leading-[1.05] mt-1 text-[clamp(13px,1.5vw,24px)]">{mission.goalLabel}</div>
                  <div className="mt-2 font-handwriting text-[clamp(12px,1.4vw,22px)]">
                    {mission.metric.label}: <b>{state.metric}{mission.metric.unit}</b> → цель {mission.metric.target}{mission.metric.unit}
                  </div>
                  {activeObject === "dashboard" && <span className="absolute inset-0 ring-2 ring-amber-300/70 rounded-sm animate-pulse" />}
                </div>
                <div className="absolute left-[10%] -bottom-1.5 flex gap-1.5">
                  {["#1f2937", "#2563eb", "#dc2626", "#16a34a"].map((c) => (
                    <span key={c} className="block w-5 h-1.5 rounded-sm shadow-sm" style={{ background: c }} />
                  ))}
                </div>
              </div>
            </button>

            {/* Decor */}
            <img src={mugImg} alt="Кружка с кофе на столе" draggable={false} className="absolute pointer-events-none select-none drop-shadow-[0_18px_18px_rgba(0,0,0,0.65)]" style={{ left: "2%", bottom: "5%", width: "9%" }} />
            <img src={plantImg} alt="Растение в горшке" draggable={false} className="absolute pointer-events-none select-none drop-shadow-[0_18px_18px_rgba(0,0,0,0.6)]" style={{ right: "1%", bottom: "4%", width: "10%" }} />

            {/* Interactive objects */}
            <div className="absolute inset-x-0 bottom-0 h-[46%] pointer-events-none">
              <DeskObject style={{ left: "30%", bottom: "0%", width: "40%" }} src={laptopImg} label="Ноутбук — Zoom и задачи" ariaLabel="Открыть ноутбук" onClick={() => objectClick("laptop")} active={activeObject === "laptop"} disabled={!playing} />
              <DeskObject style={{ right: "10%", bottom: "12%", width: "8.5%" }} src={phoneImg} label="Телефон — входящие" ariaLabel="Открыть телефон" onClick={() => objectClick("phone")} active={activeObject === "phone"} badge={activeObject === "phone" ? "1" : undefined} disabled={!playing} />
              <DeskObject style={{ left: "13%", bottom: "2%", width: "13%" }} src={notebookImg} label="Папка с документами" ariaLabel="Открыть папку с документами" onClick={() => objectClick("folder")} active={activeObject === "folder"} disabled={!playing} />
            </div>

            {/* Overlays */}
            {state.status === "intro" && (
              <div className="absolute inset-0 grid place-items-center p-4 bg-black/40 backdrop-blur-[2px]">
                <IntroCard mission={mission} onStart={start} />
              </div>
            )}
            {(state.status === "won" || state.status === "lost") && (
              <div className="absolute inset-0 grid place-items-center p-4 bg-black/55 backdrop-blur-[2px] overflow-y-auto">
                <EndCard mission={mission} state={state} onRetry={reset} onFinish={() => navigate({ to: "/app" })} />
              </div>
            )}
          </div>

          {/* Hint strip */}
          {playing && currentStep && (
            <div className="mt-3 rounded-xl bg-black/40 backdrop-blur-md border border-primary/30 px-4 py-3 shadow-xl flex items-center gap-3">
              <div className="size-9 shrink-0 rounded-lg bg-primary/20 border border-primary/40 grid place-items-center text-primary">
                {(() => {
                  const Icon = OBJECT_META[currentStep.object].icon;
                  return <Icon className="size-5" />;
                })()}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">{currentStep.phase}</div>
                <div className="text-sm font-medium truncate">
                  Действие на объекте «{OBJECT_META[currentStep.object].label}»: {currentStep.title}
                </div>
              </div>
              <Button size="sm" className="ml-auto shrink-0" onClick={() => setOpen(currentStep.object)}>
                Открыть <ArrowRight className="size-4" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* MODALS */}
      {open === "dashboard" && (
        <Modal onClose={() => setOpen(null)} label="Доска · метрики">
          <DashboardPanel mission={mission} state={state} metricPct={metricPct} />
        </Modal>
      )}
      {open === "folder" && playing && currentStep?.object === "folder" && (
        <Modal onClose={() => setOpen(null)} label="Папка с документами" wide>
          <FolderPanel step={currentStep} onChoose={(c) => handleChoice(currentStep, c)} />
        </Modal>
      )}
      {open === "phone" && playing && currentStep?.object === "phone" && (
        <Modal onClose={() => setOpen(null)} label="Входящее" narrow>
          <PhonePanel step={currentStep} onChoose={(c) => handleChoice(currentStep, c)} />
        </Modal>
      )}
      {open === "laptop" && playing && currentStep?.object === "laptop" && (
        <Modal onClose={() => setOpen(null)} label="Ноутбук · Zoom-митинг" wide>
          <ZoomPanel step={currentStep} onChoose={(c) => handleChoice(currentStep, c)} />
        </Modal>
      )}
      {/* Wrong object opened while another is active */}
      {open && playing && currentStep && open !== currentStep.object && open !== "dashboard" && (
        <Modal onClose={() => setOpen(null)} label={OBJECT_META[open].label} narrow>
          <div className="p-6 text-center text-sm text-muted-foreground">
            Сейчас активен другой объект: <b className="text-foreground">{OBJECT_META[currentStep.object].label}</b>.
            <div className="mt-4">
              <Button size="sm" onClick={() => setOpen(currentStep.object)}>Перейти туда</Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

/* ---------- Scale bar ---------- */
function ScaleBar({ icon: Icon, label, value, tone }: { icon: typeof Target; label: string; value: number; tone: "amber" | "sky" | "rose" }) {
  const grad = tone === "amber" ? "from-amber-400 to-orange-500" : tone === "sky" ? "from-sky-400 to-blue-500" : "from-rose-400 to-pink-500";
  const low = value <= 25;
  return (
    <div>
      <div className="flex items-center justify-between text-[11px] mb-1">
        <span className="inline-flex items-center gap-1.5 text-white/70"><Icon className="size-3" /> {label}</span>
        <span className={cn("font-mono tabular-nums", low ? "text-rose-400 font-bold" : "text-white/50")}>{value}</span>
      </div>
      <div className="h-1.5 w-full rounded-full bg-white/10 overflow-hidden">
        <div className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-500", grad, low && "animate-pulse")} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

/* ---------- Desk object ---------- */
function DeskObject({ style, src, label, ariaLabel, onClick, active, badge, disabled }: { style: React.CSSProperties; src: string; label: string; ariaLabel: string; onClick: () => void; active?: boolean; badge?: string; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-label={ariaLabel} disabled={disabled} className="absolute pointer-events-auto group focus:outline-none disabled:opacity-50" style={style}>
      <div className={cn("relative transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-[1.04]", active && "office-bob")}>
        <img src={src} alt={label} draggable={false} className={cn("w-full h-auto select-none drop-shadow-[0_25px_25px_rgba(0,0,0,0.55)]", active && "drop-shadow-[0_0_30px_rgba(99,102,241,0.7)]")} style={{ filter: "contrast(1.02)" }} />
        {active && <span className="absolute -inset-2 rounded-xl ring-2 ring-primary/70 animate-pulse pointer-events-none" />}
        {badge && <span className="absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold grid place-items-center shadow-lg office-notif">{badge}</span>}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[11px] font-medium text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded-md whitespace-nowrap">{label}</span>
      </div>
    </button>
  );
}

/* ---------- Choice list (shared) ---------- */
function ChoiceList({ choices, onChoose, zoom }: { choices: Choice[]; onChoose: (c: Choice) => void; zoom?: boolean }) {
  const [picked, setPicked] = useState<Choice | null>(null);

  if (picked) {
    return (
      <div className="space-y-4">
        {zoom && picked.tone && (
          <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">Тон: {TONE_LABELS[picked.tone]}</div>
        )}
        <div className="rounded-xl bg-secondary px-4 py-3 text-sm">
          <span className="font-semibold">Ты выбрал: </span>{picked.text}
        </div>
        {picked.reply && (
          <div className="rounded-xl border bg-card px-4 py-3 text-sm italic text-muted-foreground">{picked.reply}</div>
        )}
        <div className={cn("rounded-lg border p-3 text-sm", picked.fatal ? "border-destructive/40 bg-destructive/10" : "border-primary/30 bg-primary/10")}>
          {picked.feedback}
        </div>
        <EffectChips effects={picked.effects} />
        <Button className="w-full" onClick={() => onChoose(picked)}>
          Продолжить <ArrowRight className="size-4" />
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {choices.map((c) => (
        <button
          key={c.id}
          type="button"
          onClick={() => setPicked(c)}
          className="w-full text-left rounded-xl border border-border bg-card hover:border-primary hover:bg-primary/5 px-4 py-3 text-sm transition-colors"
        >
          {zoom && c.tone && (
            <span className="inline-block mb-1 text-[10px] uppercase tracking-wider text-primary font-semibold">{TONE_LABELS[c.tone]}</span>
          )}
          <div className="font-medium">{c.text}</div>
        </button>
      ))}
    </div>
  );
}

function EffectChips({ effects }: { effects: Choice["effects"] }) {
  const items: { label: string; v: number }[] = [];
  if (effects.metric) items.push({ label: "Метрика", v: effects.metric });
  if (effects.budget) items.push({ label: "Бюджет", v: effects.budget });
  if (effects.timeline) items.push({ label: "Сроки", v: effects.timeline });
  if (effects.morale) items.push({ label: "Мотивация", v: effects.morale });
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {items.map((it) => (
        <span key={it.label} className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-medium", it.v >= 0 ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400" : "bg-destructive/15 text-destructive")}>
          {it.v >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {it.label} {it.v > 0 ? "+" : ""}{it.v}
        </span>
      ))}
    </div>
  );
}

/* ---------- Panels ---------- */
function DashboardPanel({ mission, state, metricPct }: { mission: NonNullable<ReturnType<typeof getMission>>; state: ReturnType<typeof useMissionEngine>["state"]; metricPct: number }) {
  return (
    <div className="p-5 sm:p-6 space-y-4">
      <div>
        <div className="text-[11px] uppercase tracking-wider text-primary font-semibold inline-flex items-center gap-1.5"><Target className="size-3.5" /> Цель</div>
        <p className="mt-1 font-semibold">{mission.goalLabel}</p>
      </div>
      <div className="rounded-xl border bg-secondary/40 p-4">
        <div className="flex items-baseline justify-between">
          <span className="text-sm text-muted-foreground">{mission.metric.label}</span>
          <span className="text-2xl font-bold tabular-nums">{state.metric}{mission.metric.unit}</span>
        </div>
        <div className="mt-2 h-2.5 w-full rounded-full bg-muted overflow-hidden">
          <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 transition-all" style={{ width: `${metricPct}%` }} />
        </div>
        <div className="mt-1 text-[11px] text-muted-foreground text-right">Цель: {mission.metric.target}{mission.metric.unit}</div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        {([["Бюджет", state.scales.budget], ["Сроки", state.scales.timeline], ["Мотивация", state.scales.morale]] as const).map(([l, v]) => (
          <div key={l} className="rounded-lg border bg-card p-2.5">
            <div className={cn("text-xl font-bold tabular-nums", v <= 25 ? "text-destructive" : "")}>{v}</div>
            <div className="text-[11px] text-muted-foreground">{l}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function FolderPanel({ step, onChoose }: { step: Step; onChoose: (c: Choice) => void }) {
  return (
    <div className="p-5 sm:p-6">
      <div className="text-[11px] uppercase tracking-wider text-primary font-semibold">{step.phase}</div>
      <h3 className="mt-1 text-lg font-bold">{step.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{step.situation}</p>
      {step.docs && (
        <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
          {step.docs.map((d, i) => (
            <div key={i} className="rounded-lg border bg-secondary/40 p-3">
              <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-primary uppercase tracking-wide"><FileText className="size-3.5" /> {d.title}</div>
              <p className="mt-1 text-[13px] leading-snug text-foreground/90">{d.body}</p>
            </div>
          ))}
        </div>
      )}
      <div className="mt-5 text-sm font-semibold">Твоё решение:</div>
      <div className="mt-2"><ChoiceList choices={step.choices} onChoose={onChoose} /></div>
    </div>
  );
}

function PhonePanel({ step, onChoose }: { step: Step; onChoose: (c: Choice) => void }) {
  const Icon = step.channel ? CHANNEL_ICON[step.channel] : PhoneCall;
  return (
    <div className="bg-[oklch(0.13_0.02_255)] text-white">
      <div className="bg-black/50 px-5 pt-2.5 pb-2 flex items-center justify-between text-[10px] text-white/70">
        <span>9:41</span>
        <span className="flex items-center gap-1"><SignalHigh className="size-3" /> <Wifi className="size-3" /> <Battery className="size-3.5" /></span>
      </div>
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="size-11 shrink-0 rounded-full bg-white/10 grid place-items-center text-2xl">{step.avatar ?? "📱"}</div>
          <div className="min-w-0">
            <div className="text-sm font-semibold inline-flex items-center gap-1.5">{step.from} <Icon className="size-3.5 text-emerald-400" /></div>
            <div className="text-[12px] text-white/50">{step.role}</div>
          </div>
        </div>
        <div className="mt-3 rounded-2xl rounded-tl-sm bg-white/10 px-4 py-3 text-[14px] leading-relaxed">{step.situation}</div>
        <div className="mt-4 [&_button]:bg-white/[0.04] [&_button]:border-white/15 [&_button]:text-white [&_button:hover]:bg-white/10">
          <ChoiceList choices={step.choices} onChoose={onChoose} />
        </div>
      </div>
    </div>
  );
}

function ZoomPanel({ step, onChoose }: { step: Step; onChoose: (c: Choice) => void }) {
  const participants = step.meeting?.participants ?? [];
  return (
    <div className="bg-[oklch(0.12_0.02_255)] text-white">
      <div className="px-4 py-2 bg-black/40 flex items-center justify-between text-[11px] text-white/60">
        <span className="inline-flex items-center gap-1.5"><MonitorPlay className="size-3.5 text-primary" /> Zoom · {step.meeting?.topic ?? step.title}</span>
        <span className="inline-flex items-center gap-1 text-emerald-400"><span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" /> в эфире</span>
      </div>
      <div className={cn("grid gap-2 p-3", participants.length > 1 ? "grid-cols-2" : "grid-cols-1")}>
        {participants.map((p) => (
          <div key={p.name} className="relative rounded-lg bg-gradient-to-b from-white/10 to-white/5 border border-white/10 aspect-video grid place-items-center">
            <div className="text-center">
              <div className="text-4xl">{p.avatar}</div>
              <div className="mt-1 text-sm font-semibold">{p.name}</div>
              <div className="text-[11px] text-white/50">{p.role}</div>
            </div>
            {p.mood && <span className="absolute bottom-1.5 left-1.5 text-[10px] px-1.5 py-0.5 rounded bg-black/50 text-white/70">{p.mood}</span>}
          </div>
        ))}
      </div>
      <div className="px-4 pb-4">
        <div className="rounded-xl bg-white/[0.04] border border-white/10 px-4 py-3 text-[14px] leading-relaxed">{step.situation}</div>
        <div className="mt-3 text-[11px] uppercase tracking-wider text-white/50 font-semibold">Твоя реплика — выбери тон:</div>
        <div className="mt-2 [&_button]:bg-white/[0.04] [&_button]:border-white/15 [&_button]:text-white [&_button:hover]:bg-white/10">
          <ChoiceList choices={step.choices} onChoose={onChoose} zoom />
        </div>
      </div>
    </div>
  );
}

/* ---------- Intro ---------- */
function IntroCard({ mission, onStart }: { mission: NonNullable<ReturnType<typeof getMission>>; onStart: () => void }) {
  return (
    <div className="w-full max-w-lg rounded-2xl bg-black/55 backdrop-blur-xl border border-white/15 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className="text-[11px] uppercase tracking-[0.18em] text-primary font-semibold">{mission.covers}</div>
      <h1 className="mt-2 text-2xl font-bold">{mission.title}</h1>
      <p className="mt-1 text-white/70 text-sm">{mission.industry}</p>
      <p className="mt-4 leading-relaxed text-white/85 text-sm">{mission.intro}</p>
      <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-sm text-white/85 inline-flex items-start gap-2">
        <Target className="size-4 mt-0.5 text-primary shrink-0" /> {mission.goalLabel}
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2 text-center text-[10px] text-white/60">
        {[["Доска", LayoutDashboard], ["Папка", FolderOpen], ["Телефон", Smartphone], ["Ноутбук", MonitorPlay]].map(([l, I]) => {
          const Ico = I as typeof Target;
          return (
            <div key={l as string} className="rounded-lg bg-white/5 border border-white/10 py-2">
              <Ico className="size-4 mx-auto mb-1 text-primary" /> {l as string}
            </div>
          );
        })}
      </div>
      <Button className="mt-6 w-full" onClick={onStart}>
        Начать миссию <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/* ---------- End screen ---------- */
function EndCard({ mission, state, onRetry, onFinish }: { mission: NonNullable<ReturnType<typeof getMission>>; state: ReturnType<typeof useMissionEngine>["state"]; onRetry: () => void; onFinish: () => void }) {
  const won = state.status === "won";
  const fatalStep = state.fatalStepId ? mission.steps.find((s) => s.id === state.fatalStepId) : undefined;
  return (
    <div className="w-full max-w-lg rounded-2xl bg-black/60 backdrop-blur-xl border border-white/15 shadow-2xl p-6 animate-in fade-in zoom-in-95 duration-300">
      <div className={cn("inline-flex items-center gap-2 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-wider", won ? "bg-emerald-500/20 text-emerald-300" : "bg-destructive/20 text-destructive")}>
        {won ? <Trophy className="size-3.5" /> : <Skull className="size-3.5" />}
        {won ? "Миссия выполнена" : "Проект провален"}
      </div>
      <h2 className="mt-3 text-2xl font-bold">
        {won ? "Цель достигнута! 🎉" : "Game Over"}
      </h2>
      <p className="mt-2 text-sm text-white/75">
        {won
          ? `${mission.metric.label}: ${state.metric}${mission.metric.unit} (цель ${mission.metric.target}${mission.metric.unit}). Ты вырос как настоящий PM.`
          : state.fatalReason ?? "Цель не достигнута."}
      </p>

      {!won && fatalStep && (
        <div className="mt-4 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm">
          <div className="font-semibold text-destructive">Фатальная ошибка на шаге</div>
          <div className="mt-0.5 text-white/80">{fatalStep.phase} · {fatalStep.title}</div>
        </div>
      )}

      <div className="mt-4 grid grid-cols-4 gap-2 text-center">
        {([["Метрика", `${state.metric}${mission.metric.unit}`], ["Бюджет", state.scales.budget], ["Сроки", state.scales.timeline], ["Команда", state.scales.morale]] as const).map(([l, v]) => (
          <div key={l} className="rounded-lg bg-white/5 border border-white/10 p-2">
            <div className="text-lg font-bold tabular-nums">{v}</div>
            <div className="text-[10px] text-white/50">{l}</div>
          </div>
        ))}
      </div>

      <div className="mt-5 flex gap-2">
        <Button variant="outline" className="flex-1 bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white" onClick={onRetry}>
          <RotateCcw className="size-4" /> Заново
        </Button>
        <Button className="flex-1" onClick={onFinish}>
          К курсу <ArrowRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}

/* ---------- Modal ---------- */
function Modal({ onClose, label, wide, narrow, children }: { onClose: () => void; label: string; wide?: boolean; narrow?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6">
      <button type="button" aria-label="Закрыть" onClick={onClose} className="absolute inset-0 bg-black/60 office-backdrop-in" />
      <div className={cn("relative w-full animate-in fade-in zoom-in-95 duration-200", narrow ? "max-w-[360px]" : wide ? "max-w-2xl" : "max-w-md")}>
        <div className="rounded-2xl bg-card text-foreground shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-secondary/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
            <button type="button" onClick={onClose} className="size-7 rounded-md grid place-items-center hover:bg-secondary text-muted-foreground hover:text-foreground" aria-label="Закрыть">
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-[88vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

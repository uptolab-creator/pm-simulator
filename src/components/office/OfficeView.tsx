import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  BarChart3,
  ClipboardList,
  FileText,
  Loader2,
  MessageSquare,
  Send,
  Sparkles,
  TrendingDown,
  TrendingUp,
  Minus,
  AlertTriangle,
  Clock,
  Wifi,
  Battery,
  Signal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Scenario } from "@/lib/scenarios";
import officeBg from "@/assets/office-bg.jpg";
import laptopImg from "@/assets/office-laptop.png";
import phoneImg from "@/assets/office-phone.png";
import docsImg from "@/assets/office-docs.png";

type LiveMetric = { label: string; value: string; delta?: string; trend?: "up" | "down" | "flat" };
type HistoryItem = { step: number; decision: string; reaction: string };

export interface OfficeViewProps {
  scenario: Scenario;
  step: number;
  totalSteps: number;
  decision: string;
  setDecision: (v: string) => void;
  pending: boolean;
  history: HistoryItem[];
  metrics: LiveMetric[];
  updates: { time: string; text: string }[];
  messages: { from: string; role: string; time: string; text: string }[];
  suggested: string[];
  lastReaction: string | null;
  selectedResource: string;
  setSelectedResource: (r: string) => void;
  submit: (text: string) => void;
  viewToggle: ReactNode;
}

type ModalId = null | "computer" | "phone" | "docs" | "whiteboard";

export function OfficeView(props: OfficeViewProps) {
  const { t, tRole } = useI18n();
  const navigate = useNavigate();
  const [open, setOpen] = useState<ModalId>(null);
  const { scenario, step, totalSteps } = props;

  const visibleResourceCount = Math.min(
    scenario.resources.length,
    Math.max(2, step + 1),
  );
  const visibleResources = useMemo(
    () => scenario.resources.slice(0, visibleResourceCount),
    [scenario.resources, visibleResourceCount],
  );

  // unread tracking
  const [seenMessages, setSeenMessages] = useState(props.messages.length);
  const [seenDocs, setSeenDocs] = useState(visibleResourceCount);
  const [phoneRing, setPhoneRing] = useState(false);
  const [paperPulse, setPaperPulse] = useState(false);
  const prevMsgRef = useRef(props.messages.length);
  const prevDocRef = useRef(visibleResourceCount);

  useEffect(() => {
    if (props.messages.length > prevMsgRef.current) {
      setPhoneRing(true);
      const t = setTimeout(() => setPhoneRing(false), 1800);
      prevMsgRef.current = props.messages.length;
      return () => clearTimeout(t);
    }
    prevMsgRef.current = props.messages.length;
  }, [props.messages.length]);

  useEffect(() => {
    if (visibleResourceCount > prevDocRef.current) {
      setPaperPulse(true);
      const t = setTimeout(() => setPaperPulse(false), 1200);
      prevDocRef.current = visibleResourceCount;
      return () => clearTimeout(t);
    }
    prevDocRef.current = visibleResourceCount;
  }, [visibleResourceCount]);

  useEffect(() => {
    if (open === "phone") setSeenMessages(props.messages.length);
    if (open === "docs") setSeenDocs(visibleResourceCount);
  }, [open, props.messages.length, visibleResourceCount]);

  const unreadMessages = Math.max(0, props.messages.length - seenMessages);
  const unreadDocs = Math.max(0, visibleResourceCount - seenDocs);

  // ESC closes modal
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden">
      {/* Photoreal office backdrop */}
      <div
        className="absolute inset-0 -z-10 bg-cover bg-center"
        style={{ backgroundImage: `url(${officeBg})` }}
        aria-hidden
      />
      {/* warm vignette for depth */}
      <div
        className="absolute inset-0 -z-10 pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at 50% 90%, transparent 30%, rgba(0,0,0,0.45) 90%)",
        }}
        aria-hidden
      />

      {/* Top translucent bar */}
      <div className="relative z-10 px-4 md:px-8 lg:px-12 py-4">
        <div className="flex flex-wrap items-center gap-3 justify-between rounded-2xl bg-black/35 backdrop-blur-md text-white px-4 py-2.5 border border-white/10 shadow-xl">
          <Link
            to="/simulations"
            className="inline-flex items-center text-sm text-white/80 hover:text-white gap-1"
          >
            <ArrowLeft className="size-4" /> {t("card.backToSims")}
          </Link>
          <div className="text-sm font-medium">
            {tRole(scenario.role)} {t("run.simulationSuffix")} ·{" "}
            <span className="text-white/60">
              {t("run.stepOf", { n: step, total: totalSteps })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {props.viewToggle}
            <OfficeClock step={step} totalSteps={totalSteps} />
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate({ to: "/simulations" })}
              className="bg-white/10 border-white/20 text-white hover:bg-white/20 hover:text-white"
            >
              {t("run.end")}
            </Button>
          </div>
        </div>
      </div>

      {/* Stage: positioned overlays on the photoreal scene */}
      <div className="relative w-full" style={{ aspectRatio: "16 / 9", minHeight: 520 }}>
        {/* Whiteboard handwritten overlay — anchored on the whiteboard area of the bg */}
        <button
          type="button"
          onClick={() => setOpen("whiteboard")}
          className="absolute group cursor-pointer text-left"
          style={{ left: "29%", top: "22%", width: "42%", height: "44%" }}
          aria-label={t("office.whiteboard")}
        >
          <WhiteboardWriting scenario={scenario} metrics={props.metrics} step={step} />
          <span className="absolute inset-0 rounded-md ring-0 group-hover:ring-2 ring-amber-300/50 transition" />
        </button>

        {/* Desk objects row — bottom area of the photo */}
        <div className="absolute inset-x-0 bottom-0 h-[42%] pointer-events-none">
          {/* Docs (left) */}
          <DeskPhotoObject
            style={{ left: "8%", bottom: "8%", width: "22%" }}
            src={docsImg}
            label={t("office.docs")}
            ariaLabel={t("office.openDocs")}
            onClick={() => setOpen("docs")}
            badge={unreadDocs > 0 ? String(unreadDocs) : undefined}
            pulseBadge={paperPulse || unreadDocs > 0}
            tiltDeg={-4}
            count={visibleResourceCount}
          />

          {/* Laptop (center) */}
          <DeskPhotoObject
            style={{ left: "36%", bottom: "2%", width: "30%" }}
            src={laptopImg}
            label={t("office.computer")}
            ariaLabel={t("office.openComputer")}
            onClick={() => setOpen("computer")}
            tiltDeg={0}
            glow
          />

          {/* Phone (right) */}
          <DeskPhotoObject
            style={{ right: "8%", bottom: "6%", width: "13%" }}
            src={phoneImg}
            label={t("office.phone")}
            ariaLabel={t("office.openPhone")}
            onClick={() => setOpen("phone")}
            badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
            pulseBadge={unreadMessages > 0}
            ringing={phoneRing}
            tiltDeg={2}
          />
        </div>
      </div>

      {/* Bottom timeline strip */}
      <div className="relative z-10 px-4 md:px-8 lg:px-12 pb-6 -mt-4">
        <div className="rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 text-white px-4 py-3 shadow-xl">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-white/60 mb-1.5">
            {t("run.timeline")}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={cn(
                  "size-6 rounded-full grid place-items-center text-[11px] font-semibold border transition-all",
                  n < step && "bg-primary text-primary-foreground border-primary",
                  n === step && "bg-primary/25 text-white border-primary ring-2 ring-primary/50",
                  n > step && "bg-white/5 text-white/50 border-white/20",
                )}
              >
                {n}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modals */}
      {open === "computer" && (
        <ObjectModal onClose={() => setOpen(null)} anim="laptop" label={t("office.computer")} wide>
          <ComputerPanel
            suggested={props.suggested}
            decision={props.decision}
            setDecision={props.setDecision}
            pending={props.pending}
            submit={(t) => {
              props.submit(t);
            }}
            step={step}
            totalSteps={totalSteps}
            lastReaction={props.lastReaction}
            history={props.history}
          />
        </ObjectModal>
      )}
      {open === "phone" && (
        <ObjectModal onClose={() => setOpen(null)} anim="phone" label={t("office.phone")}>
          <PhonePanel messages={props.messages} />
        </ObjectModal>
      )}
      {open === "docs" && (
        <ObjectModal onClose={() => setOpen(null)} anim="docs" label={t("office.docs")} wide>
          <DocsPanel
            scenario={scenario}
            step={step}
            selected={props.selectedResource}
            setSelected={props.setSelectedResource}
            resources={visibleResources}
            newCount={unreadDocs}
          />
        </ObjectModal>
      )}
      {open === "whiteboard" && (
        <ObjectModal onClose={() => setOpen(null)} anim="whiteboard" label={t("office.whiteboard")} wide>
          <WhiteboardFull
            scenario={scenario}
            metrics={props.metrics}
            updates={props.updates}
            lastReaction={props.lastReaction}
          />
        </ObjectModal>
      )}
    </div>
  );
}

/* ---------------- Modal wrapper with per-object entry animation ---------------- */
function ObjectModal({
  onClose,
  anim,
  label,
  wide,
  children,
}: {
  onClose: () => void;
  anim: "laptop" | "phone" | "docs" | "whiteboard";
  label: string;
  wide?: boolean;
  children: ReactNode;
}) {
  const animClass =
    anim === "laptop"
      ? "office-laptop-open"
      : anim === "phone"
      ? "office-phone-lift"
      : anim === "docs"
      ? "office-docs-fan"
      : "office-handwrite";

  return (
    <div className="fixed inset-0 z-50 grid place-items-center px-4 py-6">
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/60 office-backdrop-in"
      />
      {anim === "docs" && <FanningSheets />}
      <div
        className={cn(
          "relative w-full",
          wide ? "max-w-4xl" : "max-w-md",
          animClass,
        )}
      >
        <div className="rounded-2xl bg-card text-foreground shadow-2xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b bg-secondary/50">
            <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {label}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="size-7 rounded-md grid place-items-center hover:bg-secondary text-muted-foreground hover:text-foreground"
              aria-label="Close"
            >
              <X className="size-4" />
            </button>
          </div>
          <div className="max-h-[78vh] overflow-y-auto">{children}</div>
        </div>
      </div>
    </div>
  );
}

/* Decorative fanning sheets behind the docs modal */
function FanningSheets() {
  return (
    <div className="absolute inset-0 pointer-events-none grid place-items-center" aria-hidden>
      {[-18, -8, 0, 9, 19].map((deg, i) => (
        <div
          key={i}
          className="absolute w-[260px] h-[340px] rounded bg-[oklch(0.98_0.01_80)] shadow-2xl office-sheet-deal"
          style={
            {
              "--r-from": `${deg - 8}deg`,
              "--r-to": `${deg}deg`,
              animationDelay: `${i * 60}ms`,
              transform: `rotate(${deg}deg)`,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
}

/* ---------------- Photoreal desk object ---------------- */
function DeskPhotoObject({
  style,
  src,
  label,
  ariaLabel,
  onClick,
  badge,
  pulseBadge,
  ringing,
  tiltDeg = 0,
  glow,
  count,
}: {
  style: React.CSSProperties;
  src: string;
  label: string;
  ariaLabel: string;
  onClick: () => void;
  badge?: string;
  pulseBadge?: boolean;
  ringing?: boolean;
  tiltDeg?: number;
  glow?: boolean;
  count?: number;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="absolute pointer-events-auto group focus:outline-none"
      style={style}
    >
      <div
        className={cn(
          "relative transition-transform duration-300 group-hover:-translate-y-2 group-hover:scale-[1.04] office-bob",
          ringing && "office-phone-ring",
        )}
        style={{ transform: `rotate(${tiltDeg}deg)` }}
      >
        <img
          src={src}
          alt=""
          draggable={false}
          className={cn(
            "w-full h-auto select-none",
            "drop-shadow-[0_25px_25px_rgba(0,0,0,0.55)]",
            glow && "group-hover:drop-shadow-[0_0_30px_rgba(99,102,241,0.55)]",
          )}
          style={{ filter: "contrast(1.02)" }}
        />
        {count !== undefined && count > 0 && (
          <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-md bg-black/70 text-white text-[10px] font-mono backdrop-blur-sm">
            {count}
          </span>
        )}
        {badge && (
          <span
            className={cn(
              "absolute -top-1 -right-1 min-w-6 h-6 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[11px] font-bold grid place-items-center shadow-lg",
              pulseBadge && "office-notif",
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <div className="absolute left-1/2 -translate-x-1/2 -bottom-7 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <span className="text-[11px] font-medium text-white bg-black/70 backdrop-blur px-2 py-0.5 rounded-md whitespace-nowrap">
          {label}
        </span>
      </div>
    </button>
  );
}

/* ---------------- Handwritten whiteboard preview (on photo bg) ---------------- */
function WhiteboardWriting({
  scenario,
  metrics,
  step,
}: {
  scenario: Scenario;
  metrics: LiveMetric[];
  step: number;
}) {
  return (
    <div className="absolute inset-0 p-[6%] text-[oklch(0.25_0.04_260)]">
      <div className="grid grid-cols-2 gap-[4%] h-full">
        <div className="office-handwrite" style={{ animationDelay: "60ms" }}>
          <div className="font-marker text-[clamp(11px,1.2vw,18px)] tracking-wide text-[oklch(0.45_0.18_260)] uppercase">
            Scenario
          </div>
          <div
            className="font-handwriting font-bold leading-[1.05] mt-1 text-[clamp(14px,1.7vw,28px)]"
            style={{ color: "oklch(0.2 0.04 260)" }}
          >
            {scenario.scenario}
          </div>
          <div
            className="font-handwriting mt-2 text-[clamp(12px,1.3vw,20px)] leading-snug"
            style={{ color: "oklch(0.3 0.03 260)" }}
          >
            {scenario.companyGoal}
          </div>
        </div>
        <div className="office-handwrite" style={{ animationDelay: "220ms" }}>
          <div className="font-marker text-[clamp(11px,1.2vw,18px)] tracking-wide uppercase text-[oklch(0.5_0.2_25)]">
            Key Metrics
          </div>
          <div className="mt-1 font-handwriting text-[clamp(12px,1.3vw,20px)] leading-tight space-y-0.5">
            {metrics.slice(0, 4).map((m) => (
              <div key={m.label} className="flex items-baseline gap-2">
                <span className="text-[oklch(0.3_0.03_260)] flex-1 truncate">{m.label}</span>
                <span className="font-bold text-[oklch(0.2_0.04_260)]">{m.value}</span>
                {m.delta && (
                  <span
                    className={cn(
                      "text-[0.85em]",
                      m.trend === "down" && "text-[oklch(0.5_0.22_25)]",
                      m.trend === "up" && "text-[oklch(0.5_0.18_145)]",
                    )}
                  >
                    {m.delta}
                  </span>
                )}
              </div>
            ))}
          </div>
          <div
            className="mt-2 font-handwriting text-[clamp(11px,1.2vw,18px)] italic"
            style={{ color: "oklch(0.4 0.03 260)" }}
          >
            Step {step} · focus on root cause
          </div>
        </div>
      </div>
      {/* sticky note */}
      <div
        className="absolute font-handwriting text-[clamp(10px,1vw,14px)] leading-tight rotate-[5deg] shadow-md p-2 w-[18%]"
        style={{
          right: "4%",
          bottom: "6%",
          background: "oklch(0.95 0.13 95)",
          color: "oklch(0.25 0.05 80)",
        }}
      >
        Focus on the root cause ★
      </div>
    </div>
  );
}

/* ---------------- Whiteboard full modal ---------------- */
function WhiteboardFull({
  scenario,
  metrics,
  updates,
  lastReaction,
}: {
  scenario: Scenario;
  metrics: LiveMetric[];
  updates: { time: string; text: string }[];
  lastReaction: string | null;
}) {
  const { t } = useI18n();
  return (
    <div className="p-6 md:p-8 bg-[oklch(0.98_0.005_90)] text-[oklch(0.2_0.04_260)]">
      <div className="grid md:grid-cols-[1.4fr_1fr] gap-6">
        <div className="office-handwrite">
          <div className="font-marker text-sm uppercase text-[oklch(0.45_0.18_260)]">
            {t("office.scenario")}
          </div>
          <h2 className="font-handwriting font-bold text-3xl md:text-4xl leading-tight mt-1">
            {scenario.scenario}
          </h2>
          <p className="font-handwriting text-xl mt-3 text-[oklch(0.32_0.03_260)]">
            {scenario.companyGoal}
          </p>
        </div>
        <div className="office-handwrite" style={{ animationDelay: "120ms" }}>
          <div className="font-marker text-sm uppercase text-[oklch(0.5_0.2_25)]">
            {t("office.metrics")}
          </div>
          <div className="mt-2 font-handwriting text-xl space-y-1">
            {metrics.map((m) => (
              <div key={m.label} className="flex items-baseline gap-3">
                <span className="flex-1">{m.label}</span>
                <span className="font-bold">{m.value}</span>
                {m.delta && (
                  <span
                    className={cn(
                      m.trend === "down" && "text-[oklch(0.5_0.22_25)]",
                      m.trend === "up" && "text-[oklch(0.5_0.18_145)]",
                    )}
                  >
                    {m.delta}
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-6 grid md:grid-cols-2 gap-6">
        <div className="office-handwrite" style={{ animationDelay: "200ms" }}>
          <div className="font-marker text-sm uppercase text-[oklch(0.4_0.18_180)]">
            {t("office.events")}
          </div>
          <ul className="mt-2 font-handwriting text-lg space-y-1">
            {updates.slice(0, 6).map((u, i) => (
              <li key={i} className="flex gap-3">
                <span className="font-mono text-base text-[oklch(0.45_0.03_260)] w-14 shrink-0">
                  {u.time}
                </span>
                <span>{u.text}</span>
              </li>
            ))}
          </ul>
        </div>
        {lastReaction && (
          <div
            className="office-handwrite p-3 rotate-[-1deg] shadow-md"
            style={{
              animationDelay: "320ms",
              background: "oklch(0.95 0.13 95)",
              color: "oklch(0.25 0.05 80)",
            }}
          >
            <div className="font-marker text-xs uppercase">{t("run.reaction")}</div>
            <p className="font-handwriting text-lg leading-snug mt-1">{lastReaction}</p>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Computer panel (Decision Center) ---------------- */
function ComputerPanel({
  suggested,
  decision,
  setDecision,
  pending,
  submit,
  step,
  totalSteps,
  lastReaction,
  history,
}: {
  suggested: string[];
  decision: string;
  setDecision: (v: string) => void;
  pending: boolean;
  submit: (text: string) => void;
  step: number;
  totalSteps: number;
  lastReaction: string | null;
  history: HistoryItem[];
}) {
  const { t } = useI18n();
  return (
    <div className="bg-card overflow-hidden">
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-secondary/60">
        <span className="size-3 rounded-full bg-[oklch(0.7_0.18_25)]" />
        <span className="size-3 rounded-full bg-[oklch(0.8_0.16_85)]" />
        <span className="size-3 rounded-full bg-[oklch(0.7_0.15_145)]" />
        <span className="mx-auto text-[11px] font-medium text-muted-foreground">
          {t("office.decisionCenter")} — Step {step}/{totalSteps}
        </span>
      </div>
      <div className="p-5 md:p-6">
        <div>
          <h3 className="font-semibold">{t("run.yourDecision")}</h3>
          <p className="text-xs text-muted-foreground mt-0.5">{t("run.yourDecisionSub")}</p>
        </div>
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
          <Button
            type="submit"
            disabled={pending || !decision.trim()}
            className="bg-gradient-primary text-primary-foreground shadow-glow"
          >
            {pending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Send className="size-4" /> {t("run.submit")}
              </>
            )}
          </Button>
        </form>
        {lastReaction && (
          <div className="mt-5 rounded-lg border border-primary/20 bg-primary/5 p-4 animate-fade-in">
            <div className="flex items-center gap-2 text-xs font-medium text-primary uppercase tracking-wider">
              <Sparkles className="size-3.5" /> {t("run.reaction")}
            </div>
            <p className="mt-1.5 text-sm">{lastReaction}</p>
          </div>
        )}
        {history.length > 0 && (
          <div className="mt-6">
            <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
              {t("run.history") ?? "Action log"}
            </div>
            <ol className="relative border-l border-border/70 pl-4 space-y-3">
              {history.slice(-5).reverse().map((h, i) => (
                <li key={`${h.step}-${i}`} className="relative">
                  <span className="absolute -left-[21px] top-1 size-3 rounded-full bg-primary/80 ring-2 ring-card" />
                  <div className="text-[11px] font-mono text-muted-foreground">Step {h.step}</div>
                  <div className="text-sm font-medium">{h.decision}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{h.reaction}</div>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </div>
  );
}

/* ---------------- Docs panel ---------------- */
function DocsPanel({
  scenario,
  step,
  selected,
  setSelected,
  resources,
  newCount,
}: {
  scenario: Scenario;
  step: number;
  selected: string;
  setSelected: (r: string) => void;
  resources: string[];
  newCount: number;
}) {
  const { t } = useI18n();
  const newSet = new Set(resources.slice(resources.length - newCount));
  return (
    <div className="p-5 md:p-6">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm">{t("run.resources")}</h3>
        <span className="text-[11px] text-muted-foreground">
          {resources.length} / {scenario.resources.length}
        </span>
      </div>
      <div className="grid md:grid-cols-2 gap-2">
        {resources.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setSelected(r)}
            className={cn(
              "relative w-full flex items-center gap-3 rounded-lg border p-3 text-sm text-left transition-all",
              selected === r
                ? "border-primary bg-primary/5 text-primary"
                : "hover:border-primary/50 hover:bg-secondary/50",
              newSet.has(r) && "office-paper-new",
            )}
          >
            <ResourceIcon resource={r} />
            <span className="flex-1 truncate">{r}</span>
            {newSet.has(r) && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/10 rounded px-1.5 py-0.5">
                new
              </span>
            )}
          </button>
        ))}
      </div>
      {selected && (
        <div key={selected} className="mt-4 rounded-lg bg-secondary/40 border p-4 animate-fade-in">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <ClipboardList className="size-3.5" /> {selected}
          </div>
          <p className="mt-2 text-sm leading-relaxed">{resourceDetail(selected, scenario, step)}</p>
        </div>
      )}
    </div>
  );
}

function ResourceIcon({ resource }: { resource: string }) {
  const r = resource.toLowerCase();
  if (r.includes("dashboard") || r.includes("аналит"))
    return <BarChart3 className="size-4 text-primary" />;
  if (r.includes("feedback") || r.includes("interview") || r.includes("интерв"))
    return <MessageSquare className="size-4 text-primary" />;
  if (r.includes("error") || r.includes("risk") || r.includes("лог") || r.includes("риск"))
    return <AlertTriangle className="size-4 text-warning" />;
  if (r.includes("capacity") || r.includes("ёмкость") || r.includes("стоим"))
    return <ClipboardList className="size-4 text-primary" />;
  return <FileText className="size-4 text-primary" />;
}

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
    return update
      ? `Последний сигнал: ${update.text}. Риск: решение без быстрого owner-а и срока может усилить давление стейкхолдеров.`
      : `Основной риск — потеря времени на обсуждение без явного владельца следующего шага.`;
  }
  return `${resource}: рабочий артефакт для сценария «${scenario.scenario}». Используй его, чтобы уточнить гипотезу, риски и следующий шаг.`;
}

/* ---------------- Phone panel ---------------- */
function PhonePanel({
  messages,
}: {
  messages: { from: string; role: string; time: string; text: string }[];
}) {
  const { t } = useI18n();
  const threads = useMemo(() => {
    const map = new Map<string, { from: string; role: string; messages: typeof messages }>();
    for (const m of messages) {
      const key = m.from;
      if (!map.has(key)) map.set(key, { from: m.from, role: m.role, messages: [] });
      map.get(key)!.messages.push(m);
    }
    return Array.from(map.values());
  }, [messages]);

  const [openThread, setOpenThread] = useState<string | null>(null);
  const active = threads.find((th) => th.from === openThread) ?? null;
  const now = new Date();
  const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  return (
    <div className="flex justify-center p-4 bg-[oklch(0.15_0.02_265)]">
      <div
        className="relative w-full max-w-[360px] rounded-[44px] p-3"
        style={{
          background: "linear-gradient(180deg, oklch(0.22 0.02 265), oklch(0.14 0.02 265))",
          border: "1px solid oklch(0.3 0.02 265)",
          boxShadow: "0 30px 60px -10px rgba(0,0,0,0.6)",
        }}
      >
        <div className="absolute left-1/2 -translate-x-1/2 top-4 h-6 w-32 rounded-full bg-black/80 z-10" />
        <div className="rounded-[34px] overflow-hidden bg-background min-h-[540px] flex flex-col">
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold">
            <span>{timeStr}</span>
            <div className="flex items-center gap-1 text-foreground/70">
              <Signal className="size-3" />
              <Wifi className="size-3" />
              <Battery className="size-3.5" />
            </div>
          </div>
          <div className="px-4 pt-3 pb-2 border-b flex items-center justify-between">
            {active ? (
              <>
                <button
                  onClick={() => setOpenThread(null)}
                  className="text-primary text-sm font-medium inline-flex items-center gap-1"
                >
                  <ArrowLeft className="size-4" /> {t("office.inbox") ?? "Inbox"}
                </button>
                <div className="text-sm font-semibold truncate max-w-[60%]">{active.from}</div>
                <div className="w-10" />
              </>
            ) : (
              <>
                <div className="text-lg font-bold">{t("run.messages")}</div>
                <span className="text-[11px] text-muted-foreground">
                  {messages.length} {(t("office.msgs") ?? "msgs")}
                </span>
              </>
            )}
          </div>
          <div className="flex-1 overflow-y-auto">
            {!active &&
              threads.map((th, i) => {
                const last = th.messages[th.messages.length - 1];
                const initials = th.from.split(" ").map((p) => p[0]).slice(0, 2).join("");
                return (
                  <button
                    key={th.from}
                    onClick={() => setOpenThread(th.from)}
                    className="w-full text-left px-4 py-3 border-b hover:bg-secondary/60 transition-colors flex gap-3 items-start animate-fade-in"
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    <div className="size-11 rounded-full bg-gradient-primary text-white grid place-items-center text-sm font-semibold shrink-0">
                      {initials}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="font-semibold text-sm truncate">{th.from}</div>
                        <div className="text-[11px] text-muted-foreground shrink-0">{last.time}</div>
                      </div>
                      <div className="text-[11px] text-muted-foreground">{th.role}</div>
                      <div className="text-sm text-foreground/80 mt-0.5 line-clamp-2">{last.text}</div>
                    </div>
                  </button>
                );
              })}
            {active && (
              <div className="px-4 py-4 space-y-2">
                <div className="text-center text-[11px] text-muted-foreground py-1">{active.role}</div>
                {active.messages.map((m, i) => (
                  <div key={i} className="flex flex-col items-start animate-fade-in">
                    <div className="max-w-[80%] rounded-2xl rounded-bl-md bg-secondary px-3 py-2 text-sm">
                      {m.text}
                    </div>
                    <div className="text-[10px] text-muted-foreground mt-0.5 ml-1">{m.time}</div>
                  </div>
                ))}
              </div>
            )}
            {messages.length === 0 && (
              <div className="p-8 text-center text-sm text-muted-foreground">
                {t("office.noMessages") ?? "No messages yet."}
              </div>
            )}
          </div>
          <div className="py-2 grid place-items-center">
            <div className="h-1 w-28 rounded-full bg-foreground/30" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Office clock ---------------- */
function OfficeClock({ step, totalSteps }: { step: number; totalSteps: number }) {
  const { t } = useI18n();
  const minutes = (step - 1) * 25;
  const dayIndex = Math.floor(minutes / (60 * 8));
  const dayOffset = minutes % (60 * 8);
  const startHour = 9;
  const total = startHour * 60 + dayOffset;
  const hh = Math.floor(total / 60) % 24;
  const mm = total % 60;
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri"];
  const day = days[Math.min(dayIndex, 4)];
  const week = Math.min(2, 1 + Math.floor(dayIndex / 5)) + (totalSteps > 8 ? 0 : 0);
  const fmt = `${String(hh).padStart(2, "0")}:${String(mm).padStart(2, "0")}`;
  return (
    <div className="inline-flex items-center gap-1.5 rounded-md border border-white/20 bg-white/10 px-2.5 py-1 text-xs font-medium text-white">
      <Clock className="size-3.5 text-white/70" />
      {t(`office.day.${day}`)} · {fmt} · {t("office.week", { n: week })}
    </div>
  );
}

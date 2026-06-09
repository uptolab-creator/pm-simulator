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
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";
import type { Scenario } from "@/lib/scenarios";

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

type DeskObjectId = "computer" | "docs" | "phone";

export function OfficeView(props: OfficeViewProps) {
  const { t, tRole } = useI18n();
  const navigate = useNavigate();
  const [active, setActive] = useState<DeskObjectId>("computer");
  const { scenario, step, totalSteps } = props;

  // Progressive resource reveal (paper stack grows with step)
  const visibleResourceCount = Math.min(
    scenario.resources.length,
    Math.max(2, step + 1),
  );
  const visibleResources = useMemo(
    () => scenario.resources.slice(0, visibleResourceCount),
    [scenario.resources, visibleResourceCount],
  );

  // Track unread + new arrivals
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
      const t = setTimeout(() => setPaperPulse(false), 700);
      prevDocRef.current = visibleResourceCount;
      return () => clearTimeout(t);
    }
    prevDocRef.current = visibleResourceCount;
  }, [visibleResourceCount]);

  // Mark read on focus
  useEffect(() => {
    if (active === "phone") setSeenMessages(props.messages.length);
    if (active === "docs") setSeenDocs(visibleResourceCount);
  }, [active, props.messages.length, visibleResourceCount]);

  const unreadMessages = Math.max(0, props.messages.length - seenMessages);
  const unreadDocs = Math.max(0, visibleResourceCount - seenDocs);

  return (
    <div className="relative min-h-[calc(100vh-4rem)] overflow-hidden bg-office-floor">
      <div
        className="absolute inset-0 -z-10"
        style={{ background: "var(--office-daylight)" }}
        aria-hidden
      />
      <BackOfficeScene />

      <div className="relative px-4 md:px-8 lg:px-12 py-5 max-w-[1400px] mx-auto">
        {/* Top bar */}
        <div className="flex flex-wrap items-center gap-3 justify-between mb-5">
          <Link
            to="/simulations"
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1"
          >
            <ArrowLeft className="size-4" /> {t("card.backToSims")}
          </Link>
          <div className="text-sm font-medium">
            {tRole(scenario.role)} {t("run.simulationSuffix")} ·{" "}
            <span className="text-muted-foreground">
              {t("run.stepOf", { n: step, total: totalSteps })}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {props.viewToggle}
            <OfficeClock step={step} totalSteps={totalSteps} />
            <Button variant="outline" size="sm" onClick={() => navigate({ to: "/simulations" })}>
              {t("run.end")}
            </Button>
          </div>
        </div>

        <Whiteboard
          scenario={scenario}
          metrics={props.metrics}
          updates={props.updates}
          lastReaction={props.lastReaction}
        />

        <Desk
          active={active}
          onSelect={setActive}
          unreadMessages={unreadMessages}
          unreadDocs={unreadDocs}
          docsCount={visibleResourceCount}
          phoneRing={phoneRing}
          paperPulse={paperPulse}
        />

        <div className="mt-5">
          {active === "computer" && (
            <div className="office-screen-on" key={`pc-${step}`}>
              <ComputerPanel
                suggested={props.suggested}
                decision={props.decision}
                setDecision={props.setDecision}
                pending={props.pending}
                submit={props.submit}
                step={step}
                totalSteps={totalSteps}
                lastReaction={props.lastReaction}
                history={props.history}
              />
            </div>
          )}
          {active === "docs" && (
            <DocsPanel
              scenario={scenario}
              step={step}
              selected={props.selectedResource}
              setSelected={props.setSelectedResource}
              resources={visibleResources}
              newCount={unreadDocs}
            />
          )}
          {active === "phone" && <PhonePanel messages={props.messages} />}
        </div>

        <div className="mt-5 rounded-xl border bg-card/80 backdrop-blur p-4 shadow-card">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground mb-2">
            {t("run.timeline")}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {Array.from({ length: totalSteps }, (_, i) => i + 1).map((n) => (
              <div
                key={n}
                className={cn(
                  "size-7 rounded-full grid place-items-center text-[11px] font-semibold border transition-all",
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
  );
}

/* ---------------- Background scene ---------------- */
function BackOfficeScene() {
  return (
    <>
      <svg
        className="absolute inset-x-0 top-0 -z-10 w-full h-[340px] pointer-events-none"
        viewBox="0 0 1400 340"
        preserveAspectRatio="xMidYMin slice"
        aria-hidden
      >
        <defs>
          <linearGradient id="wall" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="var(--office-wall)" />
            <stop offset="1" stopColor="var(--office-floor)" />
          </linearGradient>
        </defs>
        <rect width="1400" height="340" fill="url(#wall)" />
        <g opacity="0.9">
          <rect x="60" y="60" width="280" height="220" rx="6"
            fill="var(--office-glass)"
            stroke="var(--office-glass-frame)" strokeWidth="1.5" />
          <line x1="200" y1="60" x2="200" y2="280" stroke="var(--office-glass-frame)" strokeWidth="1" opacity="0.6" />
          <line x1="60" y1="170" x2="340" y2="170" stroke="var(--office-glass-frame)" strokeWidth="0.6" opacity="0.4" />
          {/* meeting silhouettes */}
          <circle cx="120" cy="200" r="10" fill="var(--office-glass-frame)" opacity="0.35">
            <animate attributeName="opacity" values="0.25;0.5;0.25" dur="4s" repeatCount="indefinite" />
          </circle>
          <circle cx="170" cy="205" r="10" fill="var(--office-glass-frame)" opacity="0.35">
            <animate attributeName="opacity" values="0.4;0.2;0.4" dur="5s" repeatCount="indefinite" />
          </circle>
          <circle cx="240" cy="200" r="10" fill="var(--office-glass-frame)" opacity="0.35">
            <animate attributeName="opacity" values="0.3;0.55;0.3" dur="4.5s" repeatCount="indefinite" />
          </circle>
        </g>
        <g opacity="0.9">
          <rect x="1060" y="60" width="280" height="220" rx="6"
            fill="var(--office-glass)"
            stroke="var(--office-glass-frame)" strokeWidth="1.5" />
          <line x1="1200" y1="60" x2="1200" y2="280" stroke="var(--office-glass-frame)" strokeWidth="1" opacity="0.6" />
          <line x1="1060" y1="170" x2="1340" y2="170" stroke="var(--office-glass-frame)" strokeWidth="0.6" opacity="0.4" />
          <circle cx="1130" cy="210" r="10" fill="var(--office-glass-frame)" opacity="0.35">
            <animate attributeName="opacity" values="0.3;0.55;0.3" dur="6s" repeatCount="indefinite" />
          </circle>
          <circle cx="1260" cy="210" r="10" fill="var(--office-glass-frame)" opacity="0.35">
            <animate attributeName="opacity" values="0.45;0.2;0.45" dur="5.5s" repeatCount="indefinite" />
          </circle>
        </g>
        <g transform="translate(380,200)" opacity="0.85">
          <ellipse cx="20" cy="80" rx="26" ry="6" fill="oklch(0.5 0.05 60)" opacity="0.25" />
          <rect x="6" y="50" width="28" height="32" rx="3" fill="oklch(0.55 0.06 60)" />
          <path d="M20 50 C 0 30 6 8 20 0 C 34 8 40 30 20 50 Z" fill="oklch(0.55 0.13 150)" />
        </g>
        <g transform="translate(990,200)" opacity="0.85">
          <ellipse cx="20" cy="80" rx="26" ry="6" fill="oklch(0.5 0.05 60)" opacity="0.25" />
          <rect x="6" y="50" width="28" height="32" rx="3" fill="oklch(0.55 0.06 60)" />
          <path d="M20 50 C 0 30 6 8 20 0 C 34 8 40 30 20 50 Z" fill="oklch(0.55 0.13 150)" />
        </g>
      </svg>

      {/* Walkers along the back corridor — purely ambient */}
      <div className="absolute top-[260px] left-0 right-0 h-10 pointer-events-none overflow-hidden -z-10" aria-hidden>
        <Walker delay="0s" duration="26s" tint="oklch(0.55 0.03 260)" />
        <Walker delay="9s" duration="32s" tint="oklch(0.5 0.04 280)" />
        <Walker delay="18s" duration="28s" tint="oklch(0.6 0.03 250)" />
      </div>
    </>
  );
}

function Walker({ delay, duration, tint }: { delay: string; duration: string; tint: string }) {
  return (
    <div
      className="office-walker absolute top-1"
      style={{ animationDelay: delay, animationDuration: duration }}
    >
      <svg width="14" height="32" viewBox="0 0 14 32">
        <circle cx="7" cy="5" r="4" fill={tint} />
        <rect x="3" y="10" width="8" height="14" rx="3" fill={tint} />
        <rect x="3" y="22" width="3" height="8" rx="1" fill={tint} />
        <rect x="8" y="22" width="3" height="8" rx="1" fill={tint} />
      </svg>
    </div>
  );
}

/* ---------------- Whiteboard ---------------- */
function Whiteboard({
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
    <div
      className="relative mx-auto rounded-2xl border bg-card/95 backdrop-blur p-5 md:p-6 shadow-office"
      style={{ borderColor: "var(--office-glass-frame)" }}
    >
      <div className="absolute -top-2 left-10 right-10 flex justify-between pointer-events-none">
        <span className="size-2 rounded-full bg-foreground/20" />
        <span className="size-2 rounded-full bg-foreground/20" />
      </div>

      <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-muted-foreground">
        <ClipboardList className="size-3.5" /> {t("office.whiteboard")}
      </div>

      <div className="mt-3 grid md:grid-cols-[1.5fr_1fr] gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("office.scenario")}
          </div>
          <h2 className="mt-1 text-xl md:text-2xl font-bold tracking-tight leading-tight">
            {scenario.scenario}
          </h2>
        </div>
        <div className="rounded-lg bg-secondary/70 p-3">
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("office.goal")}
          </div>
          <div className="mt-1 text-sm font-medium">{scenario.companyGoal}</div>
        </div>
      </div>

      <div className="mt-4">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
          {t("office.metrics")}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5">
          {metrics.map((m) => (
            <MetricChip key={m.label} metric={m} />
          ))}
        </div>
      </div>

      <div className="mt-4 grid md:grid-cols-[1fr_1fr] gap-4">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            {t("office.events")}
          </div>
          <div className="space-y-1.5 max-h-[120px] overflow-y-auto pr-1">
            {updates.slice(0, 5).map((u, i) => (
              <div key={i} className="flex gap-2 text-sm animate-fade-in">
                <span className="text-[11px] font-mono text-muted-foreground w-12 shrink-0 pt-0.5">
                  {u.time}
                </span>
                <span className="size-1.5 rounded-full bg-primary mt-1.5 shrink-0" />
                <span className="text-foreground leading-snug">{u.text}</span>
              </div>
            ))}
          </div>
        </div>
        {lastReaction ? (
          <div key={lastReaction} className="rounded-lg border border-primary/25 bg-primary/5 p-3 animate-fade-in">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-primary">
              <Sparkles className="size-3.5" /> {t("run.reaction")}
            </div>
            <p className="mt-1 text-sm leading-snug">{lastReaction}</p>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed p-3 text-xs text-muted-foreground self-start">
            {t("run.yourDecisionSub")}
          </div>
        )}
      </div>
    </div>
  );
}

function MetricChip({ metric }: { metric: LiveMetric }) {
  const Icon =
    metric.trend === "down" ? TrendingDown : metric.trend === "up" ? TrendingUp : Minus;
  const color =
    metric.trend === "down"
      ? "text-destructive"
      : metric.trend === "up"
      ? "text-success"
      : "text-muted-foreground";
  return (
    <div className="rounded-lg border bg-secondary/40 p-2.5">
      <div className="text-[11px] text-muted-foreground truncate">{metric.label}</div>
      <div key={metric.value} className="text-lg font-bold mt-0.5 leading-tight office-metric-flip">
        {metric.value}
      </div>
      {metric.delta && (
        <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${color}`}>
          <Icon className="size-3" /> {metric.delta}
        </div>
      )}
    </div>
  );
}

/* ---------------- Desk ---------------- */
function Desk({
  active,
  onSelect,
  unreadMessages,
  unreadDocs,
  docsCount,
  phoneRing,
  paperPulse,
}: {
  active: DeskObjectId;
  onSelect: (id: DeskObjectId) => void;
  unreadMessages: number;
  unreadDocs: number;
  docsCount: number;
  phoneRing: boolean;
  paperPulse: boolean;
}) {
  const { t } = useI18n();
  return (
    <div className="mt-6 relative">
      <div
        className="relative rounded-[28px] px-6 py-5 shadow-office"
        style={{
          background:
            "linear-gradient(180deg, var(--office-desk) 0%, var(--office-desk-edge) 100%)",
          border: "1px solid var(--office-desk-edge)",
        }}
      >
        <div className="grid grid-cols-3 gap-4 items-end">
          <DeskObject
            id="docs"
            active={active === "docs"}
            onClick={() => onSelect("docs")}
            label={t("office.docs")}
            ariaLabel={t("office.openDocs")}
            badge={unreadDocs > 0 ? String(unreadDocs) : undefined}
            pulseBadge={unreadDocs > 0}
          >
            <DocsStackSVG count={docsCount} pulse={paperPulse} />
          </DeskObject>

          <DeskObject
            id="computer"
            active={active === "computer"}
            onClick={() => onSelect("computer")}
            label={t("office.computer")}
            ariaLabel={t("office.openComputer")}
          >
            <MacbookSVG />
          </DeskObject>

          <DeskObject
            id="phone"
            active={active === "phone"}
            onClick={() => onSelect("phone")}
            label={t("office.phone")}
            ariaLabel={t("office.openPhone")}
            badge={unreadMessages > 0 ? String(unreadMessages) : undefined}
            pulseBadge={unreadMessages > 0}
            ringing={phoneRing}
          >
            <PhoneSVG ringing={phoneRing} />
          </DeskObject>
        </div>
      </div>
    </div>
  );
}

function DeskObject({
  active,
  onClick,
  label,
  ariaLabel,
  badge,
  pulseBadge,
  ringing,
  children,
}: {
  id: DeskObjectId;
  active: boolean;
  onClick: () => void;
  label: string;
  ariaLabel: string;
  badge?: string;
  pulseBadge?: boolean;
  ringing?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      aria-pressed={active}
      className={cn(
        "group relative flex flex-col items-center gap-2 rounded-2xl px-3 py-3 transition-all",
        "hover:-translate-y-0.5",
        active
          ? "bg-card shadow-glow ring-2 ring-primary/40"
          : "bg-card/70 hover:bg-card shadow-card",
      )}
    >
      <div
        className={cn(
          "relative w-full grid place-items-center h-[110px]",
          ringing && "office-phone-ring",
        )}
      >
        {children}
        {badge && (
          <span
            className={cn(
              "absolute top-1 right-3 min-w-5 h-5 px-1.5 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold grid place-items-center",
              pulseBadge && "office-notif",
            )}
          >
            {badge}
          </span>
        )}
      </div>
      <span
        className={cn(
          "text-xs font-semibold",
          active ? "text-primary" : "text-foreground/70",
        )}
      >
        {label}
      </span>
    </button>
  );
}

/* ---------------- Illustrations ---------------- */
function MacbookSVG() {
  return (
    <svg viewBox="0 0 200 130" className="w-[180px] max-w-full h-auto drop-shadow-md">
      <rect x="30" y="10" width="140" height="88" rx="6" fill="oklch(0.22 0.02 265)" />
      <rect x="36" y="16" width="128" height="76" rx="3" fill="oklch(0.95 0.02 270)" />
      <rect x="42" y="22" width="60" height="6" rx="2" fill="var(--primary)" opacity="0.7" />
      <rect x="42" y="32" width="116" height="3" rx="1" fill="oklch(0.7 0.02 270)" />
      <rect x="42" y="38" width="92" height="3" rx="1" fill="oklch(0.78 0.02 270)" />
      <rect x="42" y="48" width="40" height="22" rx="2" fill="var(--primary)" opacity="0.15" />
      <rect x="88" y="48" width="40" height="22" rx="2" fill="var(--primary)" opacity="0.25" />
      <rect x="134" y="48" width="24" height="22" rx="2" fill="var(--primary)" opacity="0.45" />
      <rect x="42" y="76" width="116" height="10" rx="2" fill="oklch(0.92 0.01 270)" />
      <rect x="14" y="98" width="172" height="10" rx="3" fill="oklch(0.85 0.01 270)" />
      <rect x="86" y="98" width="28" height="4" rx="2" fill="oklch(0.7 0.02 270)" />
    </svg>
  );
}

function DocsStackSVG({ count, pulse }: { count: number; pulse?: boolean }) {
  // Render up to 5 visible sheets, scale stack by count
  const sheets = Math.min(5, Math.max(2, count));
  const arr = Array.from({ length: sheets });
  return (
    <svg viewBox="0 0 160 130" className="w-[130px] max-w-full h-auto drop-shadow-md">
      {arr.map((_, i) => {
        const offset = i * 3;
        const rot = (i % 2 === 0 ? -1 : 1) * (3 + i * 0.5);
        const isTop = i === arr.length - 1;
        return (
          <g
            key={i}
            transform={`translate(${offset}, ${-offset}) rotate(${rot} 80 65)`}
            className={isTop && pulse ? "office-paper-new" : undefined}
            style={{ transformOrigin: "80px 65px" }}
          >
            <rect
              x="22"
              y="22"
              width="110"
              height="80"
              rx="4"
              fill={i === arr.length - 1 ? "white" : `oklch(${0.92 + i * 0.01} 0.02 80)`}
              stroke="oklch(0.85 0.02 80)"
              strokeWidth="0.5"
            />
            {isTop && (
              <>
                <rect x="32" y="32" width="60" height="5" rx="2" fill="oklch(0.5 0.03 270)" />
                <rect x="32" y="44" width="86" height="3" rx="1" fill="oklch(0.78 0.02 270)" />
                <rect x="32" y="52" width="72" height="3" rx="1" fill="oklch(0.78 0.02 270)" />
                <rect x="32" y="60" width="80" height="3" rx="1" fill="oklch(0.78 0.02 270)" />
                <rect x="32" y="76" width="40" height="16" rx="2" fill="var(--primary)" opacity="0.18" />
                <rect x="78" y="76" width="40" height="16" rx="2" fill="var(--primary)" opacity="0.28" />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
}

function PhoneSVG({ ringing }: { ringing?: boolean }) {
  return (
    <svg viewBox="0 0 100 140" className="w-[70px] max-w-full h-auto drop-shadow-md">
      <rect x="10" y="6" width="80" height="128" rx="14" fill="oklch(0.18 0.02 265)" />
      <rect x="14" y="14" width="72" height="112" rx="8" fill="oklch(0.96 0.01 270)" />
      <rect x="22" y="22" width="56" height="6" rx="2" fill="var(--primary)" opacity="0.7" />
      <rect x="22" y="34" width="56" height="14" rx="3" fill={ringing ? "var(--primary)" : "oklch(0.93 0.02 270)"} opacity={ringing ? 0.45 : 1} />
      <rect x="22" y="52" width="56" height="14" rx="3" fill="oklch(0.93 0.02 270)" />
      <rect x="22" y="70" width="56" height="14" rx="3" fill="oklch(0.93 0.02 270)" />
      <circle cx="50" cy="118" r="3" fill="oklch(0.6 0.02 270)" />
    </svg>
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
    <div className="rounded-2xl border bg-card/95 backdrop-blur shadow-card overflow-hidden">
      {/* macOS-style window chrome */}
      <div className="flex items-center gap-2 px-4 py-2 border-b bg-secondary/60">
        <span className="size-3 rounded-full bg-[oklch(0.7_0.18_25)]" />
        <span className="size-3 rounded-full bg-[oklch(0.8_0.16_85)]" />
        <span className="size-3 rounded-full bg-[oklch(0.7_0.15_145)]" />
        <span className="mx-auto text-[11px] font-medium text-muted-foreground">
          {t("office.decisionCenter")} — Step {step}/{totalSteps}
        </span>
      </div>

      <div className="p-5 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold">{t("run.yourDecision")}</h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              {t("run.yourDecisionSub")}
            </p>
          </div>
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
  // Mark the last `newCount` items as newly added
  const newSet = new Set(resources.slice(resources.length - newCount));
  return (
    <div className="rounded-2xl border bg-card/95 backdrop-blur p-5 md:p-6 shadow-card">
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
          <p className="mt-2 text-sm leading-relaxed">
            {resourceDetail(selected, scenario, step)}
          </p>
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

/* ---------------- Phone panel — realistic smartphone ---------------- */
function PhonePanel({
  messages,
}: {
  messages: { from: string; role: string; time: string; text: string }[];
}) {
  const { t } = useI18n();
  // Group consecutive messages by sender into threads
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
    <div className="flex justify-center">
      <div
        className="relative w-full max-w-[380px] rounded-[44px] p-3 shadow-office"
        style={{
          background: "linear-gradient(180deg, oklch(0.22 0.02 265), oklch(0.14 0.02 265))",
          border: "1px solid oklch(0.3 0.02 265)",
        }}
      >
        {/* Notch */}
        <div className="absolute left-1/2 -translate-x-1/2 top-4 h-6 w-32 rounded-full bg-black/80 z-10" />

        <div className="rounded-[34px] overflow-hidden bg-background min-h-[560px] flex flex-col">
          {/* Status bar */}
          <div className="flex items-center justify-between px-6 pt-3 pb-2 text-[11px] font-semibold">
            <span>{timeStr}</span>
            <div className="flex items-center gap-1 text-foreground/70">
              <Signal className="size-3" />
              <Wifi className="size-3" />
              <Battery className="size-3.5" />
            </div>
          </div>

          {/* Header */}
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

          {/* Body */}
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
                <div className="text-center text-[11px] text-muted-foreground py-1">
                  {active.role}
                </div>
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

          {/* Home indicator */}
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
    <div className="inline-flex items-center gap-1.5 rounded-md border bg-card/90 px-2.5 py-1 text-xs font-medium">
      <Clock className="size-3.5 text-muted-foreground" />
      {t(`office.day.${day}`)} · {fmt} · {t("office.week", { n: week })}
    </div>
  );
}

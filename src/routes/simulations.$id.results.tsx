import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { SkillRadar } from "@/components/SkillRadar";
import { getScenario, type SkillKey } from "@/lib/scenarios";
import { useI18n, useT } from "@/lib/i18n";
import { CheckCircle2, AlertCircle, ArrowLeft, Sparkles } from "lucide-react";

type Report = {
  finalScore: number;
  verdict: string;
  skills: Record<SkillKey, number>;
  strengths: string[];
  improvements: string[];
  summary: string;
  recommendations: string[];
};

const SKILL_TKEYS: Record<SkillKey, string> = {
  productThinking: "skill.productThinking",
  analytics: "skill.analytics",
  communication: "skill.communication",
  prioritization: "skill.prioritization",
  execution: "skill.execution",
  riskManagement: "skill.riskManagement",
};

export const Route = createFileRoute("/simulations/$id/results")({
  loader: ({ params }) => {
    const s = getScenario(params.id);
    if (!s) throw notFound();
    return { scenarioId: s.id };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: `ProductPush — ${loaderData?.scenarioId ?? ""}` },
    ],
  }),
  component: Results,
  notFoundComponent: () => <AppShell><div className="p-10">Не найдено.</div></AppShell>,
});

function Results() {
  const { scenarioId } = Route.useLoaderData();
  const { getScenario } = useI18n();
  const t = useT();
  const scenario = getScenario(scenarioId);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    try {
      if (!scenario) return;
      const raw = localStorage.getItem(`pp:result:${scenario.id}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        setReport(parsed.report);
      }
    } catch {}
  }, [scenario]);

  if (!scenario) {
    return <AppShell><div className="p-10">Сценарий не найден.</div></AppShell>;
  }

  if (!report) {
    return (
      <AppShell>
        <div className="px-6 lg:px-10 py-10 max-w-3xl mx-auto text-center">
          <h1 className="text-xl font-semibold">{t("res.none")}</h1>
          <p className="text-muted-foreground mt-1">{t("res.noneSub")}</p>
          <Button asChild className="mt-6"><Link to="/simulations/$id" params={{ id: scenario.id }}>{t("res.startSim")}</Link></Button>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="px-6 lg:px-10 py-8 max-w-6xl mx-auto">
        <Link to="/simulations" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground gap-1 mb-6">
          <ArrowLeft className="size-4" /> {t("card.backToSims")}
        </Link>

        <div className="rounded-2xl border bg-card p-8 shadow-card">
          <div className="flex items-center justify-between flex-wrap gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                {t("res.title")} <span>🎉</span>
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                {t("res.sub", { title: scenario.title })}
              </p>
            </div>
            <div className="flex gap-3">
              <Button variant="outline" asChild><Link to="/">{t("res.backDash")}</Link></Button>
              <Button className="bg-gradient-primary text-primary-foreground shadow-glow">
                <Sparkles className="size-4" /> {t("res.aiCoach")}
              </Button>
            </div>
          </div>

          <div className="mt-8 grid lg:grid-cols-[260px_1fr] gap-8">
            <div className="rounded-xl border bg-secondary/30 p-6 text-center">
              <div className="text-xs text-muted-foreground uppercase tracking-wider">{t("res.final")}</div>
              <div className="mt-2 text-6xl font-bold tracking-tight">
                {report.finalScore}
                <span className="text-2xl text-muted-foreground font-medium">/100</span>
              </div>
              <div className="mt-3 text-sm font-semibold text-success">{report.verdict}</div>
            </div>
            <SkillRadar skills={report.skills} />
          </div>

          <div className="mt-8 grid md:grid-cols-2 gap-4">
            <Section title={t("res.strengths")} icon={CheckCircle2} color="text-success">
              {report.strengths.map((s) => <li key={s}>{s}</li>)}
            </Section>
            <Section title={t("res.improve")} icon={AlertCircle} color="text-warning">
              {report.improvements.map((s) => <li key={s}>{s}</li>)}
            </Section>
          </div>

          <div className="mt-6 rounded-xl border bg-secondary/30 p-5">
            <div className="text-xs font-medium uppercase tracking-wider text-primary mb-2">{t("res.aiSummary")}</div>
            <p className="text-sm text-foreground">{report.summary}</p>
          </div>

          <div className="mt-6 rounded-xl border p-5">
            <h3 className="font-semibold mb-3">{t("res.breakdown")}</h3>
            <div className="space-y-3">
              {(Object.keys(SKILL_TKEYS) as SkillKey[]).map((k) => (
                <div key={k}>
                  <div className="flex justify-between text-sm mb-1">
                    <span>{t(SKILL_TKEYS[k])}</span>
                    <span className="font-semibold tabular-nums">{report.skills[k]}</span>
                  </div>
                  <div className="h-2 rounded-full bg-secondary overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary transition-all"
                      style={{ width: `${report.skills[k]}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 rounded-xl border p-5">
            <h3 className="font-semibold mb-3">{t("res.recs")}</h3>
            <ul className="space-y-1.5 text-sm list-disc list-inside text-foreground">
              {report.recommendations.map((r) => <li key={r}>{r}</li>)}
            </ul>
          </div>
        </div>
      </div>
    </AppShell>
  );
}

function Section({
  title,
  icon: Icon,
  color,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border p-5">
      <div className={`flex items-center gap-2 font-semibold ${color}`}>
        <Icon className="size-4" /> {title}
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-foreground list-disc list-inside">{children}</ul>
    </div>
  );
}

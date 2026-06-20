import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAnalytics, type AdminAnalytics } from "@/lib/admin/admin.functions";
import { Card } from "@/components/ui/card";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { STEP_LABELS_RU, type TaskType } from "@/lib/course";
import {
  Users,
  Activity,
  Target,
  Timer,
  Lightbulb,
  Flag,
  Layers,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";

function Kpi({
  icon: Icon,
  label,
  value,
  sub,
  tone = "default",
}: {
  icon: any;
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneCls =
    tone === "good"
      ? "text-emerald-500"
      : tone === "warn"
        ? "text-amber-500"
        : tone === "bad"
          ? "text-destructive"
          : "text-primary";
  return (
    <Card className="p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
        <Icon className={`size-4 ${toneCls}`} />
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      {sub && <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>}
    </Card>
  );
}

export function AdminOverview() {
  const fetchData = useServerFn(getAdminAnalytics);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchData() as Promise<AdminAnalytics>,
  });

  if (isLoading || !data) {
    return <div className="text-muted-foreground py-12 text-center">Считаем метрики…</div>;
  }

  const o = data.overview;
  const worst = [...data.funnel].filter((f) => f.started > 0).sort((a, b) => b.dropPct - a.dropPct)[0];



  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Kpi icon={Users} label="Студентов" value={`${o.totalUsers}`} sub={`Начали: ${o.startedUsers}`} />
        <Kpi icon={Activity} label="DAU / WAU / MAU" value={`${o.dau} / ${o.wau} / ${o.mau}`} sub="активные за 1 / 7 / 30 дней" />
        <Kpi
          icon={Target}
          label="Конверсия курса"
          value={`${o.retention}%`}
          sub={`${o.completedUsers} из ${o.startedUsers} дошли до урока 26`}
          tone={o.retention >= 40 ? "good" : o.retention >= 15 ? "warn" : "bad"}
        />
        <Kpi
          icon={CheckCircle2}
          label="Ср. прогресс"
          value={`${o.avgCompletionPct}%`}
          sub="курса завершено в среднем"
        />
        <Kpi icon={Timer} label="Ср. время урока" value={`${o.avgLessonMinutes} мин`} />
        <Kpi
          icon={Lightbulb}
          label="Сам / с подсказкой"
          value={`${o.solvedSelfPct}% / ${o.solvedWithHelpPct}%`}
          sub={`Провалено: ${o.failedPct}%`}
          tone={o.solvedSelfPct >= o.solvedWithHelpPct ? "good" : "warn"}
        />
        <Kpi
          icon={Layers}
          label="Попыток всего"
          value={`${o.totalAttempts}`}
          sub={`${o.avgAttemptsPerUser} на студента`}
        />
        <Kpi
          icon={Flag}
          label="Жалобы"
          value={`${o.openAppeals} / ${o.totalAppeals}`}
          sub="открытых / всего"
          tone={o.openAppeals > 0 ? "warn" : "good"}
        />
      </div>

      {o.lessonsInTrouble > 0 && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm">
          <AlertTriangle className="size-4 text-destructive shrink-0" />
          <span>
            <span className="font-semibold text-destructive">{o.lessonsInTrouble}</span> урок(ов) в красной зоне —
            теория или подсказки не справляются. Смотрите вкладку «Аналитика по урокам».
          </span>
        </div>
      )}

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Эффективность по типам заданий</h3>
          <span className="text-xs text-muted-foreground">сам · с подсказкой · провал (по всем урокам)</span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart
            data={data.taskTypeBreakdown.map((t) => ({
              name: STEP_LABELS_RU[t.type as TaskType] ?? t.type,
              Сам: t.solvedSelf,
              "С подсказкой": t.solvedWithHelp,
              Провал: t.failed,
            }))}
            margin={{ left: -20, right: 8 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="name" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            <Bar dataKey="Сам" stackId="a" fill="#10b981" />
            <Bar dataKey="С подсказкой" stackId="a" fill="#f59e0b" />
            <Bar dataKey="Провал" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />

          </BarChart>
        </ResponsiveContainer>
      </Card>


      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Активность за 30 дней</h3>
          <span className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="size-3" /> уникальные пользователи и попытки
          </span>
        </div>
        <ResponsiveContainer width="100%" height={240}>
          <AreaChart data={data.activity} margin={{ left: -20, right: 8 }}>
            <defs>
              <linearGradient id="gA" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="date" tick={{ fontSize: 10 }} interval={4} />
            <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
            />
            <Area type="monotone" dataKey="active" name="Активные" stroke="hsl(var(--primary))" fill="url(#gA)" />
            <Area
              type="monotone"
              dataKey="attempts"
              name="Попытки"
              stroke="hsl(var(--muted-foreground))"
              fill="transparent"
            />
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-sm">Воронка прохождения уроков</h3>
          {worst && (
            <span className="text-xs text-destructive font-medium">
              Худшая зона: урок {worst.number} ({worst.dropPct}% отвала)
            </span>
          )}
        </div>
        <div className="space-y-1.5">
          {data.funnel.map((f) => {
            const max = data.funnel[0]?.started || 1;
            const w = Math.max(2, Math.round((f.started / max) * 100));
            const tone =
              f.dropPct >= 60 ? "bg-destructive" : f.dropPct >= 35 ? "bg-amber-500" : "bg-primary";
            return (
              <div key={f.lessonId} className="flex items-center gap-2 text-xs">
                <span className="w-8 text-right text-muted-foreground tabular-nums">{f.number}</span>
                <div className="flex-1 h-5 rounded bg-muted/50 overflow-hidden relative">
                  <div className={`h-full ${tone} transition-all`} style={{ width: `${w}%` }} />
                  <span className="absolute inset-y-0 left-2 flex items-center text-[10px] font-medium">
                    {f.started} нач. · {f.completed} заверш.
                  </span>
                </div>
                <span
                  className={`w-12 text-right tabular-nums font-medium ${
                    f.dropPct >= 60 ? "text-destructive" : f.dropPct >= 35 ? "text-amber-500" : "text-muted-foreground"
                  }`}
                >
                  -{f.dropPct}%
                </span>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

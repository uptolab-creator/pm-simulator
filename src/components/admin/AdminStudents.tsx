import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStudents, type StudentStat } from "@/lib/admin/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Search, Users, Flame, Moon, CheckCircle2, AlertOctagon } from "lucide-react";

const STATUS: Record<StudentStat["status"], { cls: string; label: string }> = {
  active: { cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", label: "Активен" },
  stuck: { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Застрял" },
  idle: { cls: "bg-muted text-muted-foreground border-border", label: "Неактивен" },
  done: { cls: "bg-primary/15 text-primary border-primary/30", label: "Завершил" },
};

type SortKey = "name" | "completionPct" | "avgAttempts" | "appeals" | "lastActive";

export function AdminStudents() {
  const fetchStudents = useServerFn(getStudents);
  const { data, isLoading } = useQuery({
    queryKey: ["admin-students"],
    queryFn: () => fetchStudents() as Promise<StudentStat[]>,
  });
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<"all" | StudentStat["status"]>("all");
  const [sort, setSort] = useState<SortKey>("lastActive");

  const rows = useMemo(() => {
    let r = data ?? [];
    if (filter !== "all") r = r.filter((s) => s.status === filter);
    if (q) r = r.filter((s) => s.name.toLowerCase().includes(q.toLowerCase()));
    return [...r].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "lastActive") return +new Date(b.lastActive ?? 0) - +new Date(a.lastActive ?? 0);
      return (b[sort] as number) - (a[sort] as number);
    });
  }, [data, filter, q, sort]);

  if (isLoading || !data) {
    return <div className="text-muted-foreground py-12 text-center">Загрузка студентов…</div>;
  }

  const counts = {
    all: data.length,
    active: data.filter((s) => s.status === "active").length,
    stuck: data.filter((s) => s.status === "stuck").length,
    idle: data.filter((s) => s.status === "idle").length,
    done: data.filter((s) => s.status === "done").length,
  };

  const chips: { key: "all" | StudentStat["status"]; label: string; icon: any; n: number }[] = [
    { key: "all", label: "Все", icon: Users, n: counts.all },
    { key: "active", label: "Активные", icon: Flame, n: counts.active },
    { key: "stuck", label: "Застрявшие", icon: AlertOctagon, n: counts.stuck },
    { key: "idle", label: "Неактивные", icon: Moon, n: counts.idle },
    { key: "done", label: "Завершили", icon: CheckCircle2, n: counts.done },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <button
            key={c.key}
            onClick={() => setFilter(c.key)}
            className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
              filter === c.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"
            }`}
          >
            <c.icon className="size-3.5" /> {c.label}
            <span className="tabular-nums opacity-70">{c.n}</span>
          </button>
        ))}
        <div className="relative ml-auto">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            placeholder="Поиск по имени…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 w-[200px] pl-8"
          />
        </div>
      </div>

      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <Th label="Студент" onClick={() => setSort("name")} active={sort === "name"} />
              <TableHead className="min-w-[160px]">Прогресс курса</TableHead>
              <Th label="Ср. попыток" right onClick={() => setSort("avgAttempts")} active={sort === "avgAttempts"} />
              <TableHead className="text-right">Сам / помощь / провал</TableHead>
              <Th label="Жалобы" right onClick={() => setSort("appeals")} active={sort === "appeals"} />
              <Th label="Активность" right onClick={() => setSort("lastActive")} active={sort === "lastActive"} />
              <TableHead className="text-right">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-10">
                  Студентов не найдено.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => (
                <TableRow key={s.userId}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Progress value={s.completionPct} className="h-2 flex-1" />
                      <span className="text-xs tabular-nums text-muted-foreground w-16 text-right">
                        {s.lessonsCompleted}/26 · {s.completionPct}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{s.avgAttempts || "—"}</TableCell>
                  <TableCell className="text-right tabular-nums text-xs">
                    <span className="text-emerald-500">{s.solvedSelf}</span> /{" "}
                    <span className="text-amber-500">{s.solvedWithHelp}</span> /{" "}
                    <span className="text-destructive">{s.failed}</span>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {s.appeals ? <span className="text-amber-500 font-medium">{s.appeals}</span> : "—"}
                  </TableCell>
                  <TableCell className="text-right text-xs text-muted-foreground tabular-nums">
                    {s.lastActive ? new Date(s.lastActive).toLocaleDateString("ru-RU") : "—"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant="outline" className={STATUS[s.status].cls}>
                      {STATUS[s.status].label}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function Th({
  label,
  onClick,
  active,
  right,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
  right?: boolean;
}) {
  return (
    <TableHead className={right ? "text-right" : ""}>
      <button
        onClick={onClick}
        className={`hover:text-foreground transition-colors ${active ? "text-foreground font-semibold" : ""}`}
      >
        {label}
        {active ? " ↓" : ""}
      </button>
    </TableHead>
  );
}

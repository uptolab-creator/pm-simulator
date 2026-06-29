import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getAdminAnalytics, type AdminAnalytics, type LessonStat } from "@/lib/admin/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { STEP_LABELS_RU, type TaskType } from "@/lib/course";
import { ArrowLeft, AlertTriangle, RefreshCw } from "lucide-react";

const DIFF_BADGE: Record<LessonStat["difficulty"], { cls: string; label: string }> = {
  green: { cls: "bg-emerald-500/15 text-emerald-500 border-emerald-500/30", label: "Норма" },
  yellow: { cls: "bg-amber-500/15 text-amber-500 border-amber-500/30", label: "Внимание" },
  red: { cls: "bg-destructive/15 text-destructive border-destructive/30", label: "Сбой" },
};

export function AdminLessons() {
  const fetchData = useServerFn(getAdminAnalytics);
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["admin-analytics"],
    queryFn: () => fetchData() as Promise<AdminAnalytics>,
    retry: 1,
  });
  const [selected, setSelected] = useState<string | null>(null);

  if (isLoading) {
    return <div className="text-muted-foreground py-12 text-center flex items-center justify-center gap-2"><RefreshCw className="size-4 animate-spin" /> Загрузка уроков…</div>;
  }

  if (error || !data) {
    return (
      <div className="py-12 text-center space-y-3">
        <AlertTriangle className="size-6 mx-auto text-destructive" />
        <p className="text-sm text-destructive">{(error as Error)?.message || "Не удалось загрузить данные"}</p>
        <button onClick={() => refetch()} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
          <RefreshCw className="size-3" /> Повторить загрузку
        </button>
      </div>
    );
  }

  const lesson = data.lessons.find((l) => l.lessonId === selected);

  if (lesson) {
    return <LessonDetail lesson={lesson} onBack={() => setSelected(null)} />;
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Индекс сложности (CDI): доля студентов, доходящих до 3-й попытки.{" "}
        <span className="text-destructive font-medium">≥40% — красный</span> (теория/подсказки не работают),{" "}
        <span className="text-amber-500 font-medium">20–40% — жёлтый</span>.
      </p>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">#</TableHead>
              <TableHead>Урок</TableHead>
              <TableHead className="text-right">Начали</TableHead>
              <TableHead className="text-right">Завершили</TableHead>
              <TableHead className="text-right">Ср. попыток</TableHead>
              <TableHead className="text-right">CDI</TableHead>
              <TableHead className="text-right">Статус</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.lessons.map((l) => (
              <TableRow
                key={l.lessonId}
                className="cursor-pointer"
                onClick={() => setSelected(l.lessonId)}
              >
                <TableCell className="text-muted-foreground">{l.number}</TableCell>
                <TableCell className="font-medium">{l.title}</TableCell>
                <TableCell className="text-right tabular-nums">{l.started}</TableCell>
                <TableCell className="text-right tabular-nums">{l.completed}</TableCell>
                <TableCell className="text-right tabular-nums">{l.avgAttempts || "—"}</TableCell>
                <TableCell className="text-right tabular-nums font-semibold">{l.reached3Pct}%</TableCell>
                <TableCell className="text-right">
                  <Badge variant="outline" className={DIFF_BADGE[l.difficulty].cls}>
                    {l.difficulty === "red" && <AlertTriangle className="size-3" />}
                    {DIFF_BADGE[l.difficulty].label}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}

function LessonDetail({ lesson, onBack }: { lesson: LessonStat; onBack: () => void }) {
  return (
    <div className="space-y-4">
      <button onClick={onBack} className="flex items-center gap-1 text-sm text-primary hover:underline">
        <ArrowLeft className="size-4" /> Ко всем урокам
      </button>
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-bold">
          Урок {lesson.number}. {lesson.title}
        </h2>
        <Badge variant="outline" className={DIFF_BADGE[lesson.difficulty].cls}>
          CDI {lesson.reached3Pct}%
        </Badge>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Начали</div>
          <div className="text-xl font-bold">{lesson.started}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Завершили</div>
          <div className="text-xl font-bold">{lesson.completed}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Ср. попыток</div>
          <div className="text-xl font-bold">{lesson.avgAttempts || "—"}</div>
        </Card>
        <Card className="p-3">
          <div className="text-xs text-muted-foreground">Доходят до 3-й</div>
          <div className="text-xl font-bold">{lesson.reached3Pct}%</div>
        </Card>
      </div>

      <Card className="p-0 overflow-hidden">
        <div className="px-4 py-3 border-b font-semibold text-sm">Статистика по типам заданий</div>
        {lesson.taskTypes.length === 0 ? (
          <div className="p-6 text-center text-sm text-muted-foreground">Пока нет попыток по заданиям.</div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Задание</TableHead>
                <TableHead className="text-right">Студентов</TableHead>
                <TableHead className="text-right">Ср. попыток</TableHead>
                <TableHead className="text-right">Сам</TableHead>
                <TableHead className="text-right">С подсказкой</TableHead>
                <TableHead className="text-right">Провал</TableHead>
                <TableHead className="text-right">До 3-й</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {lesson.taskTypes.map((t) => (
                <TableRow key={t.type}>
                  <TableCell className="font-medium">
                    {STEP_LABELS_RU[t.type as TaskType] ?? t.type}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{t.uniqueUsers}</TableCell>
                  <TableCell className="text-right tabular-nums">{t.avgAttempts}</TableCell>
                  <TableCell className="text-right tabular-nums text-emerald-500">{t.solvedSelf}</TableCell>
                  <TableCell className="text-right tabular-nums text-amber-500">{t.solvedWithHelp}</TableCell>
                  <TableCell className="text-right tabular-nums text-destructive">{t.failed}</TableCell>
                  <TableCell className="text-right tabular-nums font-semibold">
                    <span className={t.reached3Pct >= 40 ? "text-destructive" : ""}>{t.reached3Pct}%</span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  );
}

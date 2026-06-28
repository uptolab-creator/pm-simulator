import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { LESSONS, lessonSlug } from "@/lib/course";
import { MISSIONS } from "@/lib/missions";
import { useStudent, clearStudent, listStudentProgress, type ProgressRow } from "@/lib/student/session";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  GraduationCap,
  LogOut,
  Building2,
  ListChecks,
  CheckCircle2,
  PlayCircle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  Clock,
  CheckCheck,
} from "lucide-react";

export const Route = createFileRoute("/app")({
  head: () => ({ meta: [{ title: "Кабинет — PM Симулятор" }] }),
  component: AppHub,
});

type View = "home" | "tests" | "office";

function AppHub() {
  const navigate = useNavigate();
  const student = useStudent();
  const [view, setView] = useState<View>("home");

  useEffect(() => {
    if (student === null) navigate({ to: "/login" });
  }, [student, navigate]);

  const { data: progress, isLoading } = useQuery({
    queryKey: ["student-progress", student?.id],
    queryFn: () => listStudentProgress(student!.id),
    enabled: !!student,
    refetchOnWindowFocus: true,
  });

  if (!student) return null;

  function logout() {
    clearStudent();
    navigate({ to: "/login" });
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/app" onClick={() => setView("home")} className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <GraduationCap className="size-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">PM Симулятор</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                {student.name}
              </div>
            </div>
          </Link>
          <Button size="sm" variant="outline" onClick={logout}>
            <LogOut className="size-4" /> Выйти
          </Button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 grid gap-6 lg:grid-cols-[1fr_300px]">
        <section>
          {view === "home" && <HomeCards onPick={setView} />}
          {view === "tests" && <TestsGrid progress={progress ?? []} onBack={() => setView("home")} />}
          {view === "office" && <OfficeGrid progress={progress ?? []} onBack={() => setView("home")} />}
        </section>

        <aside className="lg:sticky lg:top-20 h-fit">
          <KanbanSidebar progress={progress ?? []} loading={isLoading} />
        </aside>
      </main>
    </div>
  );
}

function HomeCards({ onPick }: { onPick: (v: View) => void }) {
  return (
    <div>
      <h1 className="text-2xl md:text-3xl font-bold">Привет! С чего начнём?</h1>
      <p className="text-muted-foreground mt-1">Выбери раздел: пройти тесты по теории или поработать в офисе.</p>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => onPick("tests")}
          className="group rounded-2xl border bg-card p-6 text-left shadow-card transition-shadow hover:shadow-glow"
        >
          <div className="size-12 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <ListChecks className="size-6 text-white" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Тесты</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {LESSONS.length} тестов по проектному менеджменту: теория и квизы.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Открыть <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>

        <button
          type="button"
          onClick={() => onPick("office")}
          className="group rounded-2xl border bg-card p-6 text-left shadow-card transition-shadow hover:shadow-glow"
        >
          <div className="size-12 rounded-xl bg-gradient-to-br from-primary to-primary/60 grid place-items-center shadow-glow">
            <Building2 className="size-6 text-white" />
          </div>
          <h2 className="mt-4 text-lg font-bold">Офис</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {MISSIONS.length} офис-симуляций: реши реальные кейсы проджект-менеджера.
          </p>
          <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary">
            Войти в офис <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </span>
        </button>
      </div>
    </div>
  );
}

function BackBar({ title, onBack }: { title: string; onBack: () => void }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Button size="sm" variant="ghost" onClick={onBack}>
        <ArrowLeft className="size-4" /> Назад
      </Button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );
}

function statusOf(progress: ProgressRow[], kind: string, itemId: string) {
  const row = progress.find((p) => p.kind === kind && p.item_id === itemId);
  if (!row) return { done: false, started: false };
  return { done: row.status === "completed", started: row.status !== "completed" };
}

function TestsGrid({ progress, onBack }: { progress: ProgressRow[]; onBack: () => void }) {
  return (
    <div>
      <BackBar title="Тесты" onBack={onBack} />
      <div className="grid gap-3 sm:grid-cols-2">
        {LESSONS.map((lesson) => {
          const { done, started } = statusOf(progress, "test", lesson.id);
          return (
            <div key={lesson.id} className="rounded-xl border bg-card p-4 flex items-start gap-3 hover:shadow-card transition-shadow">
              <div
                className={cn(
                  "size-9 shrink-0 rounded-lg grid place-items-center text-sm font-bold",
                  done ? "bg-emerald-500 text-white" : started ? "bg-primary text-white" : "bg-secondary text-foreground",
                )}
              >
                {done ? <CheckCircle2 className="size-5" /> : lesson.number}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold text-sm leading-snug">{lesson.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{lesson.theory}</div>
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/tests/$slug"
                    params={{ slug: lessonSlug(lesson) }}
                    className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <PlayCircle className="size-4" />
                    {done ? "Повторить" : started ? "Продолжить" : "Начать"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OfficeGrid({ progress, onBack }: { progress: ProgressRow[]; onBack: () => void }) {
  return (
    <div>
      <BackBar title="Офис-симулятор" onBack={onBack} />
      <div className="grid gap-3">
        {MISSIONS.map((mission) => {
          const { done, started } = statusOf(progress, "office", mission.id);
          return (
            <div
              key={mission.id}
              className="rounded-xl border p-4 flex items-start gap-3 bg-gradient-to-br from-primary/10 to-card border-primary/30 hover:shadow-card transition-shadow"
            >
              <div
                className={cn(
                  "size-10 shrink-0 rounded-lg grid place-items-center",
                  done ? "bg-emerald-500 text-white" : "bg-gradient-primary text-white shadow-glow",
                )}
              >
                {done ? <CheckCircle2 className="size-5" /> : <Building2 className="size-5" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-[10px] uppercase tracking-[0.16em] text-primary font-semibold">{mission.covers}</div>
                <div className="font-semibold text-sm leading-snug">{mission.title}</div>
                <div className="mt-0.5 text-xs text-muted-foreground line-clamp-1">{mission.subtitle}</div>
                <div className="mt-2 flex justify-end">
                  <Link
                    to="/office/$id"
                    params={{ id: mission.id }}
                    className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
                  >
                    <ArrowRight className="size-4" />
                    {done ? "Пройти снова" : started ? "Продолжить" : "Войти в офис"}
                  </Link>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Kanban sidebar -------------------- */
function titleFor(kind: string, itemId: string): string {
  if (kind === "office") return MISSIONS.find((m) => m.id === itemId)?.title ?? itemId;
  return LESSONS.find((l) => l.id === itemId)?.title ?? itemId;
}

function KanbanCard({ row }: { row: ProgressRow }) {
  return (
    <div className="rounded-lg border bg-card p-2.5 shadow-sm">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-muted-foreground">
        {row.kind === "office" ? <Building2 className="size-3" /> : <ListChecks className="size-3" />}
        {row.kind === "office" ? "Офис" : "Тест"}
      </div>
      <div className="mt-1 text-xs font-medium leading-snug line-clamp-2">{titleFor(row.kind, row.item_id)}</div>
      {row.score != null && row.status === "completed" && (
        <div className="mt-1 text-[11px] font-semibold text-emerald-600">Балл: {row.score}</div>
      )}
    </div>
  );
}

function KanbanSidebar({ progress, loading }: { progress: ProgressRow[]; loading: boolean }) {
  const inProgress = progress.filter((p) => p.status !== "completed");
  const done = progress.filter((p) => p.status === "completed");

  return (
    <div className="rounded-2xl border bg-card/60 p-4">
      <div className="font-bold text-sm">Мой прогресс</div>
      <p className="text-[11px] text-muted-foreground">Что в работе и что уже закрыто.</p>

      {loading ? (
        <div className="mt-4 grid place-items-center py-6 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      ) : (
        <div className="mt-4 space-y-4">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-600">
              <Clock className="size-3.5" /> В работе ({inProgress.length})
            </div>
            <div className="mt-2 space-y-2">
              {inProgress.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Пока пусто.</p>
              ) : (
                inProgress.map((p) => <KanbanCard key={`${p.kind}-${p.item_id}`} row={p} />)
              )}
            </div>
          </div>

          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <CheckCheck className="size-3.5" /> Готово ({done.length})
            </div>
            <div className="mt-2 space-y-2">
              {done.length === 0 ? (
                <p className="text-[11px] text-muted-foreground">Пока пусто.</p>
              ) : (
                done.map((p) => <KanbanCard key={`${p.kind}-${p.item_id}`} row={p} />)
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

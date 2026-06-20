import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { LESSONS, lessonStepCount } from "@/lib/course";
import { getMyProgress } from "@/lib/course/progress.functions";
import { Button } from "@/components/ui/button";
import { GraduationCap, CheckCircle2, Lock, PlayCircle, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/course")({
  head: () => ({
    meta: [
      { title: "Курс — PM Симулятор" },
      { name: "description", content: "21+ урок практики проектного менеджмента: теория, задания и звонки с AI." },
    ],
  }),
  component: CoursePage,
});

type ProgressRow = { lesson_id: string; current_step: number; status: string; completed_at: string | null };

function CoursePage() {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState<boolean | null>(null);
  const fetchProgress = useServerFn(getMyProgress);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const { data: progress } = useQuery({
    queryKey: ["my-progress"],
    queryFn: () => fetchProgress() as Promise<ProgressRow[]>,
    enabled: authed === true,
  });

  const progressMap = new Map((progress ?? []).map((p) => [p.lesson_id, p]));
  const completedCount = (progress ?? []).filter((p) => p.status === "completed").length;

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/auth" });
  }

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <GraduationCap className="size-4 text-white" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">PM Симулятор</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">Курс практики</div>
            </div>
          </Link>
          {authed === false ? (
            <Button size="sm" onClick={() => navigate({ to: "/auth" })}>Войти</Button>
          ) : authed ? (
            <Button size="sm" variant="outline" onClick={signOut}>
              <LogOut className="size-4" /> Выйти
            </Button>
          ) : null}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold">Введение в проектный менеджмент в IT</h1>
          <p className="text-muted-foreground mt-1">
            {LESSONS.length} уроков. Каждый: теория → квиз → расчёт → кейс → письменное → звонок с AI.
          </p>
          {authed && (
            <div className="mt-4 flex items-center gap-3">
              <div className="h-2 flex-1 max-w-xs rounded-full bg-secondary overflow-hidden">
                <div
                  className="h-full bg-gradient-primary transition-all"
                  style={{ width: `${(completedCount / LESSONS.length) * 100}%` }}
                />
              </div>
              <span className="text-sm text-muted-foreground">
                {completedCount} / {LESSONS.length} пройдено
              </span>
            </div>
          )}
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {LESSONS.map((lesson, idx) => {
            const p = progressMap.get(lesson.id);
            const done = p?.status === "completed";
            const started = !!p && !done;
            const prev = idx === 0 ? null : progressMap.get(LESSONS[idx - 1].id);
            const locked = authed === true && idx > 0 && prev?.status !== "completed" && !p;
            const totalSteps = lessonStepCount(lesson);

            return (
              <div
                key={lesson.id}
                className={cn(
                  "rounded-xl border bg-card p-4 flex items-start gap-3 transition-shadow",
                  !locked && "hover:shadow-card",
                  locked && "opacity-60",
                )}
              >
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
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">
                      {started ? `Шаг ${(p?.current_step ?? 0) + 1}/${totalSteps}` : `${totalSteps} шагов`}
                    </span>
                    {locked ? (
                      <span className="text-xs text-muted-foreground inline-flex items-center gap-1">
                        <Lock className="size-3.5" /> Закрыт
                      </span>
                    ) : (
                      <Link
                        to="/lesson/$id"
                        params={{ id: lesson.id }}
                        className="text-xs font-medium text-primary inline-flex items-center gap-1 hover:underline"
                      >
                        <PlayCircle className="size-4" />
                        {done ? "Повторить" : started ? "Продолжить" : "Начать"}
                      </Link>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}

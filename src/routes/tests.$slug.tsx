import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { getLesson, STEP_LABELS_RU, type Task } from "@/lib/course";
import { gradeWritten, type GradeResult } from "@/lib/course/grading.functions";
import { upsertProgress, recordAttempt } from "@/lib/course/progress.functions";
import { CallPanel } from "@/components/course/CallPanel";
import { LessonRadar, type LessonSkillKey } from "@/components/course/LessonRadar";
import { AppealButton } from "@/components/course/AppealButton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Loader2,
  BookOpen,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/lessons/$slug")({
  head: ({ params }) => {
    const lesson = getLesson(params.slug);
    const title = lesson
      ? `${lesson.title} — Симулятор проектного менеджера в IT`
      : "Урок — Симулятор проектного менеджера в IT";
    const description = lesson
      ? `${lesson.theory.replace(/\s+/g, " ").trim().slice(0, 150)}…`
      : "Практический урок симулятора проектного менеджмента в IT: теория и задания с AI-проверкой.";
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:url", content: `/lessons/${params.slug}` },
      ],
      links: [{ rel: "canonical", href: `/lessons/${params.slug}` }],
    };
  },
  component: LessonRunner,
});

type AttemptStatus = "solved_self" | "solved_with_help" | "failed";

function LessonRunner() {
  const { slug } = Route.useParams();
  const navigate = useNavigate();
  const lesson = getLesson(slug);
  const saveProgress = useServerFn(upsertProgress);
  const logAttempt = useServerFn(recordAttempt);

  const [step, setStep] = useState(0);
  const [unlocked, setUnlocked] = useState(0);
  const [outcomes, setOutcomes] = useState<Record<number, AttemptStatus>>({});
  const [scores, setScores] = useState<Record<number, number>>({});

  const totalSteps = lesson ? lesson.tasks.length + 2 : 0;

  useEffect(() => {
    if (!lesson) return;
    void saveProgress({
      data: { lessonId: lesson.id, currentStep: step, status: step >= totalSteps - 1 ? "completed" : "in_progress" },
    }).catch(() => {});
  }, [step, lesson, saveProgress, totalSteps]);

  if (!lesson) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <p>Урок не найден.</p>
          <Link to="/course" className="text-primary hover:underline">К списку уроков</Link>
        </div>
      </div>
    );
  }

  const isTheory = step === 0;
  const isSummary = step === totalSteps - 1;
  const taskIndex = step - 1;
  const task = !isTheory && !isSummary ? lesson.tasks[taskIndex] : undefined;

  function goTo(target: number) {
    if (target < 0 || target > unlocked || target > totalSteps - 1) return;
    setStep(target);
  }

  function advance() {
    setStep((s) => {
      const next = Math.min(s + 1, totalSteps - 1);
      setUnlocked((u) => Math.max(u, next));
      return next;
    });
  }

  function completeTask(status: AttemptStatus, score?: number) {
    const fallbackScore = status === "solved_self" ? 100 : status === "solved_with_help" ? 65 : 30;
    setOutcomes((o) => ({ ...o, [taskIndex]: status }));
    setScores((s) => ({ ...s, [taskIndex]: score ?? fallbackScore }));
    if (task) {
      void logAttempt({
        data: {
          lessonId: lesson!.id,
          taskType: task.type,
          attemptNo: 1,
          status,
        },
      }).catch(() => {});
    }
    advance();
  }

  const stepLabel = isTheory
    ? STEP_LABELS_RU.theory
    : isSummary
      ? STEP_LABELS_RU.summary
      : STEP_LABELS_RU[task!.type];

  const progressPct = Math.round((step / (totalSteps - 1)) * 100);
  const canGoNext = step < unlocked;

  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="border-b bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link to="/course" className="text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-5" />
          </Link>
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-wider text-muted-foreground">
              Урок {lesson.number} · {stepLabel}
            </div>
            <div className="font-semibold text-sm truncate">{lesson.title}</div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(step - 1)}
              disabled={step === 0}
              className="h-8"
            >
              <ArrowLeft className="size-4" /> Назад
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(step + 1)}
              disabled={!canGoNext}
              className="h-8"
            >
              Вперёд <ArrowRight className="size-4" />
            </Button>
          </div>
        </div>
        {/* Animated overall progress bar + clickable step dots */}
        <div className="max-w-3xl mx-auto px-4 pb-3">
          <div className="flex items-center gap-3">
            <div className="relative h-2 flex-1 rounded-full bg-secondary overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-primary transition-[width] duration-500 ease-out"
                style={{ width: `${progressPct}%` }}
              />
            </div>
            <span className="text-[11px] font-medium tabular-nums text-muted-foreground shrink-0">
              {progressPct}%
            </span>
          </div>
          <div className="mt-2 flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => {
              const ti = i - 1;
              const oc = outcomes[ti];
              const active = step === i;
              const reachable = i <= unlocked;
              const label =
                i === 0 ? STEP_LABELS_RU.theory : i === totalSteps - 1 ? STEP_LABELS_RU.summary : STEP_LABELS_RU[lesson.tasks[ti].type];
              return (
                <button
                  key={i}
                  type="button"
                  disabled={!reachable}
                  onClick={() => goTo(i)}
                  className="flex-1 group disabled:cursor-not-allowed"
                  aria-label={`Шаг ${i + 1}: ${label}`}
                >
                  <div
                    className={cn(
                      "h-1.5 rounded-full transition-all",
                      oc === "solved_self" && "bg-emerald-500",
                      oc === "solved_with_help" && "bg-amber-400",
                      oc === "failed" && "bg-destructive",
                      !oc && active && "bg-primary",
                      !oc && !active && reachable && "bg-primary/30",
                      !oc && !active && !reachable && "bg-secondary",
                      active && "ring-2 ring-primary/40",
                    )}
                  />
                  <div
                    className={cn(
                      "mt-1 text-[9px] text-center uppercase tracking-wide truncate",
                      active ? "text-foreground font-semibold" : "text-muted-foreground",
                    )}
                  >
                    {label}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </header>

      <main className={cn("mx-auto px-4 py-6", task?.type === "call" ? "max-w-6xl" : "max-w-3xl")}>
        {isTheory && (
          <TheoryStep lesson={lesson} onNext={advance} />
        )}
        {task && (
          <TaskStep
            key={taskIndex}
            lessonId={lesson.id}
            task={task}
            onComplete={completeTask}
          />
        )}
        {isSummary && (
          <SummaryStep lesson={lesson} outcomes={outcomes} scores={scores} onBackToTheory={() => goTo(0)} onFinish={() => navigate({ to: "/course" })} />
        )}
      </main>
    </div>
  );
}

/* ---------------- Theory ---------------- */
function TheoryStep({ lesson, onNext }: { lesson: ReturnType<typeof getLesson> & {}; onNext: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card animate-in fade-in">
      <div className="flex items-center gap-2 text-primary">
        <BookOpen className="size-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Теория</span>
      </div>
      <h1 className="mt-3 text-xl font-bold">{lesson.title}</h1>
      <p className="mt-3 leading-relaxed text-[15px]">{lesson.theory}</p>
      {lesson.keyTerms.length > 0 && (
        <div className="mt-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Ключевые термины</div>
          <div className="flex flex-wrap gap-2">
            {lesson.keyTerms.map((term) => (
              <span key={term} className="rounded-full bg-secondary px-3 py-1 text-sm">{term}</span>
            ))}
          </div>
        </div>
      )}
      <Button className="mt-6 w-full" onClick={onNext}>
        Начать задания <ArrowRight className="size-4" />
      </Button>
    </div>
  );
}

/* ---------------- Task dispatcher ---------------- */
function TaskStep({ lessonId, task, onComplete }: { lessonId: string; task: Task; onComplete: (s: AttemptStatus, score?: number) => void }) {
  switch (task.type) {
    case "quiz":
      return <QuizStep lessonId={lessonId} task={task} onComplete={onComplete} />;
    case "calculation":
      return <CalcStep lessonId={lessonId} task={task} onComplete={onComplete} />;
    case "case_choice":
      return <CaseStep lessonId={lessonId} task={task} onComplete={onComplete} />;
    case "written":
      return <WrittenStep lessonId={lessonId} task={task} onComplete={onComplete} />;
    case "call":
      return (
        <div className="rounded-2xl border bg-card shadow-card overflow-hidden h-[78vh] min-h-[620px] flex flex-col">
          <CallPanel lessonId={lessonId} task={task} onComplete={(s, _a, score) => onComplete(s, score)} />
        </div>
      );
  }
}

function HintBox({ level, text }: { level: number; text: string }) {
  return (
    <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm mt-3">
      <div className="font-medium text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5">
        <Lightbulb className="size-4" /> Подсказка {level}
      </div>
      <p className="mt-1">{text}</p>
    </div>
  );
}

/* ---------------- Quiz ---------------- */
function QuizStep({ lessonId, task, onComplete }: { lessonId: string; task: Extract<Task, { type: "quiz" }>; onComplete: (s: AttemptStatus) => void }) {
  const [qi, setQi] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [attempts, setAttempts] = useState(0);
  const [usedHelp, setUsedHelp] = useState(false);
  const [reveal, setReveal] = useState(false);

  const q = task.questions[qi];
  const correct = selected === q.correctIndex;

  function check() {
    if (selected === null) return;
    if (selected === q.correctIndex) {
      next(attempts > 0);
    } else {
      const n = attempts + 1;
      setAttempts(n);
      setUsedHelp(true);
      if (n >= 2) setReveal(true);
    }
  }

  function next(withHelp: boolean) {
    if (qi + 1 < task.questions.length) {
      setQi(qi + 1);
      setSelected(null);
      setAttempts(0);
      setReveal(false);
      if (withHelp) setUsedHelp(true);
    } else {
      onComplete(usedHelp || withHelp ? "solved_with_help" : "solved_self");
    }
  }

  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-card">
      <div className="border-b bg-secondary/40 p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-primary">Ситуационный раунд</span>
          <span className="rounded-full bg-card px-3 py-1 text-xs text-muted-foreground shadow-card">
            {qi + 1}/{task.questions.length}
          </span>
        </div>
        <h3 className="mt-3 text-lg font-semibold">{q.question}</h3>
      </div>
      <div className="p-5 space-y-2">
        {q.options.map((opt, i) => {
          const isSel = selected === i;
          const showCorrect = (reveal || (selected !== null && correct)) && i === q.correctIndex;
          const showWrong = isSel && selected !== q.correctIndex && attempts > 0;
          return (
            <button
              key={i}
              type="button"
              disabled={reveal}
              onClick={() => setSelected(i)}
              className={cn(
                "group flex w-full items-center gap-3 rounded-lg border px-4 py-3 text-left text-sm transition-colors",
                isSel && !showWrong && "border-primary bg-primary/5",
                showCorrect && "border-emerald-500 bg-emerald-500/10",
                showWrong && "border-destructive bg-destructive/10",
                !isSel && !showCorrect && "hover:bg-secondary",
              )}
            >
              <span className="grid size-7 shrink-0 place-items-center rounded-md bg-secondary text-xs font-semibold group-hover:bg-card">
                {String.fromCharCode(65 + i)}
              </span>
              <span className="flex-1">{opt}</span>
              {showCorrect && <CheckCircle2 className="size-4 shrink-0 text-emerald-600" />}
              {showWrong && <XCircle className="size-4 shrink-0 text-destructive" />}
            </button>
          );
        })}

      {attempts === 1 && !reveal && <HintBox level={1} text={task.hint1} />}
      {attempts >= 2 && !reveal && <HintBox level={2} text={task.hint2} />}
      {reveal && (
        <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">
          Правильный ответ выделен зелёным. Запомни и двигайся дальше.
        </div>
      )}
      {attempts >= 1 && (
        <AppealButton
          context={{
            lessonId,
            taskType: "quiz",
            attemptNumber: attempts,
            studentInput: selected !== null ? `Вопрос: ${q.question} · Выбран вариант ${selected !== null ? String.fromCharCode(65 + selected) : "-"}: ${selected !== null ? q.options[selected] : ""}` : "",
            systemFeedback: reveal ? task.hint2 : task.hint1,
          }}
        />
      )}

      <div className="mt-5">
        {reveal ? (
          <Button className="w-full" onClick={() => next(true)}>Дальше</Button>
        ) : (
          <Button className="w-full" onClick={check} disabled={selected === null}>Проверить</Button>
        )}
      </div>
      </div>
    </div>
  );
}

/* ---------------- Calculation ---------------- */
function CalcStep({ lessonId, task, onComplete }: { lessonId: string; task: Extract<Task, { type: "calculation" }>; onComplete: (s: AttemptStatus) => void }) {
  const [value, setValue] = useState("");
  const [attempts, setAttempts] = useState(0);
  const [reveal, setReveal] = useState(false);

  function judge(): boolean {
    const raw = value.trim().toLowerCase();
    if (!raw) return false;
    if (task.numericAnswer !== undefined) {
      const num = parseFloat(raw.replace(/[^0-9.,-]/g, "").replace(",", "."));
      if (!Number.isNaN(num) && Math.abs(num - task.numericAnswer) <= (task.tolerance ?? 0)) {
        if (task.keywords && task.keywords.length) {
          return task.keywords.some((k) => raw.includes(k.toLowerCase()));
        }
        return true;
      }
      return false;
    }
    if (task.keywords) return task.keywords.some((k) => raw.includes(k.toLowerCase()));
    return false;
  }

  function check() {
    if (judge()) {
      onComplete(attempts > 0 ? "solved_with_help" : "solved_self");
    } else {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 2) setReveal(true);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <div className="flex items-center gap-2 text-primary">
        <Sparkles className="size-5" />
        <span className="text-xs font-semibold uppercase tracking-wider">Расчётная задача</span>
      </div>
      <h3 className="mt-3 font-semibold">{task.prompt}</h3>
      {task.given && <div className="mt-3 rounded-lg bg-secondary/60 p-3 text-sm">{task.given}</div>}

      <Input
        className="mt-4"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Твой ответ (число или вывод)"
        disabled={reveal}
      />

      {attempts === 1 && !reveal && <HintBox level={1} text={task.hint1} />}
      {attempts >= 2 && !reveal && <HintBox level={2} text={task.hint2} />}
      {reveal && (
        <div className="mt-3 rounded-lg border bg-secondary/60 p-3 text-sm">
          <div className="font-semibold">Решение</div>
          <p className="mt-1">{task.explanation}</p>
        </div>
      )}
      {attempts >= 1 && (
        <AppealButton
          context={{
            lessonId,
            taskType: "calculation",
            attemptNumber: attempts,
            studentInput: value,
            systemFeedback: reveal ? `Решение: ${task.explanation}` : task.hint1,
          }}
        />
      )}

      <div className="mt-5">
        {reveal ? (
          <Button className="w-full" onClick={() => onComplete("solved_with_help")}>Дальше</Button>
        ) : (
          <Button className="w-full" onClick={check} disabled={!value.trim()}>Проверить</Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Case (categorization) ---------------- */
function CaseStep({ lessonId, task, onComplete }: { lessonId: string; task: Extract<Task, { type: "case_choice" }>; onComplete: (s: AttemptStatus) => void }) {
  const [assign, setAssign] = useState<Record<number, string>>({});
  const [attempts, setAttempts] = useState(0);
  const [reveal, setReveal] = useState(false);

  const allAssigned = task.items.every((_, i) => assign[i]);
  const allCorrect = task.items.every((it, i) => assign[i] === it.correct);

  function check() {
    if (!allAssigned) return;
    if (allCorrect) {
      onComplete(attempts > 0 ? "solved_with_help" : "solved_self");
    } else {
      const n = attempts + 1;
      setAttempts(n);
      if (n >= 2) setReveal(true);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Кейс с выбором</span>
      <h3 className="mt-2 font-semibold">{task.prompt}</h3>
      <div className="mt-4 space-y-3">
        {task.items.map((it, i) => {
          const chosen = assign[i];
          const wrong = attempts > 0 && chosen && chosen !== it.correct;
          return (
            <div key={i} className={cn("rounded-lg border p-3", wrong && "border-destructive")}>
              <div className="text-sm">{it.text}</div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {task.categories.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    disabled={reveal}
                    onClick={() => setAssign((a) => ({ ...a, [i]: cat }))}
                    className={cn(
                      "rounded-full px-3 py-1 text-xs border transition-colors",
                      chosen === cat ? "bg-primary text-primary-foreground border-primary" : "hover:bg-secondary",
                      reveal && cat === it.correct && "border-emerald-500 bg-emerald-500/10 text-foreground",
                    )}
                  >
                    {cat}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {attempts === 1 && !reveal && <HintBox level={1} text={task.hint1} />}
      {attempts >= 2 && !reveal && <HintBox level={2} text={task.hint2} />}
      {reveal && (
        <div className="mt-3 rounded-lg border bg-secondary/60 p-3 text-sm">
          <div className="font-semibold">Разбор</div>
          <p className="mt-1">{task.explanation}</p>
        </div>
      )}
      {attempts >= 1 && (
        <AppealButton
          context={{
            lessonId,
            taskType: "case_choice",
            attemptNumber: attempts,
            studentInput: task.items.map((it, i) => `«${it.text}» → ${assign[i] ?? "-"}`).join("; "),
            systemFeedback: reveal ? `Разбор: ${task.explanation}` : task.hint1,
          }}
        />
      )}

      <div className="mt-5">
        {reveal ? (
          <Button className="w-full" onClick={() => onComplete("solved_with_help")}>Дальше</Button>
        ) : (
          <Button className="w-full" onClick={check} disabled={!allAssigned}>Проверить</Button>
        )}
      </div>
    </div>
  );
}

/* ---------------- Written ---------------- */
function WrittenStep({ lessonId, task, onComplete }: { lessonId: string; task: Extract<Task, { type: "written" }>; onComplete: (s: AttemptStatus) => void }) {
  const grade = useServerFn(gradeWritten);
  const [answer, setAnswer] = useState("");
  const [revisions, setRevisions] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [loading, setLoading] = useState(false);
  const forceReveal = revisions > 3;

  async function submit() {
    if (!answer.trim()) return;
    setLoading(true);
    try {
      const res = (await grade({ data: { prompt: task.prompt, criteria: task.criteria, answer } })) as GradeResult;
      setResult(res);
      if (res.passed) {
        onComplete(revisions > 0 ? "solved_with_help" : "solved_self");
      } else {
        setRevisions((r) => r + 1);
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card">
      <span className="text-xs font-semibold uppercase tracking-wider text-primary">Письменное задание</span>
      <h3 className="mt-2 font-semibold">{task.prompt}</h3>
      <div className="mt-3 rounded-lg bg-secondary/40 p-3">
        <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">Критерии</div>
        <ul className="space-y-1 text-sm">
          {task.criteria.map((c) => {
            const met = result?.metCriteria.includes(c);
            const unmet = result?.unmetCriteria.includes(c);
            return (
              <li key={c} className="flex items-start gap-2">
                {met ? <CheckCircle2 className="size-4 text-emerald-600 mt-0.5 shrink-0" /> : unmet ? <XCircle className="size-4 text-destructive mt-0.5 shrink-0" /> : <span className="size-4 rounded-full border mt-0.5 shrink-0" />}
                <span>{c}</span>
              </li>
            );
          })}
        </ul>
      </div>

      <Textarea
        className="mt-4 min-h-[140px]"
        value={answer}
        onChange={(e) => setAnswer(e.target.value)}
        placeholder="Напиши развёрнутый ответ…"
        disabled={forceReveal}
      />

      {result && !result.passed && !forceReveal && (
        <div className="mt-3 rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
          <div className="font-medium text-amber-700 dark:text-amber-400 inline-flex items-center gap-1.5">
            <Lightbulb className="size-4" /> Что доработать
          </div>
          <p className="mt-1">{result.guidingQuestion || result.feedback}</p>
          <AppealButton
            context={{
              lessonId,
              taskType: "written",
              attemptNumber: revisions,
              studentInput: answer,
              systemFeedback: JSON.stringify(result),
            }}
          />
        </div>
      )}

      {forceReveal && (
        <div className="mt-3 rounded-lg border bg-secondary/60 p-3 text-sm">
          <div className="font-semibold">Эталонный ответ</div>
          <p className="mt-1 text-muted-foreground whitespace-pre-line">{task.referenceAnswer}</p>
          <Button className="mt-3 w-full" onClick={() => onComplete("solved_with_help")}>Понятно, дальше</Button>
        </div>
      )}

      {!forceReveal && (
        <Button className="mt-5 w-full" onClick={submit} disabled={loading || !answer.trim()}>
          {loading && <Loader2 className="size-4 animate-spin" />} Отправить на проверку
        </Button>
      )}
    </div>
  );
}

/* ---------------- Summary ---------------- */
const TASK_SKILL: Record<Task["type"], LessonSkillKey> = {
  quiz: "productThinking",
  calculation: "analytics",
  case_choice: "prioritization",
  written: "execution",
  call: "communication",
};

function verdictFor(score: number) {
  if (score >= 85) return { label: "Отличный результат", color: "text-emerald-600" };
  if (score >= 70) return { label: "Хорошая база", color: "text-emerald-600" };
  if (score >= 50) return { label: "Есть над чем поработать", color: "text-amber-500" };
  return { label: "Стоит повторить тему", color: "text-destructive" };
}

function SummaryStep({
  lesson,
  outcomes,
  scores,
  onBackToTheory,
  onFinish,
}: {
  lesson: NonNullable<ReturnType<typeof getLesson>>;
  outcomes: Record<number, AttemptStatus>;
  scores: Record<number, number>;
  onBackToTheory: () => void;
  onFinish: () => void;
}) {
  const { stats, skills, hasCall, callScore } = useMemo(() => {
    const vals = Object.values(outcomes);
    const self = vals.filter((v) => v === "solved_self").length;
    const help = vals.filter((v) => v === "solved_with_help").length;
    const total = lesson.tasks.length;
    const allScores = lesson.tasks.map((_, i) => scores[i] ?? 0);
    const overall = Math.round(allScores.reduce((a, b) => a + b, 0) / Math.max(1, total));

    // accumulate per-skill from task types present in this lesson
    const buckets: Record<LessonSkillKey, number[]> = {
      productThinking: [],
      analytics: [],
      communication: [],
      prioritization: [],
      execution: [],
      riskManagement: [],
    };
    lesson.tasks.forEach((t, i) => {
      buckets[TASK_SKILL[t.type]].push(scores[i] ?? 0);
      // every task also contributes to risk-management awareness
      buckets.riskManagement.push((scores[i] ?? 0) * 0.9);
    });
    const skills = (Object.keys(buckets) as LessonSkillKey[]).reduce((acc, k) => {
      const arr = buckets[k];
      acc[k] = arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : overall;
      return acc;
    }, {} as Record<LessonSkillKey, number>);

    const callIdx = lesson.tasks.findIndex((t) => t.type === "call");
    return {
      stats: { self, help, total, score: overall },
      skills,
      hasCall: callIdx >= 0,
      callScore: callIdx >= 0 ? scores[callIdx] ?? 0 : 0,
    };
  }, [outcomes, scores, lesson]);

  const verdict = verdictFor(stats.score);

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-card animate-in fade-in">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2">Урок пройден <span>🎉</span></h2>
          <p className="text-muted-foreground text-sm mt-0.5">{lesson.title}</p>
        </div>
      </div>

      <div className="mt-6 grid lg:grid-cols-[240px_1fr] gap-6 items-center">
        <div className="rounded-xl border bg-secondary/30 p-6 text-center">
          <div className="text-[11px] text-muted-foreground uppercase tracking-wider">Итоговый балл</div>
          <div className="mt-1 text-6xl font-bold tracking-tight">
            {stats.score}
            <span className="text-2xl text-muted-foreground font-medium">/100</span>
          </div>
          <div className={cn("mt-2 text-sm font-semibold", verdict.color)}>{verdict.label}</div>
        </div>
        <LessonRadar skills={skills} />
      </div>

      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 gap-3">
        <div className="rounded-xl bg-secondary/60 p-3 text-center">
          <div className="text-2xl font-bold text-emerald-600">{stats.self}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">самостоятельно</div>
        </div>
        <div className="rounded-xl bg-secondary/60 p-3 text-center">
          <div className="text-2xl font-bold text-amber-500">{stats.help}</div>
          <div className="text-[11px] text-muted-foreground uppercase tracking-wide">с подсказками</div>
        </div>
        {hasCall && (
          <div className="rounded-xl bg-secondary/60 p-3 text-center">
            <div className="text-2xl font-bold text-primary">{callScore}</div>
            <div className="text-[11px] text-muted-foreground uppercase tracking-wide">оценка звонка</div>
          </div>
        )}
      </div>

      <div className="mt-6 grid sm:grid-cols-2 gap-2">
        <Button onClick={onFinish}>К списку уроков</Button>
        <Button variant="outline" onClick={onBackToTheory}>
          <BookOpen className="size-4" /> Повторить теорию
        </Button>
      </div>
    </div>
  );
}


import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { submitAppeal } from "@/lib/course/appeals.functions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ShieldAlert, Loader2, CheckCircle2 } from "lucide-react";

export interface AppealContext {
  lessonId: string;
  taskType: "quiz" | "calculation" | "case_choice" | "written" | "call" | string;
  attemptNumber: number;
  studentInput: string;
  systemFeedback: string;
  callTranscript?: { role: string; text: string }[];
}

const CATEGORIES = [
  { value: "ai_grading", label: "AI неверно оценил мой ответ" },
  { value: "task_bug", label: "В условии задания/квиза опечатка или баг" },
  { value: "wrong_numeric", label: "Не согласен с правильным числовым ответом" },
  { value: "other", label: "Другое" },
];

export function AppealButton({ context }: { context: AppealContext }) {
  const send = useServerFn(submitAppeal);
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<string>("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit() {
    if (!category || text.trim().length < 3 || loading) return;
    setLoading(true);
    try {
      await send({
        data: {
          lessonId: context.lessonId,
          taskType: context.taskType,
          attemptNumber: context.attemptNumber,
          studentInput: context.studentInput,
          systemFeedback: context.systemFeedback,
          callTranscript: context.callTranscript ?? [],
          complaintCategory: CATEGORIES.find((c) => c.value === category)?.label ?? category,
          complaintText: text.trim(),
        },
      });
      setSubmitted(true);
      setTimeout(() => setOpen(false), 2200);
    } catch {
      // keep dialog open so the user can retry
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={submitted}
        onClick={() => setOpen(true)}
        className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground underline-offset-2 hover:underline disabled:no-underline disabled:opacity-70 disabled:cursor-default transition-colors"
      >
        <ShieldAlert className="size-3.5" />
        {submitted ? "Жалоба на рассмотрении" : "Заметить ошибку в проверке?"}
      </button>

      <Dialog open={open} onOpenChange={(o) => !loading && setOpen(o)}>
        <DialogContent className="sm:max-w-md">
          {submitted ? (
            <div className="py-6 text-center">
              <CheckCircle2 className="mx-auto size-10 text-emerald-500" />
              <p className="mt-3 font-medium">Жалоба отправлена</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Админы проверят её в течение 24 часов.
              </p>
            </div>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Сообщить об ошибке в задании</DialogTitle>
                <DialogDescription>
                  Опиши проблему — мы автоматически приложим контекст твоего ответа и проверки.
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Категория проблемы</label>
                  <Select value={category} onValueChange={setCategory}>
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Выбери категорию" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-xs font-medium text-muted-foreground">Комментарий</label>
                  <Textarea
                    className="mt-1 min-h-28"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    maxLength={2000}
                    placeholder="Например: Я указал все 3 слоя (фронт/бэк/API), но AI написал, что API отсутствует…"
                  />
                </div>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                  Отмена
                </Button>
                <Button onClick={handleSubmit} disabled={loading || !category || text.trim().length < 3}>
                  {loading && <Loader2 className="size-4 animate-spin" />}
                  Отправить
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

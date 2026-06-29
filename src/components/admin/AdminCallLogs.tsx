import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  getCallLogs,
  overruleAttempt,
  resolveAppeal,
  type CallLog,
} from "@/lib/admin/admin.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { LESSONS } from "@/lib/course";
import { toast } from "sonner";
import { PhoneCall, Flag, CheckCircle2, XCircle, Filter, AlertTriangle, RefreshCw } from "lucide-react";

export function AdminCallLogs() {
  const fetchLogs = useServerFn(getCallLogs);
  const overrule = useServerFn(overruleAttempt);
  const resolve = useServerFn(resolveAppeal);
  const qc = useQueryClient();

  const [lessonId, setLessonId] = useState<string>("all");
  const [onlyNegative, setOnlyNegative] = useState(false);
  const [onlyLowScore, setOnlyLowScore] = useState(false);
  const [search, setSearch] = useState("");
  const [active, setActive] = useState<CallLog | null>(null);
  const [note, setNote] = useState("");

  const filters = {
    lessonId: lessonId === "all" ? undefined : lessonId,
    onlyNegative,
    onlyLowScore,
    search,
  };

  const { data: logs, isLoading, error, refetch } = useQuery({
    queryKey: ["call-logs", filters],
    queryFn: () => fetchLogs({ data: filters }) as Promise<CallLog[]>,
    retry: 1,
  });

  async function applyOverrule(log: CallLog, status: "solved_self" | "solved_with_help" | "failed") {
    try {
      if (log.source === "attempt") {
        await overrule({ data: { attemptId: log.id, status, note } });
      } else {
        await resolve({
          data: {
            appealId: log.id,
            status: status === "failed" ? "rejected" : "approved",
            resolution: note,
          },
        });
      }
      toast.success("Вердикт обновлён");
      setNote("");
      setActive(null);
      qc.invalidateQueries({ queryKey: ["call-logs"] });
    } catch (e: any) {
      toast.error(e?.message ?? "Ошибка");
    }
  }

  return (
    <div className="grid lg:grid-cols-[1fr_380px] gap-4">
      <div className="space-y-4">
        <Card className="p-3 flex flex-wrap items-center gap-2">
          <Filter className="size-4 text-muted-foreground" />
          <Select value={lessonId} onValueChange={setLessonId}>
            <SelectTrigger className="w-[200px] h-8">
              <SelectValue placeholder="Урок / персонаж" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все уроки</SelectItem>
              {LESSONS.filter((l) => l.tasks.some((t) => t.type === "call")).map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.number}. {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            size="sm"
            variant={onlyNegative ? "default" : "outline"}
            onClick={() => setOnlyNegative((v) => !v)}
          >
            Негативный фидбек
          </Button>
          <Button
            size="sm"
            variant={onlyLowScore ? "default" : "outline"}
            onClick={() => setOnlyLowScore((v) => !v)}
          >
            Hidden info не раскрыт (низкий балл)
          </Button>
          <Input
            placeholder="Поиск по персонажу…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 w-[180px]"
          />
        </Card>

        {isLoading ? (
          <div className="text-muted-foreground py-12 text-center flex items-center justify-center gap-2">
            <RefreshCw className="size-4 animate-spin" /> Загрузка звонков…
          </div>
        ) : error ? (
          <div className="py-12 text-center space-y-3">
            <AlertTriangle className="size-6 mx-auto text-destructive" />
            <p className="text-sm text-destructive">{(error as Error)?.message || "Не удалось загрузить логи"}</p>
            <button onClick={() => refetch()} className="text-sm text-primary hover:underline flex items-center gap-1 mx-auto">
              <RefreshCw className="size-3" /> Повторить загрузку
            </button>
          </div>
        ) : !logs?.length ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            Нет звонков по выбранным фильтрам.
          </Card>
        ) : (
          <div className="space-y-2">
            {logs.map((log) => (
              <Card
                key={`${log.source}-${log.id}`}
                className={`p-3 cursor-pointer transition-colors ${
                  active?.id === log.id ? "ring-2 ring-primary" : "hover:bg-muted/40"
                }`}
                onClick={() => {
                  setActive(log);
                  setNote(log.resolution ?? "");
                }}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <PhoneCall className="size-4 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="font-medium text-sm truncate">
                        {log.personaName} · {log.personaRole}
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{log.lessonTitle}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {log.source === "appeal" && (
                      <Badge variant="outline" className="bg-amber-500/15 text-amber-500 border-amber-500/30">
                        <Flag className="size-3" /> Жалоба
                      </Badge>
                    )}
                    {log.score != null && (
                      <Badge
                        variant="outline"
                        className={
                          log.score < 50
                            ? "bg-destructive/15 text-destructive border-destructive/30"
                            : "bg-emerald-500/15 text-emerald-500 border-emerald-500/30"
                        }
                      >
                        {log.score}/100
                      </Badge>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <div>
        <Card className="p-4 sticky top-20">
          {!active ? (
            <div className="text-sm text-muted-foreground text-center py-12">
              Выберите звонок слева, чтобы увидеть диалог и пересмотреть вердикт AI.
            </div>
          ) : (
            <div className="space-y-3">
              <div>
                <div className="font-semibold text-sm">
                  {active.personaName} · {active.personaRole}
                </div>
                <div className="text-xs text-muted-foreground">{active.lessonTitle}</div>
              </div>

              {active.appealText && (
                <div className="rounded-lg bg-amber-500/10 border border-amber-500/30 p-2 text-xs">
                  <span className="font-medium">Жалоба студента: </span>
                  {active.appealText}
                </div>
              )}

              {active.feedback && (
                <div className="rounded-lg bg-muted/50 p-2 text-xs">
                  <span className="font-medium">Вердикт AI: </span>
                  {active.feedback}
                </div>
              )}

              <div className="max-h-64 overflow-y-auto space-y-1.5 rounded-lg border p-2">
                {active.transcript.length === 0 ? (
                  <div className="text-xs text-muted-foreground text-center py-4">
                    Транскрипт диалога недоступен.
                  </div>
                ) : (
                  active.transcript.map((m, i) => (
                    <div
                      key={i}
                      className={`text-xs rounded px-2 py-1 ${
                        m.role === "user"
                          ? "bg-primary/10 ml-6"
                          : "bg-muted mr-6"
                      }`}
                    >
                      <span className="font-medium">{m.role === "user" ? "Студент" : active.personaName}: </span>
                      {m.text}
                    </div>
                  ))
                )}
              </div>

              <Textarea
                placeholder="Комментарий администратора к пересмотру…"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                className="text-xs"
              />

              <div className="space-y-1.5">
                <div className="text-xs font-medium text-muted-foreground">Перепроверить вердикт (Overrule):</div>
                <div className="flex flex-wrap gap-1.5">
                  <Button size="sm" onClick={() => applyOverrule(active, "solved_self")}>
                    <CheckCircle2 className="size-4" /> Засчитать
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => applyOverrule(active, "solved_with_help")}>
                    С помощью
                  </Button>
                  <Button size="sm" variant="destructive" onClick={() => applyOverrule(active, "failed")}>
                    <XCircle className="size-4" /> Отклонить
                  </Button>
                </div>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}

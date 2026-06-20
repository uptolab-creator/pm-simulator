import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { callReply, gradeCallAnswer, type GradeResult } from "@/lib/course/grading.functions";
import type { CallTask } from "@/lib/course";
import { AppealButton } from "@/components/course/AppealButton";
import {
  Camera,
  CameraOff,
  Captions,
  CheckCircle2,
  Loader2,
  Maximize2,
  MessageSquare,
  Mic,
  MicOff,
  MonitorUp,
  Phone,
  PhoneOff,
  Send,
  Square,
  Users,
  Volume2,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "persona"; text: string };
type Participant = { name: string; role: string; kind: "user" | "persona" | "observer"; mood: string };

const VIDEO_BACKGROUNDS = ["bg-sidebar", "bg-secondary", "bg-accent", "bg-muted"];

function initials(name: string) {
  return name
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function buildParticipants(task: CallTask): Participant[] {
  const role = `${task.personaRole} ${task.character} ${task.brief}`.toLowerCase();
  const extra: Participant[] = [];

  if (role.includes("разработ") || role.includes("api") || role.includes("backend") || role.includes("git")) {
    extra.push({ name: "Антон", role: "Backend developer", kind: "observer", mood: "слушает" });
  }
  if (role.includes("дизайн") || role.includes("макет")) {
    extra.push({ name: "Лера", role: "Product designer", kind: "observer", mood: "готовит макет" });
  }
  if (role.includes("спонсор") || role.includes("ceo") || role.includes("заказчик")) {
    extra.push({ name: "Ольга", role: "Stakeholder", kind: "observer", mood: "ждёт решения" });
  }
  if (role.includes("команд") || role.includes("scrum") || role.includes("planning")) {
    extra.push({ name: "Дима", role: "Team lead", kind: "observer", mood: "смотрит доску" });
  }

  return [
    { name: "Ты", role: "Project Manager", kind: "user", mood: "ведёшь созвон" },
    { name: task.personaName, role: task.personaRole, kind: "persona", mood: "говорит" },
    ...extra.slice(0, 2),
  ];
}
const OBSERVER_LINES: { match: string; lines: string[] }[] = [
  {
    match: "developer",
    lines: [
      "С технической стороны добавлю: тут есть зависимость, которую важно проговорить.",
      "Могу прикинуть оценку, но мне нужен зафиксированный объём.",
      "Если решим менять scope — это снова ляжет на бэкенд.",
    ],
  },
  {
    match: "designer",
    lines: [
      "По макетам: финальную версию отдам, как только закрепим требования.",
      "Я бы заранее согласовала состояние для пустых экранов.",
      "Дизайн готов на 80%, остаток зависит от ваших вводных.",
    ],
  },
  {
    match: "stakeholder",
    lines: [
      "Для меня главное — чтобы это било в бизнес-метрику.",
      "Жду от вас понятный план и сроки, а не общие слова.",
      "Если есть риск для релиза — хочу услышать его сейчас.",
    ],
  },
  {
    match: "lead",
    lines: [
      "По доске видно, что часть задач уже в риске.",
      "Команда готова, но нужен приоритет — что берём первым.",
      "Давайте зафиксируем, кто за что отвечает после звонка.",
    ],
  },
];

function observerLine(role: string): string {
  const r = role.toLowerCase();
  const bucket = OBSERVER_LINES.find((b) => r.includes(b.match)) ?? OBSERVER_LINES[3];
  return bucket.lines[Math.floor(Math.random() * bucket.lines.length)];
}


function suggestedPrompts(task: CallTask) {
  const text = `${task.brief} ${task.personaRole} ${task.hiddenInfo} ${task.revealCondition}`.toLowerCase();
  if (text.includes("api") || text.includes("бэкенд") || text.includes("разработ")) {
    return ["Что сейчас блокирует срок?", "Что входит в твою оценку?", "Какая зависимость самая рискованная?"];
  }
  if (text.includes("дизайн") || text.includes("макет")) {
    return ["Что мешает подготовить макет?", "Какая у тебя загрузка?", "Что нужно зафиксировать в DoR?"];
  }
  if (text.includes("бюджет") || text.includes("спонсор") || text.includes("ceo")) {
    return ["Какой критерий успеха главный?", "Какие ограничения по бюджету?", "Какой риск для релиза самый важный?"];
  }
  return ["Что я как PM должен уточнить?", "Какая скрытая зависимость есть?", "Какой следующий шаг ты ждёшь?"];
}

export function CallPanel({
  task,
  lessonId,
  onComplete,
}: {
  task: CallTask;
  lessonId: string;
  onComplete: (status: "solved_self" | "solved_with_help", answer: string, score?: number) => void;
}) {
  const reply = useServerFn(callReply);
  const grade = useServerFn(gradeCallAnswer);

  const participants = useMemo(() => buildParticipants(task), [task]);
  const promptChips = useMemo(() => suggestedPrompts(task), [task]);
  const [connected, setConnected] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [revealed, setRevealed] = useState(false);
  const revealedRef = useRef(false);
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [muted, setMuted] = useState(false);
  const [cameraOn, setCameraOn] = useState(true);
  const [captionsOn, setCaptionsOn] = useState(true);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"lobby" | "talk" | "answer">("lobby");
  const [answer, setAnswer] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);
  const [error, setError] = useState("");
  const [observerSpeech, setObserverSpeech] = useState<Record<string, string>>({});

  const observers = useMemo(() => participants.filter((p) => p.kind === "observer"), [participants]);

  const nudgeObservers = useCallback(() => {
    if (observers.length === 0) return;
    const target = observers[Math.floor(Math.random() * observers.length)];
    const line = observerLine(target.role);
    setObserverSpeech((prev) => ({ ...prev, [target.name]: line }));
  }, [observers]);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const markRevealed = useCallback(() => {
    revealedRef.current = true;
    setRevealed(true);
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [turns, thinking]);

  const speak = useCallback(async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      if (audioRef.current) {
        audioRef.current.src = url;
        await audioRef.current.play().catch(() => {});
      }
    } catch {
      /* browser can block autoplay */
    }
  }, []);

  const sendToPersona = useCallback(
    async (text: string) => {
      const clean = text.trim();
      if (!clean) return;
      const history = turns.map((t) => ({ role: t.role, text: t.text }));
      setTurns((prev) => [...prev, { role: "user", text: clean }]);
      setDraft("");
      setError("");
      setThinking(true);
      try {
        const out = (await reply({
          data: {
            personaName: task.personaName,
            personaRole: task.personaRole,
            character: task.character,
            hiddenInfo: task.hiddenInfo,
            revealCondition: task.revealCondition,
            brief: task.brief,
            history,
            userMessage: clean,
            revealedAlready: revealedRef.current,
          },
        })) as { reply: string; revealed: boolean };
        setTurns((prev) => [...prev, { role: "persona", text: out.reply }]);
        if (out.revealed) markRevealed();
        void speak(out.reply);
        if (Math.random() < 0.55) setTimeout(nudgeObservers, 900);
      } catch {
        const fallback = `${task.personaName}: Я слышу тебя. Давай конкретно: спроси про сроки, блокеры, объём работ или готовность ключевой части.`;
        setTurns((prev) => [...prev, { role: "persona", text: fallback }]);
        setError("Ответ AI временно недоступен, включён локальный режим созвона.");
      } finally {
        setThinking(false);
      }
    },
    [reply, task, turns, speak, markRevealed, nudgeObservers],
  );

  async function startCall() {
    setConnected(true);
    setPhase("talk");
    setThinking(true);
    setError("");
    try {
      const out = (await reply({
        data: {
          personaName: task.personaName,
          personaRole: task.personaRole,
          character: task.character,
          hiddenInfo: task.hiddenInfo,
          revealCondition: task.revealCondition,
          brief: task.brief,
          history: [],
          userMessage: "Здравствуйте! Это PM. Давайте обсудим ситуацию на проектном созвоне.",
          revealedAlready: false,
        },
      })) as { reply: string; revealed: boolean };
      setTurns([{ role: "persona", text: out.reply }]);
      if (out.revealed) markRevealed();
      void speak(out.reply);
      setObserverSpeech(
        observers.reduce((acc, o) => ({ ...acc, [o.name]: observerLine(o.role) }), {}),
      );
    } catch {
      const firstLine = `${task.personaName}: Привет. ${task.brief} Я готов обсудить, но мне нужны конкретные вопросы от PM.`;
      setTurns([{ role: "persona", text: firstLine }]);
      setError("AI-созвон запущен в локальном режиме, потому что серверный ответ не пришёл.");
    } finally {
      setThinking(false);
    }
  }

  async function toggleRecord() {
    if (recording) {
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }
    setError("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t));
      if (!mime) {
        stream.getTracks().forEach((t) => t.stop());
        setError("Браузер не поддерживает подходящий формат записи. Напиши реплику текстом.");
        return;
      }
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) {
          setError("Запись получилась пустой — попробуй ещё раз или введи текст.");
          return;
        }
        const ext = rec.mimeType.includes("mp4") ? "mp4" : "webm";
        const form = new FormData();
        form.append("audio", blob, `recording.${ext}`);
        setThinking(true);
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const json = await res.json().catch(() => null);
          const text = json?.text?.trim();
          if (!res.ok || !text) {
            setError("Не удалось распознать речь. Можно сразу написать реплику в поле ввода.");
            return;
          }
          if (phase === "answer") setAnswer((a) => (a ? `${a} ${text}` : text));
          else await sendToPersona(text);
        } finally {
          setThinking(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      setError("Нет доступа к микрофону. Разреши доступ или используй текстовый ввод.");
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setGrading(true);
    setError("");
    try {
      const res = (await grade({
        data: {
          prompt: task.openQuestion,
          criteria: task.criteria,
          answer,
          hiddenInfo: task.hiddenInfo,
          transcript: turns,
        },
      })) as GradeResult;
      setResult(res);
      // call score: criteria coverage, bonus for revealing the hidden detail, penalty per hint
      const total = task.criteria.length || 1;
      const coverage = Math.min(res.metCriteria.length, total) / total;
      let score = Math.round(coverage * 80 + (revealedRef.current ? 20 : 0) - hintCount * 8);
      score = Math.max(20, Math.min(100, score));
      if (res.passed) {
        onComplete(hintCount > 0 ? "solved_with_help" : "solved_self", answer, score);
      } else {
        setHintCount((c) => c + 1);
      }
    } catch {
      setError("Проверка временно недоступна. Ответ сохранён как выполненный с подсказкой.");
      onComplete("solved_with_help", answer, 60);
    } finally {
      setGrading(false);
    }
  }

  const lastPersonaText = [...turns].reverse().find((t) => t.role === "persona")?.text;
  const maxHints = 2;
  const forceReveal = hintCount > maxHints;

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      <audio ref={audioRef} className="hidden" />

      <div className="flex items-center gap-3 border-b bg-secondary/40 px-4 py-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Users className="size-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold">Project call · {task.personaName}</div>
          <div className="truncate text-xs text-muted-foreground">{participants.length} участника · {task.brief}</div>
        </div>
        {connected && (
          <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-1 text-xs text-success">
            <span className="size-2 rounded-full bg-success animate-pulse" /> Live
          </span>
        )}
      </div>

      {phase === "lobby" ? (
        <div className="grid flex-1 place-items-center p-4">
          <div className="w-full max-w-md overflow-hidden rounded-xl border bg-secondary/30 shadow-card">
            <div className="aspect-video bg-sidebar p-5 text-sidebar-foreground">
              <div className="grid h-full place-items-center rounded-lg border border-sidebar-border bg-sidebar-accent/20">
                <div className="text-center">
                  <div className="mx-auto grid size-16 place-items-center rounded-2xl bg-primary text-primary-foreground shadow-glow">
                    <Phone className="size-7" />
                  </div>
                  <div className="mt-4 text-lg font-semibold">Входящий созвон</div>
                  <div className="mt-1 text-sm opacity-80">{task.personaName} · {task.personaRole}</div>
                </div>
              </div>
            </div>
            <div className="p-4">
              <div className="mb-3 flex -space-x-2">
                {participants.map((p, i) => (
                  <div
                    key={p.name}
                    className={cn(
                      "grid size-9 place-items-center rounded-full border-2 border-card text-xs font-semibold",
                      VIDEO_BACKGROUNDS[i % VIDEO_BACKGROUNDS.length],
                    )}
                    title={`${p.name} · ${p.role}`}
                  >
                    {initials(p.name)}
                  </div>
                ))}
              </div>
              <Button className="w-full" onClick={startCall}>
                <Phone className="size-4" /> Подключиться
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_280px]">
            <div className="grid min-h-0 grid-rows-[minmax(0,1fr)_auto] gap-3">
              <div className="grid min-h-0 grid-cols-1 gap-3 sm:grid-cols-2">
                {participants.map((participant, i) => {
                  const isPersona = participant.kind === "persona";
                  const isUser = participant.kind === "user";
                  const speech = observerSpeech[participant.name];
                  const speaking = participant.kind === "observer" && !!speech;
                  return (
                    <div
                      key={participant.name}
                      className={cn(
                        "relative min-h-[150px] overflow-hidden rounded-xl border p-3 shadow-card",
                        VIDEO_BACKGROUNDS[i % VIDEO_BACKGROUNDS.length],
                        isPersona && thinking && "ring-2 ring-primary",
                        speaking && "ring-2 ring-success",
                      )}
                    >
                      <div className="absolute left-3 top-3 rounded-md bg-card/85 px-2 py-1 text-xs font-medium shadow-card">
                        {participant.name} · {participant.role}
                      </div>
                      <div className="grid h-full place-items-center pt-8">
                        {cameraOn || !isUser ? (
                          <div className="relative grid size-20 place-items-center rounded-2xl bg-card text-2xl font-bold shadow-card">
                            {initials(participant.name)}
                            {isPersona && thinking && (
                              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-primary text-primary-foreground">
                                <Loader2 className="size-3 animate-spin" />
                              </span>
                            )}
                            {speaking && (
                              <span className="absolute -right-1 -top-1 grid size-5 place-items-center rounded-full bg-success text-white">
                                <Volume2 className="size-3" />
                              </span>
                            )}
                          </div>
                        ) : (
                          <div className="grid size-20 place-items-center rounded-2xl bg-card/80">
                            <CameraOff className="size-8 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                      {speech ? (
                        <div className="absolute bottom-3 left-3 right-3 rounded-md bg-card/90 px-2 py-1.5 text-[11px] leading-snug shadow-card line-clamp-2">
                          {speech}
                        </div>
                      ) : (
                        <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between gap-2">
                          <span className="truncate rounded-md bg-card/85 px-2 py-1 text-xs text-muted-foreground">
                            {participant.mood}
                          </span>
                          {isUser && muted && <MicOff className="size-4 text-destructive" />}
                          {isPersona && <Volume2 className="size-4 text-primary" />}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {captionsOn && (
                <div className="rounded-xl border bg-secondary/50 p-3 text-sm">
                  <div className="mb-1 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <Captions className="size-4" /> Live captions
                  </div>
                  <p className="line-clamp-2">{lastPersonaText || "Подключись к созвону и начни разговор."}</p>
                  {revealed && (
                    <div className="mt-2 inline-flex items-center gap-1 text-xs text-success">
                      <CheckCircle2 className="size-3.5" /> Важная деталь выяснена
                    </div>
                  )}
                </div>
              )}
            </div>

            <aside className="flex min-h-0 flex-col rounded-xl border bg-card shadow-card">
              <div className="flex items-center gap-2 border-b px-3 py-2 text-sm font-semibold">
                <MessageSquare className="size-4" /> Стенограмма
              </div>
              <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
                {turns.map((t, i) => (
                  <div key={i} className="text-sm">
                    <div className="text-xs font-semibold text-muted-foreground">
                      {t.role === "user" ? "Ты" : task.personaName}
                    </div>
                    <div className={cn("mt-1 rounded-lg p-2", t.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary")}>
                      {t.text}
                    </div>
                  </div>
                ))}
                {thinking && (
                  <div className="inline-flex items-center gap-2 rounded-lg bg-secondary px-3 py-2 text-sm text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" /> отвечает…
                  </div>
                )}
              </div>
            </aside>
          </div>

          {error && <div className="mx-3 rounded-lg border border-warning/50 bg-warning/10 px-3 py-2 text-sm">{error}</div>}

          {phase === "talk" ? (
            <div className="border-t p-3">
              <div className="mb-3 flex flex-wrap justify-center gap-2">
                {promptChips.map((prompt) => (
                  <button
                    key={prompt}
                    type="button"
                    onClick={() => setDraft(prompt)}
                    className="rounded-full border bg-secondary/60 px-3 py-1 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                  >
                    {prompt}
                  </button>
                ))}
              </div>
              <div className="mb-3 flex items-center justify-center gap-2">
                <Button type="button" variant={muted ? "destructive" : "secondary"} size="icon" onClick={() => setMuted((v) => !v)}>
                  {muted ? <MicOff className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Button type="button" variant={cameraOn ? "secondary" : "outline"} size="icon" onClick={() => setCameraOn((v) => !v)}>
                  {cameraOn ? <Camera className="size-4" /> : <CameraOff className="size-4" />}
                </Button>
                <Button type="button" variant={recording ? "destructive" : "secondary"} onClick={toggleRecord}>
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />} {recording ? "Стоп" : "Говорить"}
                </Button>
                <Button type="button" variant={captionsOn ? "secondary" : "outline"} size="icon" onClick={() => setCaptionsOn((v) => !v)}>
                  <Captions className="size-4" />
                </Button>
                <Button type="button" variant="secondary" size="icon">
                  <MonitorUp className="size-4" />
                </Button>
                <Button type="button" variant="secondary" size="icon">
                  <Maximize2 className="size-4" />
                </Button>
              </div>

              <div className="flex items-end gap-2">
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Напиши реплику или нажми «Говорить»…"
                  className="min-h-[44px] max-h-24 flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendToPersona(draft);
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={() => void sendToPersona(draft)} disabled={!draft.trim() || thinking}>
                  <Send className="size-4" />
                </Button>
                <Button variant="destructive" onClick={() => setPhase("answer")}>
                  <PhoneOff className="size-4" /> Завершить
                </Button>
              </div>
            </div>
          ) : (
            <div className="border-t p-3 space-y-3">
              <div className="rounded-lg bg-secondary/60 p-3 text-sm">
                <div className="font-semibold mb-1">Открытый вопрос после созвона</div>
                {task.openQuestion}
              </div>
              <div className="flex items-end gap-2">
                <Button type="button" variant={recording ? "destructive" : "secondary"} size="icon" onClick={toggleRecord}>
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Сформулируй итоговый ответ…"
                  className="min-h-[80px] flex-1 resize-none"
                />
              </div>

              {result && !result.passed && !forceReveal && (
                <div className="rounded-lg border border-warning/50 bg-warning/10 p-3 text-sm">
                  <div className="font-medium">Подсказка</div>
                  <p className="mt-1">{result.guidingQuestion || result.feedback}</p>
                  <AppealButton
                    context={{
                      lessonId,
                      taskType: "call",
                      attemptNumber: Math.max(1, hintCount),
                      studentInput: answer,
                      systemFeedback: JSON.stringify(result),
                      callTranscript: turns.map((t) => ({ role: t.role, text: t.text })),
                    }}
                  />
                </div>
              )}

              {forceReveal && (
                <div className="rounded-lg border bg-secondary/60 p-3 text-sm">
                  <div className="font-semibold">Разбор</div>
                  <p className="mt-1 text-muted-foreground">{result?.feedback}</p>
                  <p className="mt-2">Нужно было услышать: {task.hiddenInfo}</p>
                  <Button className="mt-3 w-full" onClick={() => onComplete("solved_with_help", answer)}>
                    Понятно, дальше
                  </Button>
                </div>
              )}

              {!forceReveal && (
                <Button className="w-full" onClick={submitAnswer} disabled={grading || !answer.trim()}>
                  {grading && <Loader2 className="size-4 animate-spin" />} Отправить ответ
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
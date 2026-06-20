import { useCallback, useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { callReply, gradeWritten, type GradeResult } from "@/lib/course/grading.functions";
import type { CallTask } from "@/lib/course";
import { Mic, Square, Phone, PhoneOff, Loader2, Send, Volume2 } from "lucide-react";
import { cn } from "@/lib/utils";

type Turn = { role: "user" | "persona"; text: string };

export function CallPanel({
  task,
  onComplete,
}: {
  task: CallTask;
  onComplete: (status: "solved_self" | "solved_with_help", answer: string) => void;
}) {
  const reply = useServerFn(callReply);
  const grade = useServerFn(gradeWritten);

  const [connected, setConnected] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);
  const [revealed, setRevealed] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [recording, setRecording] = useState(false);
  const [draft, setDraft] = useState("");
  const [phase, setPhase] = useState<"talk" | "answer">("talk");
  const [answer, setAnswer] = useState("");
  const [hintCount, setHintCount] = useState(0);
  const [result, setResult] = useState<GradeResult | null>(null);
  const [grading, setGrading] = useState(false);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

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
      /* ignore playback errors */
    }
  }, []);

  const sendToPersona = useCallback(
    async (text: string) => {
      if (!text.trim()) return;
      const history = turns.map((t) => ({ role: t.role, text: t.text }));
      setTurns((prev) => [...prev, { role: "user", text }]);
      setDraft("");
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
            userMessage: text,
          },
        })) as { reply: string; revealed: boolean };
        setTurns((prev) => [...prev, { role: "persona", text: out.reply }]);
        if (out.revealed) setRevealed(true);
        void speak(out.reply);
      } finally {
        setThinking(false);
      }
    },
    [reply, task, turns, speak],
  );

  async function startCall() {
    setConnected(true);
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
          history: [],
          userMessage: "Здравствуйте! Это PM. Давайте обсудим ситуацию.",
        },
      })) as { reply: string; revealed: boolean };
      setTurns([{ role: "persona", text: out.reply }]);
      void speak(out.reply);
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
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = ["audio/webm", "audio/mp4"].find((t) => MediaRecorder.isTypeSupported(t)) || "audio/webm";
      const rec = new MediaRecorder(stream, { mimeType: mime });
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: rec.mimeType });
        if (blob.size < 1024) return;
        const form = new FormData();
        form.append("audio", blob, "rec.webm");
        setThinking(true);
        try {
          const res = await fetch("/api/transcribe", { method: "POST", body: form });
          const json = await res.json().catch(() => null);
          const text = json?.text?.trim();
          if (text) {
            if (phase === "answer") setAnswer((a) => (a ? a + " " : "") + text);
            else await sendToPersona(text);
          }
        } finally {
          setThinking(false);
        }
      };
      recorderRef.current = rec;
      rec.start();
      setRecording(true);
    } catch {
      /* mic denied */
    }
  }

  async function submitAnswer() {
    if (!answer.trim()) return;
    setGrading(true);
    try {
      const res = (await grade({
        data: { prompt: task.openQuestion, criteria: task.criteria, answer },
      })) as GradeResult;
      setResult(res);
      if (res.passed) {
        onComplete(hintCount > 0 ? "solved_with_help" : "solved_self", answer);
      } else {
        setHintCount((c) => c + 1);
      }
    } finally {
      setGrading(false);
    }
  }

  const maxHints = 2;
  const forceReveal = hintCount > maxHints;

  return (
    <div className="flex flex-col h-full">
      <audio ref={audioRef} className="hidden" />
      {/* Call header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b bg-secondary/40">
        <div className="size-10 rounded-full bg-gradient-primary grid place-items-center text-white font-semibold">
          {task.personaName[0]}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-sm">{task.personaName}</div>
          <div className="text-xs text-muted-foreground">{task.personaRole}</div>
        </div>
        {connected && (
          <span className="text-xs text-emerald-600 inline-flex items-center gap-1">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" /> На связи
          </span>
        )}
      </div>

      {!connected ? (
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">{task.brief}</p>
            <Button className="mt-5" onClick={startCall}>
              <Phone className="size-4" /> Принять звонок
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[200px] max-h-[40vh]">
            {turns.map((t, i) => (
              <div key={i} className={cn("flex", t.role === "user" ? "justify-end" : "justify-start")}>
                <div
                  className={cn(
                    "max-w-[80%] rounded-2xl px-3.5 py-2 text-sm",
                    t.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary",
                  )}
                >
                  {t.role === "persona" && (
                    <button
                      type="button"
                      onClick={() => void speak(t.text)}
                      className="float-right ml-2 text-muted-foreground hover:text-foreground"
                      aria-label="Озвучить"
                    >
                      <Volume2 className="size-3.5" />
                    </button>
                  )}
                  {t.text}
                </div>
              </div>
            ))}
            {thinking && (
              <div className="flex justify-start">
                <div className="rounded-2xl px-3.5 py-2 bg-secondary text-sm text-muted-foreground inline-flex items-center gap-2">
                  <Loader2 className="size-3.5 animate-spin" /> …
                </div>
              </div>
            )}
          </div>

          {phase === "talk" ? (
            <div className="border-t p-3 space-y-2">
              {revealed && (
                <div className="text-[11px] text-emerald-600">✓ Похоже, ты узнал важную деталь в разговоре.</div>
              )}
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant={recording ? "destructive" : "secondary"}
                  size="icon"
                  onClick={toggleRecord}
                  aria-label={recording ? "Остановить запись" : "Говорить"}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Скажи или напиши свой вопрос…"
                  className="min-h-[44px] max-h-28 flex-1 resize-none"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      void sendToPersona(draft);
                    }
                  }}
                />
                <Button type="button" size="icon" onClick={() => void sendToPersona(draft)} disabled={!draft.trim()}>
                  <Send className="size-4" />
                </Button>
              </div>
              <Button variant="outline" className="w-full" onClick={() => setPhase("answer")}>
                <PhoneOff className="size-4" /> Завершить звонок и ответить на вопрос
              </Button>
            </div>
          ) : (
            <div className="border-t p-3 space-y-3">
              <div className="rounded-lg bg-secondary/60 p-3 text-sm">
                <div className="font-semibold mb-1">Открытый вопрос</div>
                {task.openQuestion}
              </div>
              <div className="flex items-end gap-2">
                <Button
                  type="button"
                  variant={recording ? "destructive" : "secondary"}
                  size="icon"
                  onClick={toggleRecord}
                >
                  {recording ? <Square className="size-4" /> : <Mic className="size-4" />}
                </Button>
                <Textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Твой ответ на открытый вопрос…"
                  className="min-h-[80px] flex-1 resize-none"
                />
              </div>

              {result && !result.passed && !forceReveal && (
                <div className="rounded-lg border border-amber-300/50 bg-amber-50 dark:bg-amber-950/30 p-3 text-sm">
                  <div className="font-medium text-amber-700 dark:text-amber-400">Подсказка</div>
                  <p className="mt-1">{result.guidingQuestion || result.feedback}</p>
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

import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { LESSONS } from "@/lib/course";
import { GraduationCap, ArrowRight, BookOpen, Phone, Brain } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Симулятор проектного менеджера в IT — Практический курс" },
      {
        name: "description",
        content:
          "Практический симулятор проектного менеджера в IT: теория, квизы, расчёты, кейсы, письменные задания и голосовые звонки с AI-персонажами. Учись управлять IT-проектами на практике.",
      },
      { property: "og:title", content: "Симулятор проектного менеджера в IT — Практический курс" },
      { property: "og:description", content: "Практический курс-симулятор проектного менеджмента в IT с AI-проверкой заданий." },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-gradient-subtle">
      <header className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
            <GraduationCap className="size-4 text-white" />
          </div>
          <span className="font-bold">PM Симулятор</span>
        </div>
        <Link to="/auth">
          <Button size="sm" variant="outline">Войти</Button>
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4">
        <section className="py-14 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1 text-xs">
            <Brain className="size-3.5" /> {LESSONS.length} уроков · проверка через AI
          </div>
          <h1 className="mt-5 text-3xl md:text-5xl font-bold tracking-tight">
            Введение в проектный менеджмент в IT
          </h1>
          <p className="mt-4 text-muted-foreground max-w-2xl mx-auto text-lg">
            Каждый урок: короткая теория и 5 практических заданий — квиз, расчёт, кейс, письменное задание
            и голосовой звонок с AI-персонажем. Подсказки вместо готовых ответов.
          </p>
          <div className="mt-7 flex justify-center gap-3">
            <Link to="/course">
              <Button size="lg">
                Начать курс <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-3 pb-16">
          {[
            { icon: BookOpen, title: "Теория + практика", text: "Все задания решаются только на основе теории текущего урока." },
            { icon: Brain, title: "Индивидуальный фидбек", text: "AI проверяет письменные задания по чек-листу критериев и даёт подсказки." },
            { icon: Phone, title: "Голосовые звонки", text: "Поговори с AI-персонажем, узнай скрытую информацию и ответь на открытый вопрос." },
          ].map((f) => (
            <div key={f.title} className="rounded-xl border bg-card p-5 shadow-card">
              <div className="size-10 rounded-lg bg-primary/10 grid place-items-center text-primary">
                <f.icon className="size-5" />
              </div>
              <div className="mt-3 font-semibold">{f.title}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.text}</p>
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

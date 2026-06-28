import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { studentLogin, setStudent, getStudent } from "@/lib/student/session";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { GraduationCap, Loader2, Send } from "lucide-react";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Вход — PM Симулятор" },
      { name: "description", content: "Войдите по нику Telegram и имени, чтобы проходить тесты и офис-симулятор." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (getStudent()) navigate({ to: "/app" });
  }, [navigate]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const session = await studentLogin(name.trim(), telegram.trim());
      if (!session) {
        setError("Студент с таким ником не найден. Обратитесь к администратору, чтобы вас добавили.");
        return;
      }
      setStudent(session);
      navigate({ to: "/app" });
    } catch {
      setError("Не удалось войти. Попробуйте ещё раз.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center bg-gradient-subtle px-4">
      <div className="w-full max-w-sm">
        <Link to="/" className="flex items-center justify-center gap-2 mb-6">
          <div className="size-10 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
            <GraduationCap className="size-5 text-white" />
          </div>
          <span className="text-lg font-bold">PM Симулятор</span>
        </Link>

        <div className="rounded-2xl border bg-card p-6 shadow-card">
          <h1 className="text-xl font-bold text-center">Вход для студентов</h1>
          <p className="text-sm text-muted-foreground text-center mt-1">
            Введите имя и ник Telegram, которые вам выдал администратор.
          </p>

          <form onSubmit={handleSubmit} className="mt-5 space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="name">Имя</Label>
              <Input id="name" required value={name} onChange={(e) => setName(e.target.value)} placeholder="Алекс" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="telegram">Ник в Telegram</Label>
              <div className="relative">
                <Send className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="telegram"
                  required
                  value={telegram}
                  onChange={(e) => setTelegram(e.target.value)}
                  placeholder="@username"
                  className="pl-9"
                />
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="size-4 animate-spin" />}
              Войти
            </Button>
          </form>

          <p className="mt-5 text-center text-xs text-muted-foreground">
            Администратор?{" "}
            <Link to="/auth" className="font-medium text-primary hover:underline">
              Вход в админку
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

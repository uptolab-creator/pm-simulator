import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getAdminStatus, claimAdmin } from "@/lib/admin/admin.functions";
import { AdminOverview } from "@/components/admin/AdminOverview";
import { AdminLessons } from "@/components/admin/AdminLessons";
import { AdminCallLogs } from "@/components/admin/AdminCallLogs";
import { AdminStudents } from "@/components/admin/AdminStudents";
import { LayoutDashboard, BookOpen, PhoneCall, ShieldCheck, ArrowLeft, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Админ-панель — PM Симулятор" }] }),
  component: AdminPage,
});

function AdminPage() {
  const fetchStatus = useServerFn(getAdminStatus);
  const claim = useServerFn(claimAdmin);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-status"],
    queryFn: () => fetchStatus() as Promise<{ isAdmin: boolean; adminCount: number }>,
  });

  if (isLoading) {
    return <div className="min-h-screen grid place-items-center text-muted-foreground">Загрузка…</div>;
  }

  if (!data?.isAdmin) {
    return (
      <div className="min-h-screen grid place-items-center p-6">
        <div className="max-w-md w-full rounded-xl border bg-card p-6 text-center space-y-4">
          <ShieldCheck className="size-10 mx-auto text-primary" />
          <h1 className="text-xl font-bold">Доступ только для администраторов</h1>
          {data?.adminCount === 0 ? (
            <>
              <p className="text-sm text-muted-foreground">
                Администратор ещё не назначен. Вы можете стать первым администратором этого симулятора.
              </p>
              <Button
                onClick={async () => {
                  try {
                    await claim();
                    toast.success("Вы стали администратором");
                    refetch();
                  } catch (e: any) {
                    toast.error(e?.message ?? "Не удалось");
                  }
                }}
              >
                Стать администратором
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">
              У вас нет прав администратора. Обратитесь к владельцу курса.
            </p>
          )}
          <Link to="/app" className="block text-sm text-primary hover:underline">
            ← На главную
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-9 rounded-lg bg-primary grid place-items-center">
              <LayoutDashboard className="size-4 text-primary-foreground" />
            </div>
            <div className="leading-tight">
              <div className="font-bold text-sm">Админ-панель</div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                Контроль симулятора PM
              </div>
            </div>
          </div>
          <Button asChild variant="ghost" size="sm">
            <Link to="/app">
              <ArrowLeft className="size-4" /> Назад
            </Link>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-6">
        <Tabs defaultValue="overview">
          <TabsList className="mb-6">
            <TabsTrigger value="overview">
              <LayoutDashboard className="size-4" /> Общая аналитика
            </TabsTrigger>
            <TabsTrigger value="lessons">
              <BookOpen className="size-4" /> Аналитика по урокам
            </TabsTrigger>
            <TabsTrigger value="students">
              <Users className="size-4" /> Студенты
            </TabsTrigger>
            <TabsTrigger value="calls">
              <PhoneCall className="size-4" /> AI-проверки и звонки
            </TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <AdminOverview />
          </TabsContent>
          <TabsContent value="lessons">
            <AdminLessons />
          </TabsContent>
          <TabsContent value="students">
            <AdminStudents />
          </TabsContent>
          <TabsContent value="calls">
            <AdminCallLogs />
          </TabsContent>

        </Tabs>
      </main>
    </div>
  );
}

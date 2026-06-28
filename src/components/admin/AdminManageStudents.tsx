import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  listManagedStudents,
  addManagedStudent,
  removeManagedStudent,
  type ManagedStudent,
} from "@/lib/admin/admin.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Loader2, Send } from "lucide-react";
import { toast } from "sonner";

export function AdminManageStudents() {
  const fetchList = useServerFn(listManagedStudents);
  const add = useServerFn(addManagedStudent);
  const remove = useServerFn(removeManagedStudent);

  const [name, setName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saving, setSaving] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["managed-students"],
    queryFn: () => fetchList() as Promise<ManagedStudent[]>,
  });

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !telegram.trim()) return;
    setSaving(true);
    try {
      const res = (await add({ data: { name: name.trim(), telegram: telegram.trim() } })) as { updated: boolean };
      toast.success(res.updated ? "Студент обновлён" : "Студент добавлен");
      setName("");
      setTelegram("");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Не удалось добавить");
    } finally {
      setSaving(false);
    }
  }

  async function handleRemove(id: string) {
    try {
      await remove({ data: { id } });
      toast.success("Студент удалён");
      refetch();
    } catch (err: any) {
      toast.error(err?.message ?? "Не удалось удалить");
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <div className="rounded-xl border bg-card p-5 h-fit">
        <div className="flex items-center gap-2 font-semibold">
          <UserPlus className="size-4 text-primary" /> Добавить студента
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Студент войдёт по этим имени и нику Telegram на странице входа.
        </p>
        <form onSubmit={handleAdd} className="mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="s-name">Имя</Label>
            <Input id="s-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Алекс" />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="s-tg">Ник в Telegram</Label>
            <div className="relative">
              <Send className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="s-tg"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="@username"
                className="pl-9"
              />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin" />}
            Добавить
          </Button>
        </form>
      </div>

      <div className="rounded-xl border bg-card overflow-hidden">
        <div className="border-b px-5 py-3 font-semibold text-sm">
          Студенты {data ? `(${data.length})` : ""}
        </div>
        {isLoading ? (
          <div className="grid place-items-center py-12 text-muted-foreground">
            <Loader2 className="size-5 animate-spin" />
          </div>
        ) : !data?.length ? (
          <p className="px-5 py-12 text-center text-sm text-muted-foreground">Студентов пока нет.</p>
        ) : (
          <div className="divide-y">
            {data.map((s) => (
              <div key={s.id} className="flex items-center gap-3 px-5 py-3">
                <div className="size-9 shrink-0 rounded-full bg-secondary grid place-items-center text-sm font-bold">
                  {s.name.slice(0, 1).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-medium text-sm truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground truncate">@{s.telegram.replace(/^@/, "")}</div>
                </div>
                <div className="text-xs text-muted-foreground shrink-0 text-right">
                  <div>Тесты: {s.lessonsCompleted}</div>
                  <div>Офис: {s.officeCompleted}</div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0 text-destructive" onClick={() => handleRemove(s.id)}>
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

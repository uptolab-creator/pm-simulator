import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { LESSONS } from "@/lib/course";

// ---------- shared types ----------
export interface KpiOverview {
  totalUsers: number;
  dau: number;
  wau: number;
  mau: number;
  retention: number; // % from lesson 1 to lesson 26
  startedUsers: number;
  completedUsers: number;
  avgLessonMinutes: number;
  solvedSelfPct: number;
  solvedWithHelpPct: number;
  failedPct: number;
  totalAttempts: number;
  avgAttemptsPerUser: number;
  totalAppeals: number;
  openAppeals: number;
  lessonsInTrouble: number; // red lessons
  avgCompletionPct: number; // avg per-user share of 26 lessons completed
}

export interface ActivityPoint {
  date: string;
  active: number;
  attempts: number;
}

export interface FunnelStep {
  number: number;
  lessonId: string;
  title: string;
  started: number;
  completed: number;
  dropPct: number;
}

export interface TaskTypeStat {
  type: string;
  attempts: number;
  uniqueUsers: number;
  avgAttempts: number;
  solvedSelf: number;
  solvedWithHelp: number;
  failed: number;
  reached3Pct: number; // difficulty driver
}

export interface LessonStat {
  number: number;
  lessonId: string;
  title: string;
  started: number;
  completed: number;
  avgAttempts: number;
  reached3Pct: number; // Content Difficulty Index basis
  difficulty: "green" | "yellow" | "red";
  taskTypes: TaskTypeStat[];
}

export interface AdminAnalytics {
  overview: KpiOverview;
  activity: ActivityPoint[];
  funnel: FunnelStep[];
  lessons: LessonStat[];
  taskTypeBreakdown: TaskTypeStat[];
}

export interface StudentStat {
  userId: string;
  name: string;
  lessonsStarted: number;
  lessonsCompleted: number;
  completionPct: number;
  attempts: number;
  avgAttempts: number;
  solvedSelf: number;
  solvedWithHelp: number;
  failed: number;
  appeals: number;
  lastActive: string | null;
  status: "active" | "stuck" | "idle" | "done";
}

type AttemptRow = {
  user_id: string;
  lesson_id: string;
  task_type: string;
  attempt_no: number;
  status: string;
  score: number | null;
  created_at: string;
  override_status: string | null;
};
type ProgressRow = {
  user_id: string;
  lesson_id: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  updated_at: string;
};

// ---------- admin guard ----------
async function isAdminUser(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("user_roles")
    .select("id")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error("Не удалось проверить права администратора");
  return !!data;
}

async function assertAdmin(userId: string) {
  if (!(await isAdminUser(userId))) throw new Error("Forbidden: требуются права администратора");
}

// ---------- status / bootstrap ----------
export const getAdminStatus = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    const isAdmin = await isAdminUser(context.userId);
    return { isAdmin, adminCount: count ?? 0 };
  });

/** Bootstrap: первый пользователь может стать админом, пока админов нет. */
export const claimAdmin = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { count } = await supabaseAdmin
      .from("user_roles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin");
    if ((count ?? 0) > 0) throw new Error("Администратор уже назначен");
    const { error } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (error) throw error;
    return { ok: true };
  });

// ---------- analytics ----------
const DAY = 24 * 60 * 60 * 1000;

export const getAdminAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminAnalytics> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: attemptsRaw }, { data: progressRaw }, { data: appealsAgg }] = await Promise.all([
      supabaseAdmin
        .from("task_attempts")
        .select("user_id, lesson_id, task_type, attempt_no, status, score, created_at, override_status"),
      supabaseAdmin
        .from("lesson_progress")
        .select("user_id, lesson_id, status, started_at, completed_at, updated_at"),
      supabaseAdmin.from("appeals").select("status"),
    ]);
    const attempts = (attemptsRaw ?? []) as AttemptRow[];
    const progress = (progressRaw ?? []) as ProgressRow[];
    const appeals = (appealsAgg ?? []) as { status: string }[];

    const now = Date.now();
    const activeIn = (ms: number) => {
      const s = new Set<string>();
      for (const a of attempts) if (now - new Date(a.created_at).getTime() <= ms) s.add(a.user_id);
      for (const p of progress) if (now - new Date(p.updated_at).getTime() <= ms) s.add(p.user_id);
      return s.size;
    };

    const allUsers = new Set<string>();
    progress.forEach((p) => allUsers.add(p.user_id));
    attempts.forEach((a) => allUsers.add(a.user_id));

    // status distribution (effective status uses override if present)
    const eff = (a: AttemptRow) => a.override_status ?? a.status;
    let self = 0,
      help = 0,
      failed = 0;
    for (const a of attempts) {
      const s = eff(a);
      if (s === "solved_self") self++;
      else if (s === "solved_with_help") help++;
      else if (s === "failed") failed++;
    }
    const graded = self + help + failed || 1;

    // avg lesson minutes
    const durations: number[] = [];
    for (const p of progress) {
      if (p.status === "completed" && p.completed_at) {
        const d = new Date(p.completed_at).getTime() - new Date(p.started_at).getTime();
        if (d > 0 && d < 12 * 60 * 60 * 1000) durations.push(d / 60000);
      }
    }
    const avgLessonMinutes = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : 0;

    // retention lesson1 -> lesson26
    const firstId = LESSONS[0]?.id;
    const lastId = LESSONS[LESSONS.length - 1]?.id;
    const startedSet = new Set(progress.filter((p) => p.lesson_id === firstId).map((p) => p.user_id));
    const completedLastSet = new Set(
      progress.filter((p) => p.lesson_id === lastId && p.status === "completed").map((p) => p.user_id),
    );
    const retention = startedSet.size ? Math.round((completedLastSet.size / startedSet.size) * 100) : 0;

    const totalAttempts = attempts.length;
    const attemptUsers = new Set(attempts.map((a) => a.user_id));
    const avgAttemptsPerUser = attemptUsers.size
      ? Math.round((totalAttempts / attemptUsers.size) * 10) / 10
      : 0;
    const openAppeals = appeals.filter((a) => a.status === "pending").length;

    // avg per-user completion share of all lessons
    const completedByUser = new Map<string, number>();
    for (const p of progress) {
      if (p.status === "completed") {
        completedByUser.set(p.user_id, (completedByUser.get(p.user_id) ?? 0) + 1);
      }
    }
    const compShares = [...allUsers].map(
      (u) => (completedByUser.get(u) ?? 0) / (LESSONS.length || 1),
    );
    const avgCompletionPct = compShares.length
      ? Math.round((compShares.reduce((a, b) => a + b, 0) / compShares.length) * 100)
      : 0;

    const overview: KpiOverview = {
      totalUsers: allUsers.size,
      dau: activeIn(DAY),
      wau: activeIn(7 * DAY),
      mau: activeIn(30 * DAY),
      retention,
      startedUsers: startedSet.size,
      completedUsers: completedLastSet.size,
      avgLessonMinutes,
      solvedSelfPct: Math.round((self / graded) * 100),
      solvedWithHelpPct: Math.round((help / graded) * 100),
      failedPct: Math.round((failed / graded) * 100),
      totalAttempts,
      avgAttemptsPerUser,
      totalAppeals: appeals.length,
      openAppeals,
      lessonsInTrouble: 0, // filled after lessons computed
      avgCompletionPct,
    };

    // activity last 30 days
    const activity: ActivityPoint[] = [];
    const byDayUsers = new Map<string, Set<string>>();
    const byDayAttempts = new Map<string, number>();
    for (const a of attempts) {
      const key = a.created_at.slice(0, 10);
      if (!byDayUsers.has(key)) byDayUsers.set(key, new Set());
      byDayUsers.get(key)!.add(a.user_id);
      byDayAttempts.set(key, (byDayAttempts.get(key) ?? 0) + 1);
    }
    for (let i = 29; i >= 0; i--) {
      const key = new Date(now - i * DAY).toISOString().slice(0, 10);
      activity.push({
        date: key.slice(5),
        active: byDayUsers.get(key)?.size ?? 0,
        attempts: byDayAttempts.get(key) ?? 0,
      });
    }

    // per-lesson aggregation
    const lessons: LessonStat[] = LESSONS.map((lesson) => {
      const lProg = progress.filter((p) => p.lesson_id === lesson.id);
      const started = new Set(lProg.map((p) => p.user_id)).size;
      const completed = new Set(
        lProg.filter((p) => p.status === "completed").map((p) => p.user_id),
      ).size;
      const lAttempts = attempts.filter((a) => a.lesson_id === lesson.id);

      const types = ["quiz", "calculation", "case_choice", "written", "call"];
      const taskTypes: TaskTypeStat[] = types
        .map((t) => statForTaskType(lAttempts.filter((a) => a.task_type === t), t))
        .filter((s) => s.attempts > 0);

      // difficulty: % of users reaching 3rd attempt on any task in the lesson
      const reached3Users = new Set(lAttempts.filter((a) => a.attempt_no >= 3).map((a) => a.user_id));
      const triedUsers = new Set(lAttempts.map((a) => a.user_id));
      const reached3Pct = triedUsers.size
        ? Math.round((reached3Users.size / triedUsers.size) * 100)
        : 0;
      const avgAttempts = taskTypes.length
        ? Math.round((taskTypes.reduce((s, t) => s + t.avgAttempts, 0) / taskTypes.length) * 10) / 10
        : 0;

      return {
        number: lesson.number,
        lessonId: lesson.id,
        title: lesson.title,
        started,
        completed,
        avgAttempts,
        reached3Pct,
        difficulty: reached3Pct >= 40 ? "red" : reached3Pct >= 20 ? "yellow" : "green",
        taskTypes,
      };
    });

    overview.lessonsInTrouble = lessons.filter((l) => l.difficulty === "red").length;

    // aggregate task-type breakdown across all lessons
    const TYPES = ["quiz", "calculation", "case_choice", "written", "call"];
    const taskTypeBreakdown: TaskTypeStat[] = TYPES.map((t) =>
      statForTaskType(attempts.filter((a) => a.task_type === t), t),
    ).filter((s) => s.attempts > 0);

    return { overview, activity, funnel: buildFunnel(progress), lessons, taskTypeBreakdown };
  });

function statForTaskType(rows: AttemptRow[], type: string): TaskTypeStat {
  const eff = (a: AttemptRow) => a.override_status ?? a.status;
  const users = new Set(rows.map((r) => r.user_id));
  // max attempt_no per user
  const maxByUser = new Map<string, number>();
  rows.forEach((r) => maxByUser.set(r.user_id, Math.max(maxByUser.get(r.user_id) ?? 0, r.attempt_no)));
  const reached3 = [...maxByUser.values()].filter((n) => n >= 3).length;
  const avgAttempts = maxByUser.size
    ? Math.round(([...maxByUser.values()].reduce((a, b) => a + b, 0) / maxByUser.size) * 10) / 10
    : 0;
  let self = 0,
    help = 0,
    failed = 0;
  for (const r of rows) {
    const s = eff(r);
    if (s === "solved_self") self++;
    else if (s === "solved_with_help") help++;
    else if (s === "failed") failed++;
  }
  return {
    type,
    attempts: rows.length,
    uniqueUsers: users.size,
    avgAttempts,
    solvedSelf: self,
    solvedWithHelp: help,
    failed,
    reached3Pct: maxByUser.size ? Math.round((reached3 / maxByUser.size) * 100) : 0,
  };
}

function buildFunnel(progress: ProgressRow[]): FunnelStep[] {
  return LESSONS.map((lesson) => {
    const rows = progress.filter((p) => p.lesson_id === lesson.id);
    const started = new Set(rows.map((p) => p.user_id)).size;
    const completed = new Set(rows.filter((p) => p.status === "completed").map((p) => p.user_id)).size;
    return {
      number: lesson.number,
      lessonId: lesson.id,
      title: lesson.title,
      started,
      completed,
      dropPct: started ? Math.round(((started - completed) / started) * 100) : 0,
    };
  });
}

// ---------- call logs ----------
const CallFilter = z.object({
  lessonId: z.string().optional(),
  onlyNegative: z.boolean().optional().default(false),
  onlyLowScore: z.boolean().optional().default(false),
  search: z.string().optional().default(""),
});

export interface CallLog {
  id: string;
  source: "appeal" | "attempt";
  userId: string;
  lessonId: string;
  lessonTitle: string;
  personaName: string;
  personaRole: string;
  score: number | null;
  status: string;
  feedback: string | null;
  transcript: { role: string; text: string }[];
  createdAt: string;
  appealText?: string | null;
  resolution?: string | null;
}

export const getCallLogs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => CallFilter.parse(d))
  .handler(async ({ data, context }): Promise<CallLog[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const lessonMeta = (id: string) => LESSONS.find((l) => l.id === id);
    const callInfo = (id: string) => {
      const t = lessonMeta(id)?.tasks.find((tk) => tk.type === "call") as
        | { personaName: string; personaRole: string }
        | undefined;
      return { name: t?.personaName ?? "—", role: t?.personaRole ?? "AI-персонаж" };
    };

    const [{ data: appealsRaw }, { data: attemptsRaw }] = await Promise.all([
      supabaseAdmin
        .from("appeals")
        .select(
          "id, user_id, lesson_id, task_type, system_feedback, call_transcript, complaint_text, status, admin_resolution, created_at",
        )
        .order("created_at", { ascending: false }),
      supabaseAdmin
        .from("task_attempts")
        .select("id, user_id, lesson_id, task_type, status, score, ai_feedback, created_at, override_status, override_note")
        .eq("task_type", "call")
        .order("created_at", { ascending: false }),
    ]);

    const logs: CallLog[] = [];

    for (const a of (appealsRaw ?? []) as any[]) {
      if (a.task_type !== "call") continue;
      const info = callInfo(a.lesson_id);
      logs.push({
        id: a.id,
        source: "appeal",
        userId: a.user_id,
        lessonId: a.lesson_id,
        lessonTitle: lessonMeta(a.lesson_id)?.title ?? a.lesson_id,
        personaName: info.name,
        personaRole: info.role,
        score: null,
        status: a.status,
        feedback: a.system_feedback,
        transcript: Array.isArray(a.call_transcript) ? a.call_transcript : [],
        createdAt: a.created_at,
        appealText: a.complaint_text,
        resolution: a.admin_resolution,
      });
    }

    for (const t of (attemptsRaw ?? []) as any[]) {
      const info = callInfo(t.lesson_id);
      const fb = t.ai_feedback;
      const feedback =
        typeof fb === "string" ? fb : fb && typeof fb === "object" ? (fb.feedback ?? JSON.stringify(fb)) : null;
      const transcript = fb && typeof fb === "object" && Array.isArray(fb.transcript) ? fb.transcript : [];
      logs.push({
        id: t.id,
        source: "attempt",
        userId: t.user_id,
        lessonId: t.lesson_id,
        lessonTitle: lessonMeta(t.lesson_id)?.title ?? t.lesson_id,
        personaName: info.name,
        personaRole: info.role,
        score: t.score,
        status: t.override_status ?? t.status,
        feedback,
        transcript,
        createdAt: t.created_at,
        resolution: t.override_note,
      });
    }

    let filtered = logs;
    if (data.lessonId) filtered = filtered.filter((l) => l.lessonId === data.lessonId);
    if (data.onlyLowScore) filtered = filtered.filter((l) => (l.score ?? 100) < 50);
    if (data.onlyNegative)
      filtered = filtered.filter(
        (l) => l.status === "failed" || l.source === "appeal" || (l.score ?? 100) < 50,
      );
    if (data.search) {
      const q = data.search.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.personaName.toLowerCase().includes(q) ||
          l.personaRole.toLowerCase().includes(q) ||
          l.lessonTitle.toLowerCase().includes(q),
      );
    }
    filtered.sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
    return filtered.slice(0, 200);
  });

// ---------- overrule / resolve ----------
const OverruleInput = z.object({
  attemptId: z.string().uuid(),
  status: z.enum(["solved_self", "solved_with_help", "failed"]),
  score: z.number().int().min(0).max(100).optional(),
  note: z.string().max(2000).optional().default(""),
});

export const overruleAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OverruleInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("task_attempts")
      .update({
        override_status: data.status,
        override_score: data.score ?? null,
        override_note: data.note || null,
        overridden_by: context.userId,
        overridden_at: new Date().toISOString(),
      })
      .eq("id", data.attemptId);
    if (error) throw error;
    return { ok: true };
  });

const ResolveInput = z.object({
  appealId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
  resolution: z.string().max(2000).optional().default(""),
});

export const resolveAppeal = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => ResolveInput.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("appeals")
      .update({
        status: data.status,
        admin_resolution: data.resolution || null,
        resolved_by: context.userId,
        resolved_at: new Date().toISOString(),
      })
      .eq("id", data.appealId);
    if (error) throw error;
    return { ok: true };
  });

// fetch appeals list for moderation panel
export const getAppeals = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("appeals")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    if (error) throw error;
    const withTitle = (data ?? []).map((a: any) => ({
      ...a,
      lessonTitle: LESSONS.find((l) => l.id === a.lesson_id)?.title ?? a.lesson_id,
    }));
    return withTitle;
  });

// ---------- per-student analytics ----------
export const getStudents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<StudentStat[]> => {
    await assertAdmin(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: profilesRaw }, { data: attemptsRaw }, { data: progressRaw }, { data: appealsRaw }] =
      await Promise.all([
        supabaseAdmin.from("profiles").select("id, display_name"),
        supabaseAdmin
          .from("task_attempts")
          .select("user_id, status, attempt_no, override_status, created_at"),
        supabaseAdmin
          .from("lesson_progress")
          .select("user_id, status, updated_at"),
        supabaseAdmin.from("appeals").select("user_id"),
      ]);

    const profiles = (profilesRaw ?? []) as { id: string; display_name: string | null }[];
    const attempts = (attemptsRaw ?? []) as {
      user_id: string;
      status: string;
      attempt_no: number;
      override_status: string | null;
      created_at: string;
    }[];
    const progress = (progressRaw ?? []) as {
      user_id: string;
      status: string;
      updated_at: string;
    }[];
    const appeals = (appealsRaw ?? []) as { user_id: string }[];

    const ids = new Set<string>();
    profiles.forEach((p) => ids.add(p.id));
    attempts.forEach((a) => ids.add(a.user_id));
    progress.forEach((p) => ids.add(p.user_id));

    const nameOf = (id: string) =>
      profiles.find((p) => p.id === id)?.display_name || `${id.slice(0, 8)}…`;
    const now = Date.now();
    const DAYMS = 24 * 60 * 60 * 1000;

    const out: StudentStat[] = [...ids].map((id) => {
      const uAtt = attempts.filter((a) => a.user_id === id);
      const uProg = progress.filter((p) => p.user_id === id);
      const eff = (a: (typeof attempts)[number]) => a.override_status ?? a.status;
      let self = 0,
        help = 0,
        failed = 0;
      uAtt.forEach((a) => {
        const s = eff(a);
        if (s === "solved_self") self++;
        else if (s === "solved_with_help") help++;
        else if (s === "failed") failed++;
      });
      const lessonsStarted = uProg.length;
      const lessonsCompleted = uProg.filter((p) => p.status === "completed").length;
      const completionPct = Math.round((lessonsCompleted / (LESSONS.length || 1)) * 100);
      const lastActiveMs = Math.max(
        0,
        ...uAtt.map((a) => new Date(a.created_at).getTime()),
        ...uProg.map((p) => new Date(p.updated_at).getTime()),
      );
      const lastActive = lastActiveMs ? new Date(lastActiveMs).toISOString() : null;
      const stuck = uAtt.some((a) => a.attempt_no >= 3 && eff(a) !== "solved_self");
      let status: StudentStat["status"] = "idle";
      if (lessonsCompleted >= LESSONS.length) status = "done";
      else if (lastActiveMs && now - lastActiveMs <= 7 * DAYMS) status = stuck ? "stuck" : "active";

      return {
        userId: id,
        name: nameOf(id),
        lessonsStarted,
        lessonsCompleted,
        completionPct,
        attempts: uAtt.length,
        avgAttempts: lessonsStarted ? Math.round((uAtt.length / lessonsStarted) * 10) / 10 : 0,
        solvedSelf: self,
        solvedWithHelp: help,
        failed,
        appeals: appeals.filter((a) => a.user_id === id).length,
        lastActive,
        status,
      };
    });

    out.sort((a, b) => +new Date(b.lastActive ?? 0) - +new Date(a.lastActive ?? 0));
    return out;
  });

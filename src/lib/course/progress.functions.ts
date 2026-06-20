import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/* Fetch all of the current user's lesson progress. */
export const getMyProgress = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("lesson_progress")
      .select("lesson_id, current_step, status, completed_at");
    if (error) throw error;
    return data ?? [];
  });

const UpsertInput = z.object({
  lessonId: z.string(),
  currentStep: z.number().int().min(0),
  status: z.enum(["in_progress", "completed"]),
});

export const upsertProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => UpsertInput.parse(d))
  .handler(async ({ data, context }) => {
    const row = {
      user_id: context.userId,
      lesson_id: data.lessonId,
      current_step: data.currentStep,
      status: data.status,
      completed_at: data.status === "completed" ? new Date().toISOString() : null,
    };
    const { error } = await context.supabase
      .from("lesson_progress")
      .upsert(row, { onConflict: "user_id,lesson_id" });
    if (error) throw error;
    return { ok: true };
  });

const AttemptInput = z.object({
  lessonId: z.string(),
  taskType: z.string(),
  attemptNo: z.number().int().min(1),
  status: z.enum(["solved_self", "solved_with_help", "failed"]),
  userAnswer: z.string().max(8000).optional(),
  score: z.number().int().optional(),
});

export const recordAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => AttemptInput.parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("task_attempts").insert({
      user_id: context.userId,
      lesson_id: data.lessonId,
      task_type: data.taskType,
      attempt_no: data.attemptNo,
      status: data.status,
      user_answer: data.userAnswer ?? null,
      score: data.score ?? null,
    });
    if (error) throw error;
    return { ok: true };
  });

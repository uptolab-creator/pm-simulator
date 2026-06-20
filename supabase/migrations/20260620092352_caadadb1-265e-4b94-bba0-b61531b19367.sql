ALTER TABLE public.task_attempts
  ADD COLUMN IF NOT EXISTS override_status text,
  ADD COLUMN IF NOT EXISTS override_score integer,
  ADD COLUMN IF NOT EXISTS override_note text,
  ADD COLUMN IF NOT EXISTS overridden_by uuid,
  ADD COLUMN IF NOT EXISTS overridden_at timestamptz;

ALTER TABLE public.appeals
  ADD COLUMN IF NOT EXISTS admin_resolution text,
  ADD COLUMN IF NOT EXISTS resolved_by uuid,
  ADD COLUMN IF NOT EXISTS resolved_at timestamptz;
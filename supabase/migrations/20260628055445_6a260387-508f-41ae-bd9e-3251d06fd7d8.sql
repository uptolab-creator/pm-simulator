create extension if not exists "pgcrypto";

drop function if exists public.student_login(text, text);
drop function if exists public.student_save_progress(uuid, text, text, integer, text, numeric);
drop function if exists public.student_progress_list(uuid);

create or replace function public.norm_tg(p text)
returns text
language sql
immutable
as $$ select lower(ltrim(coalesce(p, ''), '@')) $$;

create table if not exists public.students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  telegram text not null,
  telegram_norm text generated always as (public.norm_tg(telegram)) stored,
  created_at timestamptz not null default now()
);

create unique index if not exists students_telegram_norm_key on public.students (telegram_norm);

create table if not exists public.student_progress (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references public.students(id) on delete cascade,
  kind text not null,
  item_id text not null,
  current_step integer not null default 0,
  status text not null default 'in_progress',
  score numeric,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, kind, item_id)
);

grant select, insert, update, delete on public.students to service_role;
grant select, insert, update, delete on public.student_progress to service_role;
grant select on public.students to authenticated;
grant select on public.student_progress to authenticated;

alter table public.students enable row level security;
alter table public.student_progress enable row level security;

drop policy if exists "admins read students" on public.students;
create policy "admins read students" on public.students
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

drop policy if exists "admins read progress" on public.student_progress;
create policy "admins read progress" on public.student_progress
  for select to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create function public.student_login(p_name text, p_telegram text)
returns table (id uuid, name text, telegram text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select s.id, s.name, s.telegram
  from public.students s
  where s.telegram_norm = public.norm_tg(p_telegram)
    and lower(s.name) = lower(trim(p_name))
  limit 1;
end;
$$;

create function public.student_save_progress(
  p_student_id uuid,
  p_kind text,
  p_item_id text,
  p_step integer,
  p_status text,
  p_score numeric
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.student_progress (student_id, kind, item_id, current_step, status, score, updated_at)
  values (p_student_id, p_kind, p_item_id, p_step, p_status, p_score, now())
  on conflict (student_id, kind, item_id) do update
  set current_step = greatest(public.student_progress.current_step, excluded.current_step),
      status = case when public.student_progress.status = 'completed' then 'completed' else excluded.status end,
      score = coalesce(excluded.score, public.student_progress.score),
      updated_at = now();
end;
$$;

create function public.student_progress_list(p_student_id uuid)
returns table (
  kind text,
  item_id text,
  current_step integer,
  status text,
  score numeric,
  updated_at timestamptz
)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  select sp.kind, sp.item_id, sp.current_step, sp.status, sp.score, sp.updated_at
  from public.student_progress sp
  where sp.student_id = p_student_id
  order by sp.updated_at desc;
end;
$$;

grant execute on function public.norm_tg(text) to anon, authenticated;
grant execute on function public.student_login(text, text) to anon, authenticated;
grant execute on function public.student_save_progress(uuid, text, text, integer, text, numeric) to anon, authenticated;
grant execute on function public.student_progress_list(uuid) to anon, authenticated;
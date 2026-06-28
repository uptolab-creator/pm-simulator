create or replace function public.student_progress_list(p_student_id uuid)
returns table(kind text, item_id text, current_step integer, status text, score integer, updated_at timestamp with time zone)
language sql
stable
security definer
set search_path = public
as $$
  select p.kind, p.item_id, p.current_step, p.status, p.score, p.updated_at
  from public.student_progress p
  where p.student_id = p_student_id
  order by p.updated_at desc
$$;

grant execute on function public.student_progress_list(uuid) to anon, authenticated;
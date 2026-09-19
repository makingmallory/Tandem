-- Phase 4: one shared completion per occurrence, household activity, and safe mutation RPCs.

alter table public.chore_occurrences
  add constraint chore_occurrences_id_household_unique unique (id, household_id);

create table public.occurrence_completions (
  id uuid primary key default gen_random_uuid(),
  occurrence_id uuid not null unique,
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete restrict,
  completed_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint occurrence_completions_occurrence_household_fkey
    foreign key (occurrence_id, household_id)
    references public.chore_occurrences(id, household_id) on delete cascade
);

create index occurrence_completions_household_completed_idx
  on public.occurrence_completions (household_id, completed_at desc);
create index occurrence_completions_user_idx
  on public.occurrence_completions (user_id, completed_at desc);

-- Phase 3 allowed the completed status before a completion record existed.
-- Preserve any such rows deterministically by attributing the legacy record to
-- the chore creator and using the occurrence's last-updated timestamp.
insert into public.occurrence_completions (
  occurrence_id, household_id, user_id, completed_at, created_at
)
select occurrence.id, occurrence.household_id, chore.created_by,
       occurrence.updated_at, occurrence.updated_at
from public.chore_occurrences occurrence
join public.chores chore on chore.id = occurrence.chore_id
where occurrence.status = 'completed'
on conflict (occurrence_id) do nothing;

create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  actor_user_id uuid references public.profiles(id) on delete set null,
  event_type text not null check (event_type in (
    'chore_completed', 'chore_uncompleted', 'chore_skipped', 'chore_rescheduled'
  )),
  chore_id uuid references public.chores(id) on delete set null,
  occurrence_id uuid references public.chore_occurrences(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index activity_events_household_created_idx
  on public.activity_events (household_id, created_at desc);
create index activity_events_occurrence_idx
  on public.activity_events (occurrence_id, created_at desc);

alter table public.occurrence_completions enable row level security;
alter table public.activity_events enable row level security;

create policy "Household members can read completions"
on public.occurrence_completions for select to authenticated
using (private.is_household_member(household_id));

create policy "Household members can read activity"
on public.activity_events for select to authenticated
using (private.is_household_member(household_id));

-- Occurrence state and audit rows are only changed through the security-definer
-- RPCs below. This prevents clients from spoofing a completer or skipping audit.
revoke insert, update, delete on public.chore_occurrences from authenticated;
revoke all on public.occurrence_completions from anon, authenticated;
revoke all on public.activity_events from anon, authenticated;
grant select on public.occurrence_completions to authenticated;
grant select on public.activity_events to authenticated;

create or replace function public.complete_occurrence(
  p_occurrence_id uuid,
  p_household_id uuid
)
returns setof public.occurrence_completions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occurrence public.chore_occurrences%rowtype;
  v_completion public.occurrence_completions%rowtype;
  v_chore_name text;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;

  select * into v_occurrence
  from public.chore_occurrences
  where id = p_occurrence_id and household_id = p_household_id
  for update;
  if not found then raise exception 'Occurrence not found' using errcode = 'P0002'; end if;
  if v_occurrence.status = 'skipped' then
    raise exception 'A skipped occurrence cannot be completed' using errcode = '22023';
  end if;

  select * into v_completion
  from public.occurrence_completions
  where occurrence_id = p_occurrence_id;
  if found then
    return next v_completion;
    return;
  end if;

  insert into public.occurrence_completions (occurrence_id, household_id, user_id)
  values (p_occurrence_id, p_household_id, auth.uid())
  returning * into v_completion;

  update public.chore_occurrences
  set status = 'completed', updated_at = now()
  where id = p_occurrence_id;

  select name into v_chore_name from public.chores where id = v_occurrence.chore_id;
  insert into public.activity_events (
    household_id, actor_user_id, event_type, chore_id, occurrence_id, metadata
  ) values (
    p_household_id, auth.uid(), 'chore_completed', v_occurrence.chore_id, p_occurrence_id,
    jsonb_build_object('chore_name', v_chore_name, 'scheduled_date', v_occurrence.scheduled_date)
  );

  return next v_completion;
end;
$$;

create or replace function public.undo_occurrence_completion(
  p_occurrence_id uuid,
  p_household_id uuid
)
returns setof public.chore_occurrences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occurrence public.chore_occurrences%rowtype;
  v_completion public.occurrence_completions%rowtype;
  v_chore_name text;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;
  select * into v_occurrence from public.chore_occurrences
  where id = p_occurrence_id and household_id = p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode = 'P0002'; end if;

  delete from public.occurrence_completions
  where occurrence_id = p_occurrence_id and household_id = p_household_id
  returning * into v_completion;
  if not found then raise exception 'Completion not found' using errcode = 'P0002'; end if;

  update public.chore_occurrences set status = 'scheduled', updated_at = now()
  where id = p_occurrence_id returning * into v_occurrence;
  select name into v_chore_name from public.chores where id = v_occurrence.chore_id;
  insert into public.activity_events (
    household_id, actor_user_id, event_type, chore_id, occurrence_id, metadata
  ) values (
    p_household_id, auth.uid(), 'chore_uncompleted', v_occurrence.chore_id, p_occurrence_id,
    jsonb_build_object(
      'chore_name', v_chore_name,
      'scheduled_date', v_occurrence.scheduled_date,
      'previous_completer_id', v_completion.user_id,
      'previous_completed_at', v_completion.completed_at
    )
  );
  return next v_occurrence;
end;
$$;

create or replace function public.skip_occurrence(
  p_occurrence_id uuid,
  p_household_id uuid
)
returns setof public.chore_occurrences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occurrence public.chore_occurrences%rowtype;
  v_chore_name text;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;
  select * into v_occurrence from public.chore_occurrences
  where id = p_occurrence_id and household_id = p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode = 'P0002'; end if;
  if v_occurrence.status <> 'scheduled' then
    raise exception 'Only a scheduled occurrence can be skipped' using errcode = '22023';
  end if;
  update public.chore_occurrences set status = 'skipped', updated_at = now()
  where id = p_occurrence_id returning * into v_occurrence;
  select name into v_chore_name from public.chores where id = v_occurrence.chore_id;
  insert into public.activity_events (
    household_id, actor_user_id, event_type, chore_id, occurrence_id, metadata
  ) values (
    p_household_id, auth.uid(), 'chore_skipped', v_occurrence.chore_id, p_occurrence_id,
    jsonb_build_object('chore_name', v_chore_name, 'scheduled_date', v_occurrence.scheduled_date)
  );
  return next v_occurrence;
end;
$$;

create or replace function public.reschedule_occurrence(
  p_occurrence_id uuid,
  p_household_id uuid,
  p_scheduled_date date
)
returns setof public.chore_occurrences
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_occurrence public.chore_occurrences%rowtype;
  v_previous_date date;
  v_chore_name text;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;
  if p_scheduled_date is null then raise exception 'A new date is required' using errcode = '22023'; end if;
  select * into v_occurrence from public.chore_occurrences
  where id = p_occurrence_id and household_id = p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode = 'P0002'; end if;
  if v_occurrence.status <> 'scheduled' then
    raise exception 'Only a scheduled occurrence can be rescheduled' using errcode = '22023';
  end if;
  v_previous_date := v_occurrence.scheduled_date;
  update public.chore_occurrences
  set scheduled_date = p_scheduled_date,
      is_rescheduled = p_scheduled_date <> original_scheduled_date,
      updated_at = now()
  where id = p_occurrence_id returning * into v_occurrence;
  select name into v_chore_name from public.chores where id = v_occurrence.chore_id;
  insert into public.activity_events (
    household_id, actor_user_id, event_type, chore_id, occurrence_id, metadata
  ) values (
    p_household_id, auth.uid(), 'chore_rescheduled', v_occurrence.chore_id, p_occurrence_id,
    jsonb_build_object(
      'chore_name', v_chore_name,
      'previous_scheduled_date', v_previous_date,
      'scheduled_date', v_occurrence.scheduled_date,
      'original_scheduled_date', v_occurrence.original_scheduled_date
    )
  );
  return next v_occurrence;
end;
$$;

revoke all on function public.complete_occurrence(uuid, uuid) from public, anon;
revoke all on function public.undo_occurrence_completion(uuid, uuid) from public, anon;
revoke all on function public.skip_occurrence(uuid, uuid) from public, anon;
revoke all on function public.reschedule_occurrence(uuid, uuid, date) from public, anon;
grant execute on function public.complete_occurrence(uuid, uuid) to authenticated;
grant execute on function public.undo_occurrence_completion(uuid, uuid) to authenticated;
grant execute on function public.skip_occurrence(uuid, uuid) to authenticated;
grant execute on function public.reschedule_occurrence(uuid, uuid, date) to authenticated;

-- Hosted Supabase projects already have this publication. PGlite and other test
-- databases do not, so the migration safely skips publication wiring there.
do $$
declare
  v_table text;
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array['chores', 'chore_occurrences', 'occurrence_completions', 'activity_events']
    loop
      if not exists (
        select 1 from pg_publication_tables
        where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = v_table
      ) then
        execute format('alter publication supabase_realtime add table public.%I', v_table);
      end if;
    end loop;
  end if;
end;
$$;

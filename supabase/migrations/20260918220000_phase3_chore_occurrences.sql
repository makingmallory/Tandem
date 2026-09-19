-- Phase 3: scheduled instances of shared household chore definitions.
-- Completion events, activity history, skip/reschedule UI, realtime, and reminders
-- remain intentionally deferred to later blueprint phases.

alter table public.chores
add constraint chores_id_household_unique unique (id, household_id);

create table public.chore_occurrences (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  chore_id uuid not null,
  scheduled_date date not null,
  original_scheduled_date date not null,
  status text not null default 'scheduled' constraint chore_occurrences_status check (
    status in ('scheduled', 'completed', 'skipped')
  ),
  is_rescheduled boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chore_occurrences_chore_household_fkey
    foreign key (chore_id, household_id)
    references public.chores (id, household_id)
    on delete cascade,
  constraint chore_occurrences_chore_scheduled_unique unique (chore_id, scheduled_date),
  constraint chore_occurrences_reschedule_shape check (
    (is_rescheduled and scheduled_date <> original_scheduled_date)
    or (not is_rescheduled and scheduled_date = original_scheduled_date)
  )
);

create index chore_occurrences_household_scheduled_idx
on public.chore_occurrences (household_id, scheduled_date);

create index chore_occurrences_household_status_scheduled_idx
on public.chore_occurrences (household_id, status, scheduled_date);

create index chore_occurrences_chore_scheduled_idx
on public.chore_occurrences (chore_id, scheduled_date);

create trigger chore_occurrences_set_updated_at
before update on public.chore_occurrences
for each row execute function private.set_updated_at();

alter table public.chore_occurrences enable row level security;

create policy "chore_occurrences_select_household_members"
on public.chore_occurrences
for select
to authenticated
using ((select private.is_household_member(household_id)));

create policy "chore_occurrences_insert_household_members"
on public.chore_occurrences
for insert
to authenticated
with check ((select private.is_household_member(household_id)));

create policy "chore_occurrences_update_household_members"
on public.chore_occurrences
for update
to authenticated
using ((select private.is_household_member(household_id)))
with check ((select private.is_household_member(household_id)));

create policy "chore_occurrences_delete_household_members"
on public.chore_occurrences
for delete
to authenticated
using ((select private.is_household_member(household_id)));

revoke all on table public.chore_occurrences from anon, authenticated;
grant select, insert, update, delete on table public.chore_occurrences to authenticated;

create function public.create_chore_with_occurrences(
  p_household_id uuid,
  p_name text,
  p_description text,
  p_icon_key text,
  p_accent_key text,
  p_recurrence_type text,
  p_interval_count integer,
  p_anchor_date date,
  p_weekdays smallint[],
  p_day_of_month smallint,
  p_occurrence_dates date[]
)
returns setof public.chores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chore public.chores;
begin
  if not (select private.is_household_member(p_household_id)) then
    raise exception 'household membership is required' using errcode = '42501';
  end if;

  insert into public.chores (
    household_id, name, description, icon_key, accent_key, recurrence_type,
    interval_count, anchor_date, weekdays, day_of_month, created_by
  ) values (
    p_household_id, p_name, p_description, p_icon_key, p_accent_key,
    p_recurrence_type, p_interval_count, p_anchor_date, p_weekdays,
    p_day_of_month, (select auth.uid())
  )
  returning * into v_chore;

  insert into public.chore_occurrences (
    household_id, chore_id, scheduled_date, original_scheduled_date
  )
  select p_household_id, v_chore.id, occurrence_date, occurrence_date
  from unnest(coalesce(p_occurrence_dates, array[]::date[])) as occurrence_date
  where occurrence_date >= p_anchor_date
  on conflict (chore_id, scheduled_date) do nothing;

  return next v_chore;
end;
$$;

create function public.update_chore_with_occurrences(
  p_chore_id uuid,
  p_household_id uuid,
  p_name text,
  p_description text,
  p_icon_key text,
  p_accent_key text,
  p_recurrence_type text,
  p_interval_count integer,
  p_anchor_date date,
  p_weekdays smallint[],
  p_day_of_month smallint,
  p_regeneration_date date,
  p_occurrence_dates date[]
)
returns setof public.chores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chore public.chores;
begin
  if not (select private.is_household_member(p_household_id)) then
    raise exception 'household membership is required' using errcode = '42501';
  end if;

  update public.chores
  set name = p_name,
      description = p_description,
      icon_key = p_icon_key,
      accent_key = p_accent_key,
      recurrence_type = p_recurrence_type,
      interval_count = p_interval_count,
      anchor_date = p_anchor_date,
      weekdays = p_weekdays,
      day_of_month = p_day_of_month
  where id = p_chore_id and household_id = p_household_id
  returning * into v_chore;

  if v_chore.id is null then
    raise exception 'chore not found' using errcode = 'P0002';
  end if;

  delete from public.chore_occurrences
  where chore_id = p_chore_id
    and household_id = p_household_id
    and scheduled_date >= p_regeneration_date
    and status = 'scheduled'
    and not is_rescheduled;

  if v_chore.is_active then
    insert into public.chore_occurrences (
      household_id, chore_id, scheduled_date, original_scheduled_date
    )
    select p_household_id, p_chore_id, occurrence_date, occurrence_date
    from unnest(coalesce(p_occurrence_dates, array[]::date[])) as occurrence_date
    where occurrence_date >= p_regeneration_date
    on conflict (chore_id, scheduled_date) do nothing;
  end if;

  return next v_chore;
end;
$$;

create function public.set_chore_active_with_occurrences(
  p_chore_id uuid,
  p_household_id uuid,
  p_is_active boolean,
  p_regeneration_date date,
  p_occurrence_dates date[]
)
returns setof public.chores
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_chore public.chores;
begin
  if not (select private.is_household_member(p_household_id)) then
    raise exception 'household membership is required' using errcode = '42501';
  end if;

  update public.chores
  set is_active = p_is_active
  where id = p_chore_id and household_id = p_household_id
  returning * into v_chore;

  if v_chore.id is null then
    raise exception 'chore not found' using errcode = 'P0002';
  end if;

  delete from public.chore_occurrences
  where chore_id = p_chore_id
    and household_id = p_household_id
    and scheduled_date >= p_regeneration_date
    and status = 'scheduled'
    and not is_rescheduled;

  if p_is_active then
    insert into public.chore_occurrences (
      household_id, chore_id, scheduled_date, original_scheduled_date
    )
    select p_household_id, p_chore_id, occurrence_date, occurrence_date
    from unnest(coalesce(p_occurrence_dates, array[]::date[])) as occurrence_date
    where occurrence_date >= p_regeneration_date
    on conflict (chore_id, scheduled_date) do nothing;
  end if;

  return next v_chore;
end;
$$;

revoke all on function public.create_chore_with_occurrences(uuid, text, text, text, text, text, integer, date, smallint[], smallint, date[]) from public, anon;
revoke all on function public.update_chore_with_occurrences(uuid, uuid, text, text, text, text, text, integer, date, smallint[], smallint, date, date[]) from public, anon;
revoke all on function public.set_chore_active_with_occurrences(uuid, uuid, boolean, date, date[]) from public, anon;

grant execute on function public.create_chore_with_occurrences(uuid, text, text, text, text, text, integer, date, smallint[], smallint, date[]) to authenticated;
grant execute on function public.update_chore_with_occurrences(uuid, uuid, text, text, text, text, text, integer, date, smallint[], smallint, date, date[]) to authenticated;
grant execute on function public.set_chore_active_with_occurrences(uuid, uuid, boolean, date, date[]) to authenticated;

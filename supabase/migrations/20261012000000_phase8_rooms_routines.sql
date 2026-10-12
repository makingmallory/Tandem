-- Replaces the never-applied local Phase 8 proposal. Each room target remains
-- a normal schedulable chore; the existing recurrence/completion RPCs are reused.
create table public.rooms (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 60),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create unique index rooms_household_name_unique on public.rooms(household_id, lower(trim(name)))
where archived_at is null;

create table public.routines (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, household_id)
);
create table public.routine_subtasks (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  routine_id uuid not null,
  title text not null check (char_length(trim(title)) between 1 and 120),
  position integer not null check (position >= 0),
  foreign key (routine_id, household_id) references public.routines(id, household_id) on delete restrict,
  unique (routine_id, position) deferrable initially deferred
);
alter table public.chores
  add column room_id uuid,
  add column routine_id uuid,
  add column retired_at timestamptz,
  add constraint chores_room_household_fkey foreign key (room_id, household_id)
    references public.rooms(id, household_id) on delete restrict,
  add constraint chores_routine_household_fkey foreign key (routine_id, household_id)
    references public.routines(id, household_id) on delete restrict,
  add constraint chores_retired_inactive check (retired_at is null or not is_active);
create unique index chores_routine_room_unique on public.chores(routine_id, room_id) nulls not distinct
where routine_id is not null and retired_at is null;
create index chores_room_idx on public.chores(room_id) where room_id is not null;

create trigger rooms_set_updated_at before update on public.rooms
for each row execute function private.set_updated_at();
create trigger routines_set_updated_at before update on public.routines
for each row execute function private.set_updated_at();

alter table public.rooms enable row level security;
alter table public.routines enable row level security;
alter table public.routine_subtasks enable row level security;
create policy rooms_read on public.rooms for select to authenticated
using (private.is_household_member(household_id));
create policy rooms_create on public.rooms for insert to authenticated
with check (private.is_household_member(household_id));
create policy rooms_rename on public.rooms for update to authenticated
using (private.is_household_member(household_id)) with check (private.is_household_member(household_id));
create policy routines_read on public.routines for select to authenticated
using (private.is_household_member(household_id));
create policy routine_subtasks_read on public.routine_subtasks for select to authenticated
using (private.is_household_member(household_id));
revoke all on public.rooms, public.routines, public.routine_subtasks from public, anon, authenticated;
grant select on public.rooms, public.routines, public.routine_subtasks to authenticated;
grant insert(household_id, name), update(name) on public.rooms to authenticated;
-- Links, retirement, and subtask membership can only be changed by the atomic RPCs.

-- Retired chores cannot be resumed by old RPCs or generate additional work.
create function private.guard_retired_chore() returns trigger language plpgsql set search_path = '' as $$
begin
  if old.retired_at is not null then
    raise exception 'This chore has been removed' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger chores_guard_retirement before update on public.chores
for each row execute function private.guard_retired_chore();
create function private.guard_retired_occurrence() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.status = 'scheduled' and exists (
    select 1 from public.chores where id = new.chore_id and retired_at is not null
  ) then
    raise exception 'Removed chores cannot schedule work' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger occurrences_guard_retirement before insert or update on public.chore_occurrences
for each row execute function private.guard_retired_occurrence();
create function private.guard_retired_reminder() returns trigger language plpgsql set search_path = '' as $$
begin
  if new.enabled and exists (
    select 1 from public.chores where id = new.chore_id and retired_at is not null
  ) then
    raise exception 'Removed chores cannot enable reminders' using errcode = '22023';
  end if;
  return new;
end;
$$;
create trigger reminders_guard_retirement before insert or update on public.chore_reminders
for each row execute function private.guard_retired_reminder();

-- Keep event-time room context even if a room is renamed or the chore is later
-- organized into a routine. Previous roomless events stay roomless.
create function private.snapshot_activity_room() returns trigger language plpgsql set search_path = '' as $$
begin
  new.metadata := new.metadata || jsonb_build_object('room_name', (
    select room.name from public.chores chore
    left join public.rooms room on room.id = chore.room_id
    where chore.id = new.chore_id
  ));
  return new;
end;
$$;
create trigger activity_snapshot_room before insert on public.activity_events
for each row execute function private.snapshot_activity_room();

create function private.retire_chore(p_id uuid) returns void
language plpgsql set search_path = '' as $$
begin
  update public.chores set retired_at = now(), is_active = false where id = p_id and retired_at is null;
  -- Cancel pending work, including overdue and one-off rescheduled work.
  -- Keep all rows, dates, completions and event records for history.
  update public.chore_occurrences set status = 'skipped'
  where chore_id = p_id and status = 'scheduled';
  update public.chore_reminders set enabled = false where chore_id = p_id;
end;
$$;

create function public.retire_chore(p_household_id uuid, p_chore_id uuid, p_entire_routine boolean default false)
returns void language plpgsql security definer set search_path = '' as $$
declare v_chore public.chores; v_id uuid;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Household membership is required' using errcode = '42501';
  end if;
  select * into v_chore from public.chores where id = p_chore_id and household_id = p_household_id for update;
  if not found then raise exception 'Chore not found' using errcode = 'P0002'; end if;
  if v_chore.routine_id is not null then
    perform 1 from public.routines where id = v_chore.routine_id for update;
  end if;
  for v_id in select id from public.chores where household_id = p_household_id and retired_at is null
    and (id = p_chore_id or (p_entire_routine and routine_id = v_chore.routine_id)) order by id
  loop perform private.retire_chore(v_id); end loop;
  if v_chore.routine_id is not null and not exists (
    select 1 from public.chores where routine_id = v_chore.routine_id and retired_at is null
  ) then
    update public.routines set archived_at = now() where id = v_chore.routine_id;
  end if;
end;
$$;

create function public.archive_room(p_household_id uuid, p_room_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Household membership is required' using errcode = '42501';
  end if;
  perform 1 from public.rooms where id = p_room_id and household_id = p_household_id for update;
  if not found then raise exception 'Room not found' using errcode = 'P0002'; end if;
  update public.rooms set archived_at = now() where id = p_room_id;
  for v_id in select id from public.chores where room_id = p_room_id and retired_at is null order by id
  loop perform public.retire_chore(p_household_id, v_id, false); end loop;
end;
$$;

-- A complete edit is one transaction: subtask edits, target changes and the
-- existing per-chore occurrence generation all succeed or all roll back.
create function public.save_chore_plan(p_household_id uuid, p_chore_id uuid, p_plan jsonb, p_today date)
returns setof public.chores language plpgsql security definer set search_path = '' as $$
declare
  v_existing public.chores; v_chore public.chores; v_routine uuid;
  v_target jsonb; v_task jsonb; v_room uuid; v_id uuid;
  v_kept uuid[] := array[]::uuid[]; v_task_ids uuid[] := array[]::uuid[];
  v_position integer := 0; v_dates date[]; v_weekdays smallint[];
  v_use_routine boolean; v_reuse_base boolean := false;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Household membership is required' using errcode = '42501';
  end if;
  if p_today is null or jsonb_typeof(p_plan->'targets') is distinct from 'array'
    or jsonb_array_length(p_plan->'targets') not between 1 and 100
    or jsonb_typeof(p_plan->'subtasks') is distinct from 'array'
    or jsonb_array_length(p_plan->'subtasks') > 50 then
    raise exception 'Invalid routine plan' using errcode = '22023';
  end if;
  if p_chore_id is not null then
    select * into v_existing from public.chores
    where id = p_chore_id and household_id = p_household_id and retired_at is null for update;
    if not found then raise exception 'Chore not found' using errcode = 'P0002'; end if;
    v_routine := v_existing.routine_id;
    v_reuse_base := v_routine is null;
  end if;
  v_use_routine := v_routine is not null or jsonb_array_length(p_plan->'subtasks') > 0
    or jsonb_array_length(p_plan->'targets') > 1
    or nullif(p_plan->'targets'->0->>'room_id', '') is not null;
  if v_use_routine then
    if v_routine is null then
      insert into public.routines(household_id, name) values(p_household_id, p_plan->>'name') returning id into v_routine;
    else
      perform 1 from public.routines where id = v_routine and archived_at is null for update;
      if not found then raise exception 'Routine removed' using errcode = '22023'; end if;
      update public.routines set name = p_plan->>'name' where id = v_routine;
    end if;
  end if;
  for v_target in select value from jsonb_array_elements(p_plan->'targets') loop
    v_room := nullif(v_target->>'room_id', '')::uuid;
    if v_room is not null then
      perform 1 from public.rooms where id = v_room and household_id = p_household_id and archived_at is null for share;
      if not found then raise exception 'Room unavailable in this household' using errcode = '42501'; end if;
    elsif jsonb_array_length(p_plan->'targets') > 1 then
      raise exception 'Roomless targets cannot be mixed with rooms' using errcode = '22023';
    end if;
    v_chore := null;
    if v_routine is not null then
      select * into v_chore from public.chores
      where routine_id = v_routine and room_id is not distinct from v_room and retired_at is null for update;
    elsif p_chore_id is not null then v_chore := v_existing;
    end if;
    if v_chore.id is null and v_reuse_base then
      v_chore := v_existing; v_reuse_base := false;
    end if;
    v_weekdays := case when jsonb_typeof(v_target->'weekdays') = 'array' then
      array(select value::smallint from jsonb_array_elements_text(v_target->'weekdays')) else null end;
    v_dates := array(select value::date from jsonb_array_elements_text(v_target->'occurrence_dates'));
    if v_chore.id is null then
      select * into v_chore from public.create_chore_with_occurrences(
        p_household_id, p_plan->>'name', nullif(p_plan->>'description', ''), p_plan->>'icon_key', p_plan->>'accent_key',
        v_target->>'recurrence_type', (v_target->>'interval_count')::integer,
        (v_target->>'anchor_date')::date, v_weekdays, (v_target->>'day_of_month')::smallint, v_dates);
    else
      if v_chore.id = any(v_kept) then raise exception 'Duplicate room target' using errcode = '22023'; end if;
      -- Metadata-only edits leave existing occurrence IDs and schedules intact.
      if row(v_chore.recurrence_type, v_chore.interval_count, v_chore.anchor_date, v_chore.weekdays, v_chore.day_of_month)
        is distinct from row(v_target->>'recurrence_type', (v_target->>'interval_count')::integer,
          (v_target->>'anchor_date')::date, v_weekdays, (v_target->>'day_of_month')::smallint) then
        perform public.update_chore_with_occurrences(v_chore.id, p_household_id,
          p_plan->>'name', nullif(p_plan->>'description', ''), p_plan->>'icon_key', p_plan->>'accent_key',
          v_target->>'recurrence_type', (v_target->>'interval_count')::integer,
          (v_target->>'anchor_date')::date, v_weekdays, (v_target->>'day_of_month')::smallint, p_today, v_dates);
      end if;
    end if;
    update public.chores set name = p_plan->>'name', description = nullif(p_plan->>'description', ''),
      icon_key = p_plan->>'icon_key', accent_key = p_plan->>'accent_key', room_id = v_room, routine_id = v_routine
    where id = v_chore.id returning * into v_chore;
    v_kept := array_append(v_kept, v_chore.id);
    return next v_chore;
  end loop;
  if v_routine is not null then
    for v_id in select id from public.chores where routine_id = v_routine and retired_at is null and not (id = any(v_kept))
    loop perform private.retire_chore(v_id); end loop;
    for v_task in select value from jsonb_array_elements(p_plan->'subtasks') loop
      v_id := nullif(v_task->>'id', '')::uuid;
      if v_id is null then
        insert into public.routine_subtasks(household_id, routine_id, title, position)
        values(p_household_id, v_routine, v_task->>'title', v_position) returning id into v_id;
      else
        if v_id = any(v_task_ids) then raise exception 'Duplicate subtask' using errcode = '22023'; end if;
        update public.routine_subtasks set title = v_task->>'title', position = v_position
        where id = v_id and routine_id = v_routine and household_id = p_household_id;
        if not found then raise exception 'Subtask not in this routine' using errcode = '42501'; end if;
      end if;
      v_task_ids := array_append(v_task_ids, v_id); v_position := v_position + 1;
    end loop;
    delete from public.routine_subtasks where routine_id = v_routine and not (id = any(v_task_ids));
  end if;
end;
$$;

-- Internal trigger/helpers are not callable by API roles.
revoke all on function private.guard_retired_chore(), private.guard_retired_occurrence(),
  private.guard_retired_reminder(), private.snapshot_activity_room(), private.retire_chore(uuid)
from public, anon, authenticated;
revoke all on function public.save_chore_plan(uuid, uuid, jsonb, date),
  public.retire_chore(uuid, uuid, boolean), public.archive_room(uuid, uuid) from public, anon;
grant execute on function public.save_chore_plan(uuid, uuid, jsonb, date),
  public.retire_chore(uuid, uuid, boolean), public.archive_room(uuid, uuid) to authenticated;

do $$
declare v_table text;
begin
  if exists(select 1 from pg_publication where pubname = 'supabase_realtime') then
    foreach v_table in array array['rooms', 'routines', 'routine_subtasks'] loop
      execute format('alter publication supabase_realtime add table public.%I', v_table);
    end loop;
  end if;
end;
$$;

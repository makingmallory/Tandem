-- Convert the already-deployed Phase 6 lead_days model to dynamic notifications.
-- Reminder rows are updated in place so IDs, delivery history, ownership, and settings survive.

alter table public.chore_reminders
  add column offset_value integer,
  add column offset_unit text;

update public.chore_reminders
set offset_value = lead_days::integer,
    offset_unit = 'day';

alter table public.chore_reminders
  alter column offset_value set default 0,
  alter column offset_value set not null,
  alter column offset_unit set default 'day',
  alter column offset_unit set not null,
  add constraint chore_reminders_offset_value_check
    check (offset_value between 0 and 365),
  add constraint chore_reminders_offset_unit_check
    check (offset_unit in ('day', 'week', 'month'));

-- Remove definitions that depend on lead_days before dropping that column.
drop function public.upsert_chore_reminder_v2(uuid, uuid, boolean, text, time, text, integer[]);
drop function public.claim_due_reminder_deliveries(timestamptz);

alter table public.chore_reminders drop constraint chore_reminders_unique;
alter table public.chore_reminders
  add constraint chore_reminders_unique
  unique (chore_id, user_id, reminder_type, offset_value, offset_unit, local_time);

alter table public.chore_reminders drop column lead_days;

create or replace function private.reminder_offset_date(
  p_due_date date,
  p_offset_value integer,
  p_offset_unit text
)
returns date
language sql immutable set search_path = ''
as $$
  select case p_offset_unit
    when 'day' then p_due_date - p_offset_value
    when 'week' then p_due_date - (p_offset_value * 7)
    when 'month' then (p_due_date::timestamp - make_interval(months => p_offset_value))::date
  end;
$$;

-- Keep the Phase 5 RPC usable during a rolling deployment.
create or replace function public.upsert_chore_reminder(
  p_household_id uuid,
  p_chore_id uuid,
  p_enabled boolean,
  p_reminder_type text,
  p_local_time time,
  p_timezone text
)
returns setof public.chore_reminders
language plpgsql security definer set search_path = ''
as $$
declare v_reminder public.chore_reminders%rowtype;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;
  if not exists (select 1 from public.chores where id = p_chore_id and household_id = p_household_id) then
    raise exception 'Chore not found' using errcode = 'P0002';
  end if;
  if p_reminder_type <> 'due_time' then
    raise exception 'Unsupported reminder type' using errcode = '22023';
  end if;
  if p_local_time is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid reminder time or timezone' using errcode = '22023';
  end if;

  insert into public.chore_reminders (
    household_id, chore_id, user_id, enabled, selected, reminder_type,
    offset_value, offset_unit, local_time, timezone
  ) values (
    p_household_id, p_chore_id, auth.uid(), p_enabled, true, p_reminder_type,
    0, 'day', p_local_time, p_timezone
  )
  on conflict (chore_id, user_id, reminder_type, offset_value, offset_unit, local_time) do update
  set enabled = excluded.enabled,
      selected = true,
      timezone = excluded.timezone,
      updated_at = now()
  returning * into v_reminder;
  return next v_reminder;
end;
$$;

create function public.upsert_chore_reminder_v2(
  p_household_id uuid,
  p_chore_id uuid,
  p_enabled boolean,
  p_reminder_type text,
  p_timezone text,
  p_reminders jsonb
)
returns setof public.chore_reminders
language plpgsql security definer set search_path = ''
as $$
declare v_recurrence_type text;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;

  select recurrence_type into v_recurrence_type
  from public.chores
  where id = p_chore_id and household_id = p_household_id;
  if not found then raise exception 'Chore not found' using errcode = 'P0002'; end if;

  if p_reminder_type <> 'due_time'
    or p_reminders is null
    or jsonb_typeof(p_reminders) <> 'array'
    or jsonb_array_length(p_reminders) > 12
    or (p_enabled and jsonb_array_length(p_reminders) = 0) then
    raise exception 'Invalid reminder definitions' using errcode = '22023';
  end if;
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid reminder timezone' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_reminders)
      as definition(offset_value integer, offset_unit text, local_time text)
    where definition.offset_value is null
       or definition.offset_unit not in ('day', 'week', 'month')
       or definition.local_time is null
       or definition.local_time !~ '^([01][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$'
       or (definition.offset_value = 0 and definition.offset_unit <> 'day')
       or (definition.offset_unit = 'day' and definition.offset_value not between 0 and 365)
       or (definition.offset_unit = 'week' and definition.offset_value not between 1 and 52)
       or (definition.offset_unit = 'month' and definition.offset_value not between 1 and 24)
  ) then
    raise exception 'Invalid reminder definition' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_reminders)
      as definition(offset_value integer, offset_unit text, local_time text)
    group by definition.offset_value, definition.offset_unit, definition.local_time::time
    having count(*) > 1
  ) then
    raise exception 'Duplicate reminder definition' using errcode = '22023';
  end if;

  if v_recurrence_type = 'daily' and exists (
    select 1
    from jsonb_to_recordset(p_reminders)
      as definition(offset_value integer, offset_unit text, local_time text)
    where definition.offset_value <> 0 or definition.offset_unit <> 'day'
  ) then
    raise exception 'Daily chores only support due-date notifications' using errcode = '22023';
  end if;

  if exists (
    with definitions as (
      select *
      from jsonb_to_recordset(p_reminders)
        as definition(offset_value integer, offset_unit text, local_time text)
    ), occurrence_cadence as (
      select occurrence.scheduled_date,
             lag(occurrence.scheduled_date) over (order by occurrence.scheduled_date) previous_date
      from public.chore_occurrences occurrence
      where occurrence.chore_id = p_chore_id and occurrence.household_id = p_household_id
    )
    select 1
    from definitions definition
    cross join occurrence_cadence occurrence
    where definition.offset_value > 0
      and occurrence.previous_date is not null
      and private.reminder_offset_date(
        occurrence.scheduled_date, definition.offset_value, definition.offset_unit
      ) <= occurrence.previous_date
  ) then
    raise exception 'Reminder timing overlaps this chore cadence' using errcode = '22023';
  end if;

  update public.chore_reminders
  set enabled = false, selected = false, updated_at = now()
  where chore_id = p_chore_id and user_id = auth.uid() and reminder_type = p_reminder_type;

  insert into public.chore_reminders (
    household_id, chore_id, user_id, enabled, selected, reminder_type,
    offset_value, offset_unit, local_time, timezone
  )
  select p_household_id, p_chore_id, auth.uid(), p_enabled, true, p_reminder_type,
         definition.offset_value, definition.offset_unit, definition.local_time::time, p_timezone
  from jsonb_to_recordset(p_reminders)
    as definition(offset_value integer, offset_unit text, local_time text)
  on conflict (chore_id, user_id, reminder_type, offset_value, offset_unit, local_time) do update
  set enabled = excluded.enabled,
      selected = true,
      timezone = excluded.timezone,
      updated_at = now();

  return query
  select reminder.* from public.chore_reminders reminder
  where reminder.chore_id = p_chore_id
    and reminder.user_id = auth.uid()
    and reminder.reminder_type = p_reminder_type
    and reminder.selected
  order by reminder.offset_unit, reminder.offset_value, reminder.local_time;
end;
$$;

create function public.claim_due_reminder_deliveries(p_now timestamptz default now())
returns table (
  delivery_id uuid, reminder_id uuid, occurrence_id uuid, user_id uuid,
  chore_id uuid, chore_name text, scheduled_date date, scheduled_for timestamptz,
  offset_value integer, offset_unit text
)
language sql security definer set search_path = ''
as $$
  with candidates as (
    select reminder.id reminder_id, occurrence.id occurrence_id, reminder.user_id,
           chore.id chore_id, chore.name chore_name, occurrence.scheduled_date,
           (schedule.reminder_date + reminder.local_time)
             at time zone reminder.timezone scheduled_for,
           reminder.offset_value, reminder.offset_unit
    from public.chore_reminders reminder
    join public.chores chore on chore.id = reminder.chore_id and chore.household_id = reminder.household_id
    join public.chore_occurrences occurrence
      on occurrence.chore_id = chore.id and occurrence.household_id = reminder.household_id
    cross join lateral (
      select private.reminder_offset_date(
        occurrence.scheduled_date, reminder.offset_value, reminder.offset_unit
      ) reminder_date
    ) schedule
    where reminder.enabled and reminder.selected and reminder.reminder_type = 'due_time'
      and chore.is_active and occurrence.status = 'scheduled'
      and not exists (
        select 1 from public.chore_occurrences previous
        where previous.chore_id = occurrence.chore_id
          and previous.household_id = occurrence.household_id
          and previous.scheduled_date < occurrence.scheduled_date
          and previous.scheduled_date >= schedule.reminder_date
      )
      and ((schedule.reminder_date + reminder.local_time) at time zone reminder.timezone) <= p_now
      and ((schedule.reminder_date + reminder.local_time) at time zone reminder.timezone) > p_now - interval '10 minutes'
  ), inserted as (
    insert into public.reminder_deliveries (reminder_id, occurrence_id, user_id, scheduled_for)
    select reminder_id, occurrence_id, user_id, scheduled_for from candidates
    on conflict (reminder_id, occurrence_id) do nothing
    returning id, reminder_id, occurrence_id, user_id, scheduled_for
  )
  select inserted.id, inserted.reminder_id, inserted.occurrence_id, inserted.user_id,
         candidates.chore_id, candidates.chore_name, candidates.scheduled_date,
         inserted.scheduled_for, candidates.offset_value, candidates.offset_unit
  from inserted join candidates using (reminder_id, occurrence_id, user_id, scheduled_for);
$$;

revoke all on function public.upsert_chore_reminder_v2(uuid, uuid, boolean, text, text, jsonb)
  from public, anon;
grant execute on function public.upsert_chore_reminder_v2(uuid, uuid, boolean, text, text, jsonb)
  to authenticated;

revoke all on function public.claim_due_reminder_deliveries(timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_due_reminder_deliveries(timestamptz) to service_role;

-- Phase 6: multiple human-scale lead times for personal chore reminders.
-- Existing reminders remain selected same-day reminders through these defaults.

alter table public.chore_reminders
  add column lead_days smallint not null default 0
    check (lead_days in (0, 1, 2, 3, 7)),
  add column selected boolean not null default true;

alter table public.chore_reminders drop constraint chore_reminders_unique;
alter table public.chore_reminders
  add constraint chore_reminders_unique
  unique (chore_id, user_id, reminder_type, lead_days);

-- Keep the Phase 5 RPC usable for an older client during a rolling deployment.
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
    household_id, chore_id, user_id, enabled, selected, reminder_type, local_time, timezone, lead_days
  ) values (
    p_household_id, p_chore_id, auth.uid(), p_enabled, true, p_reminder_type, p_local_time, p_timezone, 0
  )
  on conflict (chore_id, user_id, reminder_type, lead_days) do update
  set enabled = excluded.enabled,
      selected = true,
      local_time = excluded.local_time,
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
  p_local_time time,
  p_timezone text,
  p_lead_days integer[]
)
returns setof public.chore_reminders
language plpgsql security definer set search_path = ''
as $$
declare
  v_lead_days smallint[];
  v_recurrence_type text;
  v_interval_count integer;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Not authorized for this household' using errcode = '42501';
  end if;

  select recurrence_type, interval_count
  into v_recurrence_type, v_interval_count
  from public.chores
  where id = p_chore_id and household_id = p_household_id;
  if not found then raise exception 'Chore not found' using errcode = 'P0002'; end if;

  if p_reminder_type <> 'due_time'
    or exists (
      select 1 from unnest(coalesce(p_lead_days, array[]::integer[])) as lead_day
      where lead_day not in (0, 1, 2, 3, 7)
    ) then
    raise exception 'Unsupported reminder timing' using errcode = '22023';
  end if;
  if p_local_time is null or not exists (select 1 from pg_catalog.pg_timezone_names where name = p_timezone) then
    raise exception 'Invalid reminder time or timezone' using errcode = '22023';
  end if;

  select coalesce(array_agg(distinct lead_day::smallint order by lead_day::smallint), array[]::smallint[])
  into v_lead_days
  from unnest(coalesce(p_lead_days, array[]::integer[])) as lead_day;
  if cardinality(v_lead_days) = 0 then
    raise exception 'Choose at least one reminder timing' using errcode = '22023';
  end if;
  if exists (
    select 1 from unnest(v_lead_days) as lead_day
    where (v_recurrence_type = 'daily' and lead_day <> 0)
       or (v_recurrence_type = 'interval_days' and lead_day >= v_interval_count)
       or (v_recurrence_type = 'weekly' and lead_day >= 7)
       or (v_recurrence_type = 'interval_weeks' and lead_day >= v_interval_count * 7)
  ) then
    raise exception 'Reminder timing overlaps this chore cadence' using errcode = '22023';
  end if;

  update public.chore_reminders
  set enabled = false, selected = false, updated_at = now()
  where chore_id = p_chore_id and user_id = auth.uid() and reminder_type = p_reminder_type;

  insert into public.chore_reminders (
    household_id, chore_id, user_id, enabled, selected, reminder_type, local_time, timezone, lead_days
  )
  select p_household_id, p_chore_id, auth.uid(), p_enabled, true,
         p_reminder_type, p_local_time, p_timezone, lead_day
  from unnest(v_lead_days) as lead_day
  on conflict (chore_id, user_id, reminder_type, lead_days) do update
  set enabled = excluded.enabled,
      selected = true,
      local_time = excluded.local_time,
      timezone = excluded.timezone,
      updated_at = now();

  return query
  select reminder.* from public.chore_reminders reminder
  where reminder.chore_id = p_chore_id
    and reminder.user_id = auth.uid()
    and reminder.reminder_type = p_reminder_type
    and reminder.selected
  order by reminder.lead_days;
end;
$$;

drop function public.claim_due_reminder_deliveries(timestamptz);

create function public.claim_due_reminder_deliveries(p_now timestamptz default now())
returns table (
  delivery_id uuid, reminder_id uuid, occurrence_id uuid, user_id uuid,
  chore_id uuid, chore_name text, scheduled_date date, scheduled_for timestamptz,
  lead_days smallint
)
language sql security definer set search_path = ''
as $$
  with candidates as (
    select reminder.id reminder_id, occurrence.id occurrence_id, reminder.user_id,
           chore.id chore_id, chore.name chore_name, occurrence.scheduled_date,
           ((occurrence.scheduled_date - reminder.lead_days) + reminder.local_time)
             at time zone reminder.timezone scheduled_for,
           reminder.lead_days
    from public.chore_reminders reminder
    join public.chores chore on chore.id = reminder.chore_id and chore.household_id = reminder.household_id
    join public.chore_occurrences occurrence
      on occurrence.chore_id = chore.id and occurrence.household_id = reminder.household_id
    where reminder.enabled and reminder.selected and reminder.reminder_type = 'due_time'
      and chore.is_active and occurrence.status = 'scheduled'
      and (
        (chore.recurrence_type = 'daily' and reminder.lead_days = 0)
        or (chore.recurrence_type = 'interval_days' and reminder.lead_days < chore.interval_count)
        or (chore.recurrence_type = 'weekly' and reminder.lead_days < 7)
        or (chore.recurrence_type = 'interval_weeks' and reminder.lead_days < chore.interval_count * 7)
        or chore.recurrence_type = 'monthly'
      )
      and (((occurrence.scheduled_date - reminder.lead_days) + reminder.local_time)
        at time zone reminder.timezone) <= p_now
      and (((occurrence.scheduled_date - reminder.lead_days) + reminder.local_time)
        at time zone reminder.timezone) > p_now - interval '10 minutes'
  ), inserted as (
    insert into public.reminder_deliveries (reminder_id, occurrence_id, user_id, scheduled_for)
    select reminder_id, occurrence_id, user_id, scheduled_for from candidates
    on conflict (reminder_id, occurrence_id) do nothing
    returning id, reminder_id, occurrence_id, user_id, scheduled_for
  )
  select inserted.id, inserted.reminder_id, inserted.occurrence_id, inserted.user_id,
         candidates.chore_id, candidates.chore_name, candidates.scheduled_date,
         inserted.scheduled_for, candidates.lead_days
  from inserted join candidates using (reminder_id, occurrence_id, user_id, scheduled_for);
$$;

revoke all on function public.upsert_chore_reminder_v2(uuid, uuid, boolean, text, time, text, integer[])
  from public, anon;
grant execute on function public.upsert_chore_reminder_v2(uuid, uuid, boolean, text, time, text, integer[])
  to authenticated;

revoke all on function public.claim_due_reminder_deliveries(timestamptz)
  from public, anon, authenticated;
grant execute on function public.claim_due_reminder_deliveries(timestamptz) to service_role;

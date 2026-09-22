-- Phase 5: personal reminders, multi-device push subscriptions, and idempotent delivery claims.

create table public.chore_reminders (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  chore_id uuid not null references public.chores(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  enabled boolean not null default true,
  reminder_type text not null default 'due_time' check (reminder_type in ('due_time')),
  local_time time not null,
  timezone text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chore_reminders_chore_household_fkey
    foreign key (chore_id, household_id) references public.chores(id, household_id) on delete cascade,
  constraint chore_reminders_unique unique (chore_id, user_id, reminder_type)
);

create index chore_reminders_user_chore_idx on public.chore_reminders (user_id, chore_id);
create index chore_reminders_enabled_idx on public.chore_reminders (enabled, household_id) where enabled;

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  device_label text,
  user_agent text,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now()
);

create index push_subscriptions_user_idx on public.push_subscriptions (user_id, last_seen_at desc);

create table public.reminder_deliveries (
  id uuid primary key default gen_random_uuid(),
  reminder_id uuid not null references public.chore_reminders(id) on delete cascade,
  occurrence_id uuid not null references public.chore_occurrences(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  scheduled_for timestamptz not null,
  status text not null default 'pending' check (status in ('pending', 'sent', 'suppressed', 'failed')),
  attempted_at timestamptz,
  delivered_at timestamptz,
  error_message text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reminder_deliveries_unique unique (reminder_id, occurrence_id)
);

create index reminder_deliveries_user_created_idx on public.reminder_deliveries (user_id, created_at desc);
create index reminder_deliveries_pending_idx on public.reminder_deliveries (status, scheduled_for) where status = 'pending';

alter table public.chore_reminders enable row level security;
alter table public.push_subscriptions enable row level security;
alter table public.reminder_deliveries enable row level security;

create policy "Users can read their own reminders"
on public.chore_reminders for select to authenticated
using (user_id = auth.uid() and private.is_household_member(household_id));

create policy "Users can read their own push subscriptions"
on public.push_subscriptions for select to authenticated
using (user_id = auth.uid());

create policy "Users can read their own reminder deliveries"
on public.reminder_deliveries for select to authenticated
using (user_id = auth.uid());

revoke all on public.chore_reminders from anon, authenticated;
revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.reminder_deliveries from anon, authenticated;
grant select on public.chore_reminders, public.push_subscriptions, public.reminder_deliveries to authenticated;
grant all on public.chore_reminders, public.push_subscriptions, public.reminder_deliveries to service_role;

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
    household_id, chore_id, user_id, enabled, reminder_type, local_time, timezone
  ) values (
    p_household_id, p_chore_id, auth.uid(), p_enabled, p_reminder_type, p_local_time, p_timezone
  )
  on conflict (chore_id, user_id, reminder_type) do update
  set enabled = excluded.enabled,
      local_time = excluded.local_time,
      timezone = excluded.timezone,
      updated_at = now()
  returning * into v_reminder;
  return next v_reminder;
end;
$$;

create or replace function public.register_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_device_label text,
  p_user_agent text
)
returns setof public.push_subscriptions
language plpgsql security definer set search_path = ''
as $$
declare v_subscription public.push_subscriptions%rowtype;
declare v_existing_user uuid;
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  if coalesce(length(p_endpoint), 0) < 16 or coalesce(length(p_p256dh), 0) < 8 or coalesce(length(p_auth), 0) < 8 then
    raise exception 'Invalid push subscription' using errcode = '22023';
  end if;
  select user_id into v_existing_user from public.push_subscriptions where endpoint = p_endpoint;
  if v_existing_user is not null and v_existing_user <> auth.uid() then
    raise exception 'Subscription belongs to another user' using errcode = '42501';
  end if;
  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, device_label, user_agent)
  values (auth.uid(), p_endpoint, p_p256dh, p_auth, nullif(trim(p_device_label), ''), p_user_agent)
  on conflict (endpoint) do update
  set p256dh = excluded.p256dh, auth = excluded.auth,
      device_label = excluded.device_label, user_agent = excluded.user_agent,
      last_seen_at = now()
  where public.push_subscriptions.user_id = auth.uid()
  returning * into v_subscription;
  if v_subscription.id is null then
    raise exception 'Subscription belongs to another user' using errcode = '42501';
  end if;
  return next v_subscription;
end;
$$;

create or replace function public.remove_push_subscription(p_endpoint text)
returns boolean language plpgsql security definer set search_path = ''
as $$
begin
  if auth.uid() is null then raise exception 'Authentication required' using errcode = '42501'; end if;
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
  return found;
end;
$$;

create or replace function public.claim_due_reminder_deliveries(p_now timestamptz default now())
returns table (
  delivery_id uuid, reminder_id uuid, occurrence_id uuid, user_id uuid,
  chore_id uuid, chore_name text, scheduled_date date, scheduled_for timestamptz
)
language sql security definer set search_path = ''
as $$
  with candidates as (
    select reminder.id reminder_id, occurrence.id occurrence_id, reminder.user_id,
           chore.id chore_id, chore.name chore_name, occurrence.scheduled_date,
           (occurrence.scheduled_date + reminder.local_time) at time zone reminder.timezone scheduled_for
    from public.chore_reminders reminder
    join public.chores chore on chore.id = reminder.chore_id and chore.household_id = reminder.household_id
    join public.chore_occurrences occurrence
      on occurrence.chore_id = chore.id and occurrence.household_id = reminder.household_id
    where reminder.enabled and reminder.reminder_type = 'due_time'
      and chore.is_active and occurrence.status = 'scheduled'
      and ((occurrence.scheduled_date + reminder.local_time) at time zone reminder.timezone) <= p_now
      and ((occurrence.scheduled_date + reminder.local_time) at time zone reminder.timezone) > p_now - interval '10 minutes'
  ), inserted as (
    insert into public.reminder_deliveries (reminder_id, occurrence_id, user_id, scheduled_for)
    select reminder_id, occurrence_id, user_id, scheduled_for from candidates
    on conflict (reminder_id, occurrence_id) do nothing
    returning id, reminder_id, occurrence_id, user_id, scheduled_for
  )
  select inserted.id, inserted.reminder_id, inserted.occurrence_id, inserted.user_id,
         candidates.chore_id, candidates.chore_name, candidates.scheduled_date, inserted.scheduled_for
  from inserted join candidates using (reminder_id, occurrence_id, user_id, scheduled_for);
$$;

create or replace function public.finish_reminder_delivery(
  p_delivery_id uuid, p_status text, p_error_message text default null
)
returns void language plpgsql security definer set search_path = ''
as $$
begin
  if p_status not in ('sent', 'suppressed', 'failed') then
    raise exception 'Invalid delivery status' using errcode = '22023';
  end if;
  update public.reminder_deliveries
  set status = p_status, attempted_at = now(),
      delivered_at = case when p_status = 'sent' then now() else delivered_at end,
      error_message = p_error_message, updated_at = now()
  where id = p_delivery_id and status = 'pending';
end;
$$;

revoke all on function public.upsert_chore_reminder(uuid, uuid, boolean, text, time, text) from public, anon;
revoke all on function public.register_push_subscription(text, text, text, text, text) from public, anon;
revoke all on function public.remove_push_subscription(text) from public, anon;
revoke all on function public.claim_due_reminder_deliveries(timestamptz) from public, anon, authenticated;
revoke all on function public.finish_reminder_delivery(uuid, text, text) from public, anon, authenticated;
grant execute on function public.upsert_chore_reminder(uuid, uuid, boolean, text, time, text) to authenticated;
grant execute on function public.register_push_subscription(text, text, text, text, text) to authenticated;
grant execute on function public.remove_push_subscription(text) to authenticated;
grant execute on function public.claim_due_reminder_deliveries(timestamptz) to service_role;
grant execute on function public.finish_reminder_delivery(uuid, text, text) to service_role;

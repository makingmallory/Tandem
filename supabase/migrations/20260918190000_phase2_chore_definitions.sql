-- Phase 2: shared household chore definitions only.
-- Occurrences, completion history, realtime completion syncing, and reminders
-- intentionally remain out of scope. Chores are shared and never assigned.

create table public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  name text not null constraint chores_name_length check (
    char_length(trim(name)) between 1 and 100
  ),
  description text null constraint chores_description_length check (
    description is null or char_length(description) <= 500
  ),
  icon_key text not null constraint chores_icon_key check (
    icon_key in (
      'paw', 'trash', 'sparkle', 'bed', 'laundry', 'utensils', 'plants',
      'bathtub', 'toilet', 'vacuum', 'broom', 'dishes', 'groceries', 'car',
      'package', 'home', 'checklist'
    )
  ),
  accent_key text not null constraint chores_accent_key check (
    accent_key in ('rose', 'sky', 'amber', 'lavender', 'mint', 'peach', 'teal')
  ),
  recurrence_type text not null constraint chores_recurrence_type check (
    recurrence_type in ('daily', 'interval_days', 'weekly', 'interval_weeks', 'monthly')
  ),
  interval_count integer not null default 1 constraint chores_interval_count check (
    interval_count between 1 and 52
  ),
  anchor_date date not null default current_date,
  weekdays smallint[] null,
  day_of_month smallint null,
  is_active boolean not null default true,
  created_by uuid not null references public.profiles (id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chores_recurrence_shape check (
    (
      recurrence_type in ('daily', 'interval_days')
      and weekdays is null
      and day_of_month is null
    )
    or (
      recurrence_type in ('weekly', 'interval_weeks')
      and cardinality(weekdays) between 1 and 7
      and weekdays <@ array[0, 1, 2, 3, 4, 5, 6]::smallint[]
      and day_of_month is null
    )
    or (
      recurrence_type = 'monthly'
      and weekdays is null
      and day_of_month between 1 and 31
    )
  ),
  constraint chores_standard_interval_count check (
    recurrence_type in ('interval_days', 'interval_weeks') or interval_count = 1
  )
);

create index chores_household_active_name_idx
on public.chores (household_id, is_active desc, name);

create index chores_household_updated_at_idx
on public.chores (household_id, updated_at desc);

create index chores_created_by_idx on public.chores (created_by);

create trigger chores_set_updated_at
before update on public.chores
for each row execute function private.set_updated_at();

alter table public.chores enable row level security;

create policy "chores_select_household_members"
on public.chores
for select
to authenticated
using ((select private.is_household_member(household_id)));

create policy "chores_insert_household_members"
on public.chores
for insert
to authenticated
with check (
  (select private.is_household_member(household_id))
  and created_by = (select auth.uid())
);

create policy "chores_update_household_members"
on public.chores
for update
to authenticated
using ((select private.is_household_member(household_id)))
with check ((select private.is_household_member(household_id)));

revoke all on table public.chores from anon, authenticated;
grant select on table public.chores to authenticated;
grant insert (
  household_id,
  name,
  description,
  icon_key,
  accent_key,
  recurrence_type,
  interval_count,
  anchor_date,
  weekdays,
  day_of_month,
  created_by
) on table public.chores to authenticated;
grant update (
  name,
  description,
  icon_key,
  accent_key,
  recurrence_type,
  interval_count,
  anchor_date,
  weekdays,
  day_of_month,
  is_active
) on table public.chores to authenticated;

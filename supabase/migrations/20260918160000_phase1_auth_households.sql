-- Phase 1: profiles, households, household membership, and their access boundary.
-- Chores, occurrences, history, realtime subscriptions, and reminders intentionally
-- do not belong in this migration.

create schema if not exists private;

revoke all on schema private from public;
revoke all on schema private from anon;
grant usage on schema private to authenticated;

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null constraint profiles_display_name_length check (
    char_length(trim(display_name)) between 1 and 80
  ),
  avatar_key text null constraint profiles_avatar_key_length check (
    avatar_key is null or char_length(avatar_key) between 1 and 40
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null constraint households_name_length check (
    char_length(trim(name)) between 1 and 80
  ),
  created_by uuid not null references public.profiles (id) on delete restrict,
  invite_code text not null default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint households_invite_code_format check (invite_code ~ '^[A-F0-9]{12}$'),
  constraint households_invite_code_unique unique (invite_code)
);

create table public.household_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null constraint household_members_role check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  constraint household_members_household_user_unique unique (household_id, user_id),
  constraint household_members_one_active_household unique (user_id)
);

create index households_created_by_idx on public.households (created_by);
create index household_members_household_id_idx on public.household_members (household_id);

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

create trigger households_set_updated_at
before update on public.households
for each row execute function private.set_updated_at();

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  requested_name text;
begin
  requested_name := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');

  insert into public.profiles (id, display_name)
  values (
    new.id,
    left(coalesce(requested_name, nullif(split_part(new.email, '@', 1), ''), 'Home member'), 80)
  );

  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

create function private.is_household_member(target_household_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.household_members membership
      where membership.household_id = target_household_id
        and membership.user_id = (select auth.uid())
    );
$$;

create function private.shares_household(target_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.household_members current_membership
      join public.household_members target_membership
        on target_membership.household_id = current_membership.household_id
      where current_membership.user_id = (select auth.uid())
        and target_membership.user_id = target_user_id
    );
$$;

create function private.create_household(household_name text)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  new_household public.households;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if exists (
    select 1 from public.household_members where user_id = current_user_id
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a household.';
  end if;

  insert into public.households (name, created_by)
  values (trim(household_name), current_user_id)
  returning * into new_household;

  insert into public.household_members (household_id, user_id, role)
  values (new_household.id, current_user_id, 'owner');

  return query
  select new_household.id, new_household.name, new_household.invite_code;
end;
$$;

create function private.join_household(household_invite_code text)
returns table (id uuid, name text, invite_code text)
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_user_id uuid := (select auth.uid());
  matched_household public.households;
begin
  if current_user_id is null then
    raise exception using errcode = '42501', message = 'Authentication is required.';
  end if;

  if exists (
    select 1 from public.household_members where user_id = current_user_id
  ) then
    raise exception using errcode = '23505', message = 'You already belong to a household.';
  end if;

  select household.*
  into matched_household
  from public.households household
  where household.invite_code = upper(trim(household_invite_code));

  if matched_household.id is null then
    raise exception using errcode = 'P0002', message = 'That invite code was not found.';
  end if;

  insert into public.household_members (household_id, user_id, role)
  values (matched_household.id, current_user_id, 'member');

  return query
  select matched_household.id, matched_household.name, matched_household.invite_code;
end;
$$;

-- Public functions are security-invoker entry points for PostgREST. Elevated
-- implementations stay in the non-exposed private schema with pinned paths.
create function public.create_household(household_name text)
returns table (id uuid, name text, invite_code text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.create_household(household_name);
$$;

create function public.join_household(household_invite_code text)
returns table (id uuid, name text, invite_code text)
language sql
security invoker
set search_path = ''
as $$
  select * from private.join_household(household_invite_code);
$$;

alter table public.profiles enable row level security;
alter table public.households enable row level security;
alter table public.household_members enable row level security;

create policy "profiles_select_self_or_household_members"
on public.profiles
for select
to authenticated
using (
  id = (select auth.uid())
  or (select private.shares_household(id))
);

create policy "profiles_update_self"
on public.profiles
for update
to authenticated
using (id = (select auth.uid()))
with check (id = (select auth.uid()));

create policy "households_select_members"
on public.households
for select
to authenticated
using ((select private.is_household_member(id)));

create policy "households_update_members"
on public.households
for update
to authenticated
using ((select private.is_household_member(id)))
with check ((select private.is_household_member(id)));

create policy "household_members_select_fellow_members"
on public.household_members
for select
to authenticated
using ((select private.is_household_member(household_id)));

revoke all on table public.profiles from anon, authenticated;
revoke all on table public.households from anon, authenticated;
revoke all on table public.household_members from anon, authenticated;

grant select on table public.profiles to authenticated;
grant update (display_name, avatar_key) on table public.profiles to authenticated;

grant select on table public.households to authenticated;
grant update (name) on table public.households to authenticated;

grant select on table public.household_members to authenticated;

revoke all on function private.is_household_member(uuid) from public;
revoke all on function private.shares_household(uuid) from public;
revoke all on function private.create_household(text) from public;
revoke all on function private.join_household(text) from public;
revoke all on function private.set_updated_at() from public;
revoke all on function private.handle_new_user() from public;
revoke all on function public.create_household(text) from public;
revoke all on function public.join_household(text) from public;

grant execute on function private.is_household_member(uuid) to authenticated;
grant execute on function private.shares_household(uuid) to authenticated;
grant execute on function private.create_household(text) to authenticated;
grant execute on function private.join_household(text) to authenticated;
grant execute on function public.create_household(text) to authenticated;
grant execute on function public.join_household(text) to authenticated;

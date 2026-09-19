begin;

create extension if not exists pgtap with schema extensions;
select plan(12);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('41111111-1111-4111-8111-111111111111', 'chore-owner@example.com', '{"display_name":"Chore Owner"}'),
  ('42222222-2222-4222-8222-222222222222', 'chore-member@example.com', '{"display_name":"Chore Member"}'),
  ('43333333-3333-4333-8333-333333333333', 'chore-outsider@example.com', '{"display_name":"Chore Outsider"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '41111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$ select * from public.create_household('Phase 2 home') $$,
  'the owner can create a household for chore tests'
);

reset role;
create temp table phase2_context as
select id as household_id, invite_code
from public.households
where created_by = '41111111-1111-4111-8111-111111111111';
grant select on table phase2_context to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '42222222-2222-4222-8222-222222222222', true);

select lives_ok(
  $$ select * from public.join_household((select invite_code from phase2_context)) $$,
  'a second household member can join'
);

select set_config('request.jwt.claim.sub', '41111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$
    insert into public.chores (
      household_id, name, icon_key, accent_key, recurrence_type,
      interval_count, anchor_date, weekdays, created_by
    ) values (
      (select household_id from phase2_context),
      'Take out trash', 'trash', 'amber', 'weekly',
      1, '2026-09-18', array[1]::smallint[],
      '41111111-1111-4111-8111-111111111111'
    )
  $$,
  'a member can create a valid shared chore'
);

select set_config('request.jwt.claim.sub', '42222222-2222-4222-8222-222222222222', true);

select results_eq(
  $$ select count(*) from public.chores $$,
  array[1::bigint],
  'a fellow household member can read the chore'
);

select results_eq(
  $$ update public.chores set name = 'Bins to curb' returning 1 $$,
  array[1],
  'a fellow household member can edit the chore definition'
);

select results_eq(
  $$ update public.chores set is_active = false returning is_active $$,
  array[false],
  'a fellow household member can pause the chore'
);

select results_eq(
  $$ update public.chores set is_active = true returning is_active $$,
  array[true],
  'a fellow household member can resume the chore'
);

select set_config('request.jwt.claim.sub', '43333333-3333-4333-8333-333333333333', true);

select results_eq(
  $$ select count(*) from public.chores $$,
  array[0::bigint],
  'a user outside the household cannot read its chores'
);

select results_eq(
  $$ update public.chores set name = 'Hacked' returning 1 $$,
  $$ values (null::integer) limit 0 $$,
  'a user outside the household cannot update its chores'
);

select throws_ok(
  $$
    insert into public.chores (
      household_id, name, icon_key, accent_key, recurrence_type,
      interval_count, anchor_date, weekdays, created_by
    ) values (
      (select household_id from phase2_context),
      'Intrusion', 'home', 'teal', 'weekly',
      1, '2026-09-18', array[2]::smallint[],
      '43333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "chores"',
  'a user outside the household cannot create a chore there'
);

select set_config('request.jwt.claim.sub', '41111111-1111-4111-8111-111111111111', true);

select throws_ok(
  $$
    insert into public.chores (
      household_id, name, icon_key, accent_key, recurrence_type,
      interval_count, anchor_date, weekdays, created_by
    ) values (
      (select household_id from phase2_context),
      'Spoofed creator', 'home', 'teal', 'weekly',
      1, '2026-09-18', array[2]::smallint[],
      '43333333-3333-4333-8333-333333333333'
    )
  $$,
  '42501',
  'new row violates row-level security policy for table "chores"',
  'a member cannot spoof who created the chore'
);

reset role;
select results_eq(
  $$
    select count(*)
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'chores'
      and column_name in ('assignment_mode', 'assigned_user_id')
  $$,
  array[0::bigint],
  'the chore model contains no responsibility columns'
);

select * from finish();
rollback;

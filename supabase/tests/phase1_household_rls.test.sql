begin;

create extension if not exists pgtap with schema extensions;
select plan(14);

insert into auth.users (id, email, raw_user_meta_data)
values
  ('11111111-1111-4111-8111-111111111111', 'owner@example.com', '{"display_name":"Owner"}'),
  ('22222222-2222-4222-8222-222222222222', 'member@example.com', '{"display_name":"Member"}'),
  ('33333333-3333-4333-8333-333333333333', 'outsider@example.com', '{"display_name":"Outsider"}');

set local role authenticated;
select set_config('request.jwt.claim.sub', '11111111-1111-4111-8111-111111111111', true);

select lives_ok(
  $$ select * from public.create_household('Owner and Member') $$,
  'an authenticated user can atomically create their household'
);

reset role;
create temp table phase1_context as
select id as household_id, invite_code
from public.households
where created_by = '11111111-1111-4111-8111-111111111111';
grant select on table phase1_context to authenticated;

set local role authenticated;
select set_config('request.jwt.claim.sub', '22222222-2222-4222-8222-222222222222', true);

select results_eq(
  $$ select count(*) from public.households $$,
  array[0::bigint],
  'an outsider cannot read another household'
);

select results_eq(
  $$ select count(*) from public.household_members $$,
  array[0::bigint],
  'an outsider cannot enumerate another household membership'
);

select results_eq(
  $$ select count(*) from public.profiles where id = '11111111-1111-4111-8111-111111111111' $$,
  array[0::bigint],
  'an outsider cannot read another profile'
);

select results_eq(
  $$ update public.households set name = 'Hacked' returning 1 $$,
  $$ values (null::integer) limit 0 $$,
  'an outsider cannot update another household'
);

select throws_ok(
  $$ insert into public.households (name, created_by) values ('Bypass', '22222222-2222-4222-8222-222222222222') $$,
  '42501',
  'permission denied for table households',
  'direct household inserts are denied'
);

select lives_ok(
  $$ select * from public.join_household((select invite_code from phase1_context)) $$,
  'an outsider can join only through an exact invite code'
);

select results_eq(
  $$ select count(*) from public.households $$,
  array[1::bigint],
  'a joined member can read the shared household'
);

select results_eq(
  $$ select count(*) from public.household_members $$,
  array[2::bigint],
  'a joined member can read fellow members'
);

select results_eq(
  $$ select count(*) from public.profiles $$,
  array[2::bigint],
  'a joined member can read household profiles but not outsiders'
);

select throws_ok(
  $$ select * from public.create_household('A second household') $$,
  '23505',
  'You already belong to a household.',
  'a user cannot create a second active household'
);

select set_config('request.jwt.claim.sub', '33333333-3333-4333-8333-333333333333', true);

select results_eq(
  $$ select count(*) from public.households $$,
  array[0::bigint],
  'a non-member remains unable to read the household after another user joins'
);

select results_eq(
  $$ update public.households set name = 'Still hacked' returning 1 $$,
  $$ values (null::integer) limit 0 $$,
  'a non-member remains unable to modify the household'
);

select throws_ok(
  $$ select * from public.join_household('FFFFFFFFFFFF') $$,
  'P0002',
  'That invite code was not found.',
  'an invalid invite code reveals no household data'
);

select * from finish();
rollback;

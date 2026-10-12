begin;
create extension if not exists pgtap with schema extensions;
select plan(11);

insert into auth.users(id,email,raw_user_meta_data) values
  ('85111111-1111-4111-8111-111111111111','phase8-home@example.com','{}'),
  ('85222222-2222-4222-8222-222222222222','phase8-other@example.com','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','85111111-1111-4111-8111-111111111111',true);
select * from public.create_household('Phase 8 test home');
reset role;
create temp table phase8_context as select id household_id, null::uuid room_id, null::uuid chore_id
from public.households where created_by='85111111-1111-4111-8111-111111111111';
grant select on phase8_context to authenticated;
set local role authenticated;
select lives_ok($$ insert into public.rooms(household_id,name) select household_id,'Master Bathroom' from phase8_context $$,'members create custom rooms');
reset role;
update phase8_context set room_id=(select id from public.rooms where name='Master Bathroom');
set local role authenticated;
select throws_ok($$ insert into public.rooms(household_id,name) select household_id,' master bathroom ' from phase8_context $$,
  '23505','duplicate key value violates unique constraint "rooms_household_name_unique"','names normalize for uniqueness');
select lives_ok($$
  select * from public.save_chore_plan((select household_id from phase8_context),null,
    jsonb_build_object('name','Clean Bathroom','description',null,'icon_key','bathtub','accent_key','sky',
      'subtasks','[{"id":null,"title":"Clean toilet"}]'::jsonb,
      'targets',jsonb_build_array(jsonb_build_object('room_id',(select room_id from phase8_context),
        'recurrence_type','weekly','interval_count',1,'anchor_date','2026-10-14','weekdays',jsonb_build_array(3),
        'day_of_month',null,'occurrence_dates',jsonb_build_array('2026-10-14','2026-10-21')))), '2026-10-12')
$$,'routine target and ordered instructions save atomically');
reset role;
update phase8_context set chore_id=(select id from public.chores where room_id=(select room_id from phase8_context));
set local role authenticated;
select results_eq($$ select position from public.routine_subtasks $$,array[0],'subtask order is stable');
select lives_ok($$ select * from public.complete_occurrence(
  (select id from public.chore_occurrences where scheduled_date='2026-10-14'),(select household_id from phase8_context)) $$,'a room target completes through the existing RPC');
select lives_ok($$ select public.archive_room((select household_id from phase8_context),(select room_id from phase8_context)) $$,'room removal archives related work');
select results_eq($$ select count(*) from public.occurrence_completions $$,array[1::bigint],'completion remains intact');
select results_eq($$ select count(*) from public.chores where retired_at is null $$,array[0::bigint],'retired chores leave active management');
select results_eq($$ select count(*) from public.chore_occurrences where status='scheduled' $$,array[0::bigint],'no pending work remains');
select set_config('request.jwt.claim.sub','85222222-2222-4222-8222-222222222222',true);
select results_eq($$ select count(*) from public.rooms $$,array[0::bigint],'outsiders cannot read rooms');
select results_eq($$ select count(*) from public.routine_subtasks $$,array[0::bigint],'outsiders cannot read instructions');
select * from finish();
rollback;

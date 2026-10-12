begin;
create extension if not exists pgtap with schema extensions;
select plan(8);
insert into auth.users(id,email,raw_user_meta_data) values('96111111-1111-4111-8111-111111111111','checklist-tests@example.com','{}');
set local role authenticated;
select set_config('request.jwt.claim.sub','96111111-1111-4111-8111-111111111111',true);
select * from public.create_household('Checklist tests');
reset role;
create temp table category_test_context as select id household_id,null::uuid chore_id,null::uuid occurrence_id from public.households
where created_by='96111111-1111-4111-8111-111111111111';
grant select on category_test_context to authenticated;
set local role authenticated;
select lives_ok($$
 select * from public.save_chore_plan((select household_id from category_test_context),null,
  '{"kind":"category","name":"Laundry","icon_key":"laundry","accent_key":"mint","description":null,
    "variants":[],"subtasks":[{"id":null,"title":"Wash"},{"id":null,"title":"Dry"}],
    "targets":[{"key":"one","room_id":null,"variant_key":null,"recurrence_type":"daily","interval_count":1,
      "anchor_date":"2026-10-14","weekdays":null,"day_of_month":null,"occurrence_dates":["2026-10-14"]}]}'::jsonb,'2026-10-12')
$$,'a zero-room category saves with ordered subtasks');
reset role;
update category_test_context set chore_id=(select id from public.chores where name='Laundry'),
  occurrence_id=(select id from public.chore_occurrences where chore_id=(select id from public.chores where name='Laundry'));
set local role authenticated;
select results_eq($$ select count(*) from public.occurrence_subtasks $$,array[2::bigint],'applicable subtasks materialize per occurrence');
select lives_ok($$ select * from public.set_occurrence_subtask((select household_id from category_test_context),
  (select occurrence_id from category_test_context),(select id from public.occurrence_subtasks where title='Wash'),true) $$,'individual checkoff persists');
select results_eq($$ select status from public.chore_occurrences $$,array['scheduled'::text],'partial progress remains scheduled');
select lives_ok($$ select * from public.complete_occurrence((select occurrence_id from category_test_context),(select household_id from category_test_context)) $$,'parent Complete completes all');
select results_eq($$ select count(*) from public.occurrence_subtasks where completed_at is not null $$,array[2::bigint],'parent and checklist agree');
select lives_ok($$ select * from public.undo_occurrence_completion((select occurrence_id from category_test_context),(select household_id from category_test_context)) $$,'parent Undo clears checklist');
select results_eq($$ select count(*) from public.occurrence_subtasks where completed_at is not null $$,array[0::bigint],'Undo leaves no checked subtasks');
select * from finish();
rollback;

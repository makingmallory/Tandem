-- Narrow target-level editing for existing Phase 8 Categories. This leaves
-- Category definitions and sibling targets under the existing plan-save API.
create function private.refresh_future_target_checklists(p_chore_id uuid, p_today date)
returns void language plpgsql set search_path='' as $$
declare v_id uuid;
begin
  for v_id in
    select occurrence.id
    from public.chore_occurrences occurrence
    join public.chores chore on chore.id=occurrence.chore_id
    where chore.id=p_chore_id and chore.retired_at is null
      and occurrence.status='scheduled' and not occurrence.is_rescheduled
      and occurrence.scheduled_date>=p_today
      and not exists(select 1 from public.occurrence_subtasks step where step.occurrence_id=occurrence.id and step.completed_at is not null)
      and not exists(select 1 from public.activity_events event where event.occurrence_id=occurrence.id)
    order by occurrence.id
    for update of occurrence
  loop
    delete from public.occurrence_subtasks where occurrence_id=v_id;
    update public.chore_occurrences set checklist_materialized=false where id=v_id;
    perform private.materialize_checklist(v_id);
  end loop;
end;
$$;

create function public.update_category_target(
  p_household_id uuid,
  p_chore_id uuid,
  p_recurrence_type text,
  p_interval_count integer,
  p_anchor_date date,
  p_weekdays smallint[],
  p_day_of_month smallint,
  p_occurrence_dates date[],
  p_applicable_subtask_ids uuid[],
  p_today date
)
returns setof public.chores language plpgsql security definer set search_path='' as $$
declare v_target public.chores; v_routine public.routines;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then
    raise exception 'Household membership is required' using errcode='42501';
  end if;
  if p_today is null or p_occurrence_dates is null or p_applicable_subtask_ids is null then
    raise exception 'A complete target update is required' using errcode='22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  select chore.* into v_target
  from public.chores chore
  join public.routines routine on routine.id=chore.routine_id and routine.household_id=chore.household_id
  where chore.id=p_chore_id and chore.household_id=p_household_id and chore.retired_at is null
    and routine.archived_at is null and routine.kind='category'
  for update of chore, routine;
  if not found then raise exception 'Category target not found' using errcode='P0002'; end if;
  select * into v_routine from public.routines where id=v_target.routine_id and household_id=p_household_id for share;

  if exists(
    select 1 from unnest(p_applicable_subtask_ids) as supplied(subtask_id)
    where supplied.subtask_id is null or not exists(
      select 1 from public.routine_subtasks step
      where step.id=supplied.subtask_id and step.routine_id=v_target.routine_id and step.household_id=p_household_id
    )
  ) or (select count(*) from unnest(p_applicable_subtask_ids) as supplied(subtask_id)) <> (select count(distinct supplied.subtask_id) from unnest(p_applicable_subtask_ids) as supplied(subtask_id)) then
    raise exception 'Subtask is not in this category' using errcode='22023';
  end if;

  perform public.update_chore_with_occurrences(
    v_target.id, p_household_id, v_target.name, v_target.description, v_target.icon_key, v_target.accent_key,
    p_recurrence_type, p_interval_count, p_anchor_date, p_weekdays, p_day_of_month, p_today, p_occurrence_dates
  );

  delete from public.subtask_target_exclusions where chore_id=v_target.id;
  insert into public.subtask_target_exclusions(subtask_id,chore_id,routine_id,household_id)
  select step.id,v_target.id,v_target.routine_id,p_household_id
  from public.routine_subtasks step
  where step.routine_id=v_target.routine_id and step.household_id=p_household_id
    and not(step.id=any(p_applicable_subtask_ids));

  perform private.refresh_future_target_checklists(v_target.id,p_today);
  return query select * from public.chores where id=v_target.id;
end;
$$;

revoke all on function private.refresh_future_target_checklists(uuid,date) from public,anon,authenticated;
revoke all on function public.update_category_target(uuid,uuid,text,integer,date,smallint[],smallint,date[],uuid[],date) from public,anon;
grant execute on function public.update_category_target(uuid,uuid,text,integer,date,smallint[],smallint,date[],uuid[],date) to authenticated;

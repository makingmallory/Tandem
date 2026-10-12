-- Incremental extension of the APPLIED 20261012000000 migration.
-- Category is the product label for routines. Chores remain the schedule unit.
alter table public.routines add column kind text not null default 'category'
  check (kind in ('chore', 'category'));
alter table public.routine_subtasks add constraint routine_subtasks_id_household_unique unique(id, household_id);
alter table public.routine_subtasks add constraint routine_subtasks_parent_unique unique(id, routine_id, household_id);
alter table public.chores add constraint chores_parent_unique unique(id, routine_id, household_id);

create table public.routine_variants (
  id uuid primary key default gen_random_uuid(), household_id uuid not null,
  routine_id uuid not null, name text not null check(char_length(trim(name)) between 1 and 60),
  archived_at timestamptz, created_at timestamptz not null default now(),
  unique(id, routine_id, household_id),
  foreign key(routine_id, household_id) references public.routines(id, household_id) on delete restrict
);
create unique index routine_variants_name_unique on public.routine_variants(routine_id, lower(trim(name))) where archived_at is null;
alter table public.chores add column variant_id uuid,
  add constraint chores_variant_parent_fkey foreign key(variant_id, routine_id, household_id)
    references public.routine_variants(id, routine_id, household_id) on delete restrict,
  add constraint chores_variant_requires_parent check(variant_id is null or routine_id is not null);
drop index public.chores_routine_room_unique;
create unique index chores_routine_target_unique on public.chores(routine_id, room_id, variant_id) nulls not distinct
where routine_id is not null and retired_at is null;

-- All steps apply by default; only target-specific exclusions are stored.
create table public.subtask_target_exclusions (
  subtask_id uuid not null, chore_id uuid not null, routine_id uuid not null, household_id uuid not null,
  primary key(subtask_id, chore_id),
  foreign key(subtask_id, routine_id, household_id) references public.routine_subtasks(id, routine_id, household_id) on delete cascade,
  foreign key(chore_id, routine_id, household_id) references public.chores(id, routine_id, household_id) on delete cascade
);
alter table public.chore_occurrences
  add column checklist_materialized boolean not null default false,
  add column title_snapshot text,
  add column room_name_snapshot text,
  add column variant_name_snapshot text;
create table public.occurrence_subtasks (
  id uuid primary key default gen_random_uuid(), household_id uuid not null,
  occurrence_id uuid not null, source_subtask_id uuid,
  title text not null, position integer not null,
  completed_at timestamptz, completed_by uuid references public.profiles(id) on delete restrict,
  foreign key(occurrence_id, household_id) references public.chore_occurrences(id, household_id) on delete cascade,
  foreign key(source_subtask_id, household_id) references public.routine_subtasks(id, household_id) on delete set null(source_subtask_id),
  unique(occurrence_id, source_subtask_id),
  check((completed_at is null) = (completed_by is null))
);
create index occurrence_subtasks_occurrence_order_idx on public.occurrence_subtasks(occurrence_id, position);
alter table public.routine_variants enable row level security;
alter table public.subtask_target_exclusions enable row level security;
alter table public.occurrence_subtasks enable row level security;
create policy variants_read on public.routine_variants for select to authenticated using(private.is_household_member(household_id));
create policy exclusions_read on public.subtask_target_exclusions for select to authenticated using(private.is_household_member(household_id));
create policy checklist_read on public.occurrence_subtasks for select to authenticated using(private.is_household_member(household_id));
revoke all on public.routine_variants, public.subtask_target_exclusions, public.occurrence_subtasks from public, anon, authenticated;
grant select on public.routine_variants, public.subtask_target_exclusions, public.occurrence_subtasks to authenticated;

create function private.materialize_checklist(p_occurrence_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_occurrence public.chore_occurrences; v_chore public.chores; v_event jsonb; v_had_event boolean;
begin
  select * into v_occurrence from public.chore_occurrences where id=p_occurrence_id for update;
  if not found or v_occurrence.checklist_materialized then return; end if;
  select * into v_chore from public.chores where id=v_occurrence.chore_id;
  select metadata into v_event from public.activity_events
  where occurrence_id=p_occurrence_id and household_id=v_occurrence.household_id order by created_at,id limit 1;
  v_had_event:=found;
  update public.chore_occurrences set checklist_materialized=true, title_snapshot=coalesce(v_event->>'chore_name',v_chore.name),
    room_name_snapshot=case when v_had_event then v_event->>'room_name' else (select name from public.rooms where id=v_chore.room_id) end,
    variant_name_snapshot=case when v_had_event then v_event->>'variant_name' else (select name from public.routine_variants where id=v_chore.variant_id) end
  where id=p_occurrence_id;
  insert into public.occurrence_subtasks(household_id, occurrence_id, source_subtask_id, title, position, completed_at, completed_by)
  select v_occurrence.household_id, p_occurrence_id, step.id, step.title, step.position,
    completion.completed_at, completion.user_id
  from public.routine_subtasks step
  join public.routines routine on routine.id=step.routine_id and routine.kind='category'
  left join public.occurrence_completions completion on completion.occurrence_id=p_occurrence_id
  where step.routine_id=v_chore.routine_id and not exists(
    select 1 from public.subtask_target_exclusions exclusion where exclusion.chore_id=v_chore.id and exclusion.subtask_id=step.id
  ) order by step.position;
end;
$$;
create function private.materialize_new_occurrence() returns trigger language plpgsql security definer set search_path='' as $$
begin perform private.materialize_checklist(new.id); return new; end;
$$;
create trigger occurrence_materialize_checklist after insert on public.chore_occurrences
for each row execute function private.materialize_new_occurrence();

-- Future untouched work adopts definition changes. Past, completed, skipped,
-- rescheduled and partially worked checklists retain their original snapshots.
create function private.refresh_future_checklists(p_routine_id uuid, p_today date) returns void
language plpgsql set search_path='' as $$
declare v_id uuid;
begin
  for v_id in select occurrence.id from public.chore_occurrences occurrence
    join public.chores chore on chore.id=occurrence.chore_id
    where chore.routine_id=p_routine_id and chore.retired_at is null
      and occurrence.status='scheduled' and not occurrence.is_rescheduled and occurrence.scheduled_date>=p_today
      and not exists(select 1 from public.occurrence_subtasks step where step.occurrence_id=occurrence.id and step.completed_at is not null)
      and not exists(select 1 from public.activity_events event where event.occurrence_id=occurrence.id)
    order by occurrence.id for update of occurrence
  loop
    delete from public.occurrence_subtasks where occurrence_id=v_id;
    update public.chore_occurrences set checklist_materialized=false where id=v_id;
    perform private.materialize_checklist(v_id);
  end loop;
end;
$$;
create function private.protect_worked_checklist() returns trigger language plpgsql set search_path='' as $$
begin
  if exists(select 1 from public.occurrence_subtasks where occurrence_id=old.id and completed_at is not null)
    or exists(select 1 from public.activity_events where occurrence_id=old.id) then return null; end if;
  return old;
end;
$$;
create trigger occurrence_preserve_checklist_progress before delete on public.chore_occurrences
for each row execute function private.protect_worked_checklist();

-- Keep the original audit/attribution implementations behind the existing API.
alter function public.complete_occurrence(uuid, uuid) rename to complete_occurrence_without_checklist;
alter function public.undo_occurrence_completion(uuid, uuid) rename to undo_occurrence_without_checklist;
revoke all on function public.complete_occurrence_without_checklist(uuid,uuid),
  public.undo_occurrence_without_checklist(uuid,uuid) from public, anon, authenticated;

create function public.complete_occurrence(p_occurrence_id uuid, p_household_id uuid)
returns setof public.occurrence_completions language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  perform 1 from public.chore_occurrences where id=p_occurrence_id and household_id=p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode='P0002'; end if;
  perform private.materialize_checklist(p_occurrence_id);
  update public.occurrence_subtasks set completed_at=coalesce(completed_at,now()), completed_by=coalesce(completed_by,auth.uid())
  where occurrence_id=p_occurrence_id;
  return query select * from public.complete_occurrence_without_checklist(p_occurrence_id,p_household_id);
end;
$$;
create function public.undo_occurrence_completion(p_occurrence_id uuid, p_household_id uuid)
returns setof public.chore_occurrences language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  perform 1 from public.chore_occurrences where id=p_occurrence_id and household_id=p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode='P0002'; end if;
  perform public.undo_occurrence_without_checklist(p_occurrence_id,p_household_id);
  update public.occurrence_subtasks set completed_at=null,completed_by=null where occurrence_id=p_occurrence_id;
  return query select * from public.chore_occurrences where id=p_occurrence_id;
end;
$$;
create function public.set_occurrence_subtask(p_household_id uuid, p_occurrence_id uuid, p_subtask_id uuid, p_complete boolean)
returns setof public.chore_occurrences language plpgsql security definer set search_path='' as $$
declare v_occurrence public.chore_occurrences;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  select * into v_occurrence from public.chore_occurrences where id=p_occurrence_id and household_id=p_household_id for update;
  if not found then raise exception 'Occurrence not found' using errcode='P0002'; end if;
  if v_occurrence.status='skipped' or exists(select 1 from public.chores where id=v_occurrence.chore_id and retired_at is not null) then
    raise exception 'This checklist is read only' using errcode='22023';
  end if;
  if p_complete is null then raise exception 'Completion value is required' using errcode='22023'; end if;
  update public.occurrence_subtasks set completed_at=case when p_complete then coalesce(completed_at,now()) else null end,
    completed_by=case when p_complete then coalesce(completed_by,auth.uid()) else null end
  where id=p_subtask_id and occurrence_id=p_occurrence_id and household_id=p_household_id;
  if not found then raise exception 'Checklist item not found' using errcode='P0002'; end if;
  if not exists(select 1 from public.occurrence_subtasks where occurrence_id=p_occurrence_id and completed_at is null) then
    perform public.complete_occurrence(p_occurrence_id,p_household_id);
  elsif v_occurrence.status='completed' then
    -- Individual uncheck keeps other completed steps; parent Undo clears all.
    perform public.undo_occurrence_without_checklist(p_occurrence_id,p_household_id);
  end if;
  return query select * from public.chore_occurrences where id=p_occurrence_id;
end;
$$;

-- Existing occurrences are materialized from the definitions available today.
-- Completed ones inherit their existing completer/time. No occurrence or event
-- is removed and no earlier completion attribution is changed.
do $$ declare v_id uuid; begin
  for v_id in select id from public.chore_occurrences order by id loop perform private.materialize_checklist(v_id); end loop;
end; $$;

create or replace function private.snapshot_activity_room() returns trigger language plpgsql set search_path='' as $$
begin
  new.metadata := new.metadata || (select jsonb_build_object('chore_name',coalesce(occurrence.title_snapshot,chore.name),
    'room_name',occurrence.room_name_snapshot,'variant_name',occurrence.variant_name_snapshot)
    from public.chore_occurrences occurrence join public.chores chore on chore.id=occurrence.chore_id where occurrence.id=new.occurrence_id);
  return new;
end;
$$;

revoke all on function private.materialize_checklist(uuid), private.materialize_new_occurrence(),
  private.refresh_future_checklists(uuid,date), private.protect_worked_checklist() from public, anon, authenticated;
revoke all on function public.complete_occurrence(uuid,uuid), public.undo_occurrence_completion(uuid,uuid),
  public.set_occurrence_subtask(uuid,uuid,uuid,boolean) from public, anon;
grant execute on function public.complete_occurrence(uuid,uuid), public.undo_occurrence_completion(uuid,uuid),
  public.set_occurrence_subtask(uuid,uuid,uuid,boolean) to authenticated;

create or replace function public.save_chore_plan(p_household_id uuid, p_chore_id uuid, p_plan jsonb, p_today date)
returns setof public.chores language plpgsql security definer set search_path='' as $$
declare
  v_existing public.chores; v_chore public.chores; v_routine uuid; v_kind text;
  v_target jsonb; v_task jsonb; v_variant jsonb; v_key text; v_room uuid; v_variant_id uuid; v_id uuid;
  v_kept uuid[]:=array[]::uuid[]; v_task_ids uuid[]:=array[]::uuid[]; v_variant_ids uuid[]:=array[]::uuid[];
  v_created uuid[]:=array[]::uuid[];
  v_variant_map jsonb:='{}'::jsonb; v_target_map jsonb:='{}'::jsonb;
  v_position integer:=0; v_dates date[]; v_weekdays smallint[]; v_reuse_base boolean:=false;
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Household membership is required' using errcode='42501'; end if;
  -- Serialize definition/target edits within a household before acquiring row
  -- locks, including concurrent room/target removals through the same API.
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  if p_today is null or jsonb_typeof(p_plan->'targets') is distinct from 'array'
    or jsonb_array_length(p_plan->'targets') not between 1 and 100
    or jsonb_typeof(p_plan->'subtasks') is distinct from 'array' or jsonb_array_length(p_plan->'subtasks')>50 then
    raise exception 'Invalid category plan' using errcode='22023';
  end if;
  if p_chore_id is not null then
    select * into v_existing from public.chores where id=p_chore_id and household_id=p_household_id and retired_at is null for update;
    if not found then raise exception 'Chore not found' using errcode='P0002'; end if;
    v_routine:=v_existing.routine_id; v_reuse_base:=v_routine is null;
  end if;
  v_kind:=coalesce(p_plan->>'kind',(select kind from public.routines where id=v_routine),'category');
  if v_kind not in ('chore','category') or (v_kind='chore' and jsonb_array_length(p_plan->'subtasks')>0) then
    raise exception 'Subtasks belong to a category' using errcode='22023';
  end if;
  if v_routine is not null or v_kind='category' or jsonb_array_length(p_plan->'targets')>1
    or nullif(p_plan->'targets'->0->>'room_id','') is not null or jsonb_array_length(coalesce(p_plan->'variants','[]'))>0 then
    if v_routine is null then
      insert into public.routines(household_id,name,kind) values(p_household_id,p_plan->>'name',v_kind) returning id into v_routine;
    else
      perform 1 from public.routines where id=v_routine and archived_at is null for update;
      if not found then raise exception 'Category removed' using errcode='22023'; end if;
      update public.routines set name=p_plan->>'name',kind=v_kind where id=v_routine;
    end if;
  end if;
  if not (p_plan ? 'variants') and exists(select 1 from public.routine_variants where routine_id=v_routine and archived_at is null) then
    raise exception 'Reload the editor to preserve variants' using errcode='22023';
  end if;
  if jsonb_typeof(coalesce(p_plan->'variants','[]')) is distinct from 'array' or jsonb_array_length(coalesce(p_plan->'variants','[]'))>50 then
    raise exception 'Invalid variants' using errcode='22023';
  end if;
  for v_variant in select value from jsonb_array_elements(coalesce(p_plan->'variants','[]')) loop
    v_id:=nullif(v_variant->>'id','')::uuid; v_key:=coalesce(v_variant->>'key',v_id::text);
    if v_key is null or v_variant_map ? v_key then raise exception 'Duplicate or missing variant key' using errcode='22023'; end if;
    if v_id is null then
      insert into public.routine_variants(household_id,routine_id,name) values(p_household_id,v_routine,v_variant->>'name') returning id into v_id;
    else
      update public.routine_variants set name=v_variant->>'name' where id=v_id and routine_id=v_routine and household_id=p_household_id and archived_at is null;
      if not found then raise exception 'Variant is not in this category' using errcode='42501'; end if;
    end if;
    v_variant_map:=v_variant_map||jsonb_build_object(v_key,v_id);
    v_variant_ids:=array_append(v_variant_ids,v_id);
  end loop;
  -- Ordered definitions are saved before new occurrences are materialized.
  for v_task in select value from jsonb_array_elements(p_plan->'subtasks') loop
    v_id:=nullif(v_task->>'id','')::uuid;
    if v_id is null then
      insert into public.routine_subtasks(household_id,routine_id,title,position)
      values(p_household_id,v_routine,v_task->>'title',v_position) returning id into v_id;
    else
      if v_id=any(v_task_ids) then raise exception 'Duplicate subtask' using errcode='22023'; end if;
      update public.routine_subtasks set title=v_task->>'title',position=v_position
      where id=v_id and routine_id=v_routine and household_id=p_household_id;
      if not found then raise exception 'Subtask not in this category' using errcode='42501'; end if;
    end if;
    v_task_ids:=array_append(v_task_ids,v_id); v_position:=v_position+1;
  end loop;
  if v_routine is not null then
    delete from public.routine_subtasks where routine_id=v_routine and not(id=any(v_task_ids));
    delete from public.subtask_target_exclusions where routine_id=v_routine;
  end if;
  for v_target in select value from jsonb_array_elements(p_plan->'targets') loop
    v_room:=nullif(v_target->>'room_id','')::uuid;
    v_variant_id:=null;
    if nullif(v_target->>'variant_key','') is not null then
      v_variant_id:=(v_variant_map->>(v_target->>'variant_key'))::uuid;
      if v_variant_id is null then raise exception 'Variant target unavailable' using errcode='22023'; end if;
    end if;
    v_key:=coalesce(v_target->>'key',v_room::text,'roomless');
    if v_target_map ? v_key then raise exception 'Duplicate target key' using errcode='22023'; end if;
    if v_room is not null then
      perform 1 from public.rooms where id=v_room and household_id=p_household_id and archived_at is null for share;
      if not found then raise exception 'Room unavailable in this household' using errcode='42501'; end if;
    end if;
    v_chore:=null;
    if v_routine is not null then
      select * into v_chore from public.chores where routine_id=v_routine and room_id is not distinct from v_room
        and variant_id is not distinct from v_variant_id and retired_at is null for update;
    elsif p_chore_id is not null then v_chore:=v_existing; end if;
    if v_chore.id is null and v_reuse_base then v_chore:=v_existing; v_reuse_base:=false; end if;
    v_weekdays:=case when jsonb_typeof(v_target->'weekdays')='array' then
      array(select value::smallint from jsonb_array_elements_text(v_target->'weekdays')) else null end;
    v_dates:=array(select value::date from jsonb_array_elements_text(v_target->'occurrence_dates'));
    if v_chore.id is null then
      select * into v_chore from public.create_chore_with_occurrences(p_household_id,p_plan->>'name',nullif(p_plan->>'description',''),
        p_plan->>'icon_key',p_plan->>'accent_key',v_target->>'recurrence_type',(v_target->>'interval_count')::integer,
        (v_target->>'anchor_date')::date,v_weekdays,(v_target->>'day_of_month')::smallint,v_dates);
      v_created:=array_append(v_created,v_chore.id);
    else
      if v_chore.id=any(v_kept) then raise exception 'Duplicate target' using errcode='22023'; end if;
      if row(v_chore.recurrence_type,v_chore.interval_count,v_chore.anchor_date,v_chore.weekdays,v_chore.day_of_month)
        is distinct from row(v_target->>'recurrence_type',(v_target->>'interval_count')::integer,(v_target->>'anchor_date')::date,v_weekdays,(v_target->>'day_of_month')::smallint) then
        perform public.update_chore_with_occurrences(v_chore.id,p_household_id,p_plan->>'name',nullif(p_plan->>'description',''),
          p_plan->>'icon_key',p_plan->>'accent_key',v_target->>'recurrence_type',(v_target->>'interval_count')::integer,
          (v_target->>'anchor_date')::date,v_weekdays,(v_target->>'day_of_month')::smallint,p_today,v_dates);
      end if;
    end if;
    update public.chores set name=p_plan->>'name',description=nullif(p_plan->>'description',''),
      icon_key=p_plan->>'icon_key',accent_key=p_plan->>'accent_key',room_id=v_room,routine_id=v_routine,variant_id=v_variant_id
    where id=v_chore.id returning * into v_chore;
    v_kept:=array_append(v_kept,v_chore.id); v_target_map:=v_target_map||jsonb_build_object(v_key,v_chore.id);
    return next v_chore;
  end loop;
  if v_routine is not null then
    for v_id in select id from public.chores where routine_id=v_routine and retired_at is null and not(id=any(v_kept)) loop
      perform private.retire_chore(v_id);
    end loop;
    update public.routine_variants set archived_at=now() where routine_id=v_routine and archived_at is null and not(id=any(v_variant_ids));
    v_position:=0;
    for v_task in select value from jsonb_array_elements(p_plan->'subtasks') loop
      v_id:=v_task_ids[v_position+1];
      if jsonb_typeof(coalesce(v_task->'excludedTargets','[]')) is distinct from 'array' then raise exception 'Invalid applicability' using errcode='22023'; end if;
      for v_key in select value from jsonb_array_elements_text(coalesce(v_task->'excludedTargets','[]')) loop
        if not(v_target_map ? v_key) then raise exception 'Unknown excluded target' using errcode='22023'; end if;
        insert into public.subtask_target_exclusions(subtask_id,chore_id,routine_id,household_id)
        values(v_id,(v_target_map->>v_key)::uuid,v_routine,p_household_id) on conflict do nothing;
      end loop;
      v_position:=v_position+1;
    end loop;
    -- Initial links and exclusions are now final. All newly created targets
    -- materialize their actual checklist, including explicitly supplied past
    -- dates. Existing targets still keep their historical snapshots frozen.
    for v_id in select id from public.chore_occurrences where chore_id=any(v_created) loop
      delete from public.occurrence_subtasks where occurrence_id=v_id;
      update public.chore_occurrences set checklist_materialized=false where id=v_id;
      perform private.materialize_checklist(v_id);
    end loop;
    perform private.refresh_future_checklists(v_routine,p_today);
  end if;
end;
$$;

do $$ declare v_table text; begin
  if exists(select 1 from pg_publication where pubname='supabase_realtime') then
    foreach v_table in array array['routine_variants','subtask_target_exclusions','occurrence_subtasks'] loop
      execute format('alter publication supabase_realtime add table public.%I',v_table);
    end loop;
  end if;
end; $$;

-- Removal shares the definition/checklist lock order, keeping concurrent
-- completion and retirement coherent while preserving the applied behavior.
alter function public.retire_chore(uuid,uuid,boolean) rename to retire_chore_without_checklist_lock;
alter function public.archive_room(uuid,uuid) rename to archive_room_without_checklist_lock;
revoke all on function public.retire_chore_without_checklist_lock(uuid,uuid,boolean),
  public.archive_room_without_checklist_lock(uuid,uuid) from public,anon,authenticated;
create function public.retire_chore(p_household_id uuid,p_chore_id uuid,p_entire_routine boolean default false)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  perform public.retire_chore_without_checklist_lock(p_household_id,p_chore_id,p_entire_routine);
end; $$;
create function public.archive_room(p_household_id uuid,p_room_id uuid)
returns void language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is null or not private.is_household_member(p_household_id) then raise exception 'Not authorized' using errcode='42501'; end if;
  perform pg_advisory_xact_lock(hashtextextended(p_household_id::text,8));
  perform public.archive_room_without_checklist_lock(p_household_id,p_room_id);
end; $$;
revoke all on function public.retire_chore(uuid,uuid,boolean),public.archive_room(uuid,uuid) from public,anon;
grant execute on function public.retire_chore(uuid,uuid,boolean),public.archive_room(uuid,uuid) to authenticated;

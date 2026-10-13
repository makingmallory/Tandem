"use client";

import { ArrowDown, ArrowUp, Pencil, Trash2 } from "lucide-react";
import { useActionState, useState } from "react";
import type { ActionState } from "@/actions/state";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { Card } from "@/components/ui/Card";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";
import { ScheduleFields } from "@/components/chore/ScheduleFields";
import type { RoomRow } from "@/data/supabase/types";
import { CHORE_ACCENTS } from "@/domain/chores/accents";
import { CHORE_ICONS } from "@/domain/chores/icons";
import { schedulesAreShared, targetKey, resolveTargets, type ScheduleValues, type SubtaskValue, type VariantValue, type TargetValue } from "@/lib/validation/chore-plan";
import { PHASE8_PENDING_MESSAGE } from "@/data/rooms/copy";
import { formatRecurrence } from "@/domain/formatters/recurrence";
import { formatMonthDay } from "@/domain/formatters/dates";
import type { DateOnly } from "@/domain/dates/date-only";

export type ChoreFormValues = ScheduleValues & { name: string; description: string; iconKey: string; accentKey: string };
export function ChoreForm({ action, initialValues, mode, rooms, available = true, initialRoomIds = [],
  initialSubtasks = [], initialSchedules = {}, kind = "chore", initialVariants = [], initialTargets = [], featuresAvailable = true, initialRoomsOpen = false }: Readonly<{
  action: (state: ActionState, form: FormData) => Promise<ActionState>;
  initialValues: ChoreFormValues; mode: "create" | "edit"; rooms: RoomRow[]; available?: boolean;
  initialRoomIds?: string[]; initialSubtasks?: SubtaskValue[]; initialSchedules?: Record<string, ScheduleValues>;
  kind?: "chore" | "category"; initialVariants?: VariantValue[]; initialTargets?: TargetValue[]; featuresAvailable?: boolean; initialRoomsOpen?: boolean;
}>) {
  const [state, formAction] = useActionState(action, INITIAL_ACTION_STATE);
  const [iconKey, setIconKey] = useState(initialValues.iconKey);
  const [accentKey, setAccentKey] = useState(initialValues.accentKey);
  const [roomIds, setRoomIds] = useState(initialRoomIds);
  const [subtasks, setSubtasks] = useState(initialSubtasks);
  const [variants, setVariants] = useState(initialVariants);
  const [explicitTargets, setExplicitTargets] = useState(initialTargets);
  const [draftTarget, setDraftTarget] = useState<TargetValue>({ roomId: null, variantKey: null });
  const [schedule, setSchedule] = useState<ScheduleValues>({
    recurrenceType: initialValues.recurrenceType, intervalCount: initialValues.intervalCount,
    anchorDate: initialValues.anchorDate, weekdays: initialValues.weekdays, dayOfMonth: initialValues.dayOfMonth,
  });
  const [schedules, setSchedules] = useState(initialSchedules);
  const [customize, setCustomize] = useState(() => !schedulesAreShared(Object.values(initialSchedules)));
  const [editingSharedSchedule, setEditingSharedSchedule] = useState(mode === "create");
  const [editingTargetKey, setEditingTargetKey] = useState<string | null>(null);
  const [roomsOpen, setRoomsOpen] = useState(initialRoomsOpen || Boolean(state.fieldErrors?.targets || state.fieldErrors?.roomIds));
  const selectableRooms = rooms.filter((room) => !room.archived_at);
  const selectedTargets = resolveTargets(roomIds, variants, explicitTargets);
  const initialKeys = resolveTargets(initialRoomIds, initialVariants, initialTargets).map(targetKey);
  const targetLabel = (target: TargetValue) => [rooms.find((room) => room.id === target.roomId)?.name,
    variants.find((variant) => variant.key === target.variantKey)?.name].filter(Boolean).join(" · ") || "No room or variant";
  function changeRooms(ids: string[]) {
    const nextTargets = explicitTargets.filter((target) => !target.roomId || ids.includes(target.roomId));
    const validKeys = new Set(resolveTargets(ids, variants, nextTargets).map(targetKey));
    setRoomIds(ids);
    setExplicitTargets(nextTargets);
    setSubtasks((items) => items.map((item) => ({ ...item, excludedTargets: item.excludedTargets?.filter((key) => validKeys.has(key)) })));
  }
  function reorder(index: number, direction: number) {
    setSubtasks((current) => {
      const next = [...current];
      [next[index], next[index + direction]] = [next[index + direction]!, next[index]!];
      return next;
    });
  }
  return <form action={formAction} className="chore-form" onSubmit={(event) => {
    if (mode === "edit" && initialKeys.some((key) => !selectedTargets.some((target) => targetKey(target) === key)) &&
      !window.confirm("Remove the deselected targets? Their pending work will stop and history will be kept.")) event.preventDefault();
  }}>
    <input type="hidden" name="schedulePlan" value={JSON.stringify({ kind, roomIds, subtasks, variants, explicitTargets, schedule,
      schedules: Object.fromEntries(selectedTargets.map((target) => [targetKey(target), schedules[targetKey(target)] ?? schedule])), customize })} />
    <Card className="chore-form__section">
      <div><p className="eyebrow">{kind === "category" ? "Category" : "Chore"}</p><h2 className="section-heading">What needs a little love?</h2></div>
      <TextField id="chore-name" name="name" label={kind === "category" ? "Category name" : "Chore name"} defaultValue={initialValues.name} maxLength={100}
        placeholder="Water the plants" required autoComplete="off" error={state.fieldErrors?.name?.[0]} />
    </Card>
    {available ? <Card className="chore-form__section">
      <details open={roomsOpen} onToggle={(event) => setRoomsOpen(event.currentTarget.open)} className="room-selector">
        <summary>Rooms (optional) <span className="muted-copy">{roomIds.length} selected</span></summary>
      <fieldset className="picker-fieldset"><legend className="visually-hidden">Applicable rooms</legend>
        <div className="button-row"><button className="app-button app-button--tertiary" type="button"
          onClick={() => changeRooms(selectableRooms.map((room) => room.id))}>Select all</button>
          <button className="app-button app-button--tertiary" type="button" onClick={() => changeRooms([])}>Clear all</button></div>
        <div className="room-picker">{selectableRooms.map((room) => <label key={room.id}>
          <input type="checkbox" checked={roomIds.includes(room.id)} onChange={() => changeRooms(roomIds.includes(room.id)
            ? roomIds.filter((id) => id !== room.id) : [...roomIds, room.id])} /> {room.name}
        </label>)}</div>
        <p className="muted-copy">{roomIds.length ? "Each room has its own completion and reminders." : "No rooms selected. This chore runs once per scheduled date."}</p>
      </fieldset></details>
      {featuresAvailable ? <details className="variant-editor" open={Boolean(state.fieldErrors?.variants)}><summary>Variants (optional) <span className="muted-copy">{variants.length} defined</span></summary>
        <div className="section-stack subtask-editor">
          <p className="muted-copy">Local to this {kind}. Each variant has its own schedule and completion.</p>
          {variants.map((variant, index) => <div key={variant.key} className="subtask-editor__row">
            <TextField id={`variant-${variant.key}`} label={`Variant ${index + 1}`} value={variant.name} required maxLength={60}
              onChange={(event) => setVariants(variants.map((item) => item.key === variant.key ? { ...item, name: event.target.value } : item))} />
            <button className="app-button app-button--tertiary" type="button" aria-label={`Remove variant ${index + 1}`} onClick={() => {
              setVariants(variants.filter((item) => item.key !== variant.key));
              setExplicitTargets(explicitTargets.filter((target) => target.variantKey !== variant.key));
            }}>Remove variant</button>
          </div>)}
          <button className="app-button app-button--secondary" type="button" disabled={variants.length >= 50}
            onClick={() => setVariants([...variants, { id: null, key: crypto.randomUUID(), name: "" }])}>Add variant</button>
        </div>
      </details> : <p className="muted-copy">Checklist completion and Variants require the pending database migration.</p>}
      {roomIds.length > 0 && variants.length > 0 ? <details open={!explicitTargets.length || Boolean(state.fieldErrors?.targets)}>
        <summary>Room + Variant targets <span className="muted-copy">{explicitTargets.length} selected</span></summary>
        <div className="section-stack subtask-editor">
          <p className="muted-copy">Choose each combination explicitly. Rooms and variants are never multiplied automatically.</p>
          {explicitTargets.map((target, index) => <div className="target-editor__row" key={targetKey(target)}>
            <span>{targetLabel(target)}</span><button type="button" className="app-button app-button--tertiary" aria-label={`Remove target ${targetLabel(target)}`}
              onClick={() => setExplicitTargets(explicitTargets.filter((_, i) => i !== index))}>Remove</button>
          </div>)}
          <label className="field-stack">Target room<select className="text-field" value={draftTarget.roomId ?? ""}
            onChange={(event) => setDraftTarget({ ...draftTarget, roomId: event.target.value || null })}>
            <option value="">No room</option>{rooms.filter((room) => roomIds.includes(room.id)).map((room) => <option value={room.id} key={room.id}>{room.name}</option>)}
          </select></label>
          <label className="field-stack">Target variant<select className="text-field" value={draftTarget.variantKey ?? ""}
            onChange={(event) => setDraftTarget({ ...draftTarget, variantKey: event.target.value || null })}>
            <option value="">No variant</option>{variants.map((variant) => <option value={variant.key} key={variant.key}>{variant.name || "Unnamed variant"}</option>)}
          </select></label>
          <button type="button" className="app-button app-button--secondary" disabled={explicitTargets.some((target) => targetKey(target) === targetKey(draftTarget))}
            onClick={() => setExplicitTargets([...explicitTargets, draftTarget])}>Add target</button>
        </div>
      </details> : null}
      {kind === "category" ? <details open><summary>Subtasks (optional)</summary>
        <div className="section-stack subtask-editor">
          <p className="muted-copy">Complete this category together or check its subtasks individually.</p>
          {subtasks.map((task, index) => {
            const customizable = featuresAvailable && selectedTargets.some((target) => target.roomId || target.variantKey);
            const scope = selectedTargets.every((target) => target.roomId) ? "rooms" : "targets";
            const customized = task.excludedTargets?.some((key) => selectedTargets.some((target) => targetKey(target) === key));
            return <div className="subtask-editor__row" key={task.id ?? `new-${index}`}>
              <div className="subtask-editor__controls">
                <label className="visually-hidden" htmlFor={`subtask-${index}`}>Subtask {index + 1}</label>
                <input id={`subtask-${index}`} className="text-field" aria-label={`Subtask ${index + 1}`} value={task.title} required maxLength={120}
                  onChange={(event) => setSubtasks(subtasks.map((item, i) => i === index ? { ...item, title: event.target.value } : item))} />
                <button type="button" className="icon-button" aria-label={`Move subtask ${index + 1} up`} disabled={index === 0} onClick={() => reorder(index, -1)}><ArrowUp aria-hidden="true" size={18} /></button>
                <button type="button" className="icon-button" aria-label={`Move subtask ${index + 1} down`} disabled={index === subtasks.length - 1} onClick={() => reorder(index, 1)}><ArrowDown aria-hidden="true" size={18} /></button>
                <button type="button" className="icon-button" aria-label={`Remove subtask ${index + 1}`} onClick={() => setSubtasks(subtasks.filter((_, i) => i !== index))}><Trash2 aria-hidden="true" size={18} /></button>
              </div>
              {customizable ? <details className="subtask-editor__applicability"><summary>Applies to: <span>{customized ? "Selected targets" : `All ${scope}`}</span> <span className="subtask-editor__change">Change</span></summary>
              <div className="room-picker">{selectedTargets.map((target) => {
                const key = targetKey(target);
                return <label key={key}><input type="checkbox" checked={!task.excludedTargets?.includes(key)}
                  onChange={(event) => setSubtasks(subtasks.map((item, i) => i === index ? { ...item,
                    excludedTargets: event.target.checked ? (item.excludedTargets ?? []).filter((excluded) => excluded !== key) : [...(item.excludedTargets ?? []), key] } : item))} />
                  {targetLabel(target)}
                </label>;
              })}</div>
            </details> : null}
            </div>;
          })}
          <button type="button" className="app-button app-button--secondary" disabled={subtasks.length >= 50}
            onClick={() => setSubtasks([...subtasks, { id: null, title: "" }])}>Add subtask</button>
        </div>
      </details> : null}
    </Card> : <p className="muted-copy">{PHASE8_PENDING_MESSAGE}</p>}
    <Card className="chore-form__section">
      <fieldset className="picker-fieldset"><legend className="field-label">Choose an icon</legend>
        <div className="icon-picker">{CHORE_ICONS.map(({ key, label, icon: Icon }) => <label className="picker-option" key={key} title={label}>
          <input className="visually-hidden" type="radio" name="iconKey" value={key} checked={iconKey === key} onChange={() => setIconKey(key)} />
          <span className="picker-option__icon"><Icon aria-hidden="true" size={22} /></span><span className="visually-hidden">{label}</span>
        </label>)}</div>
      </fieldset>
      <fieldset className="picker-fieldset"><legend className="field-label">Pick a color</legend>
        <div className="accent-picker">{CHORE_ACCENTS.map((accent) => <label className="accent-option" key={accent.key} title={accent.label}>
          <input className="visually-hidden" type="radio" name="accentKey" value={accent.key} checked={accentKey === accent.key} onChange={() => setAccentKey(accent.key)} />
          <span style={{ background: `var(${accent.cssVariable})` }} /><span className="visually-hidden">{accent.label}</span>
        </label>)}</div>
      </fieldset>
    </Card>
    <Card className="chore-form__section">
      <p className="eyebrow">The rhythm</p>
      {customize && selectedTargets.length ? <>
        <p className="muted-copy">Custom schedules</p>
        <div className="parent-schedule-list">{selectedTargets.map((target) => {
          const key = targetKey(target); const targetSchedule = schedules[key] ?? schedule; const editing = editingTargetKey === key;
          return <div className="parent-schedule-row" key={key}><div><strong>{targetLabel(target)}</strong>{!editing ? <p>{formatRecurrence(targetSchedule)} · Starts {formatMonthDay(targetSchedule.anchorDate as DateOnly)}</p> : null}</div>
            {!editing ? <button className="icon-button parent-schedule-row__edit" type="button" aria-label={`Edit schedule for ${targetLabel(target)}`} onClick={() => setEditingTargetKey(key)}><Pencil aria-hidden="true" size={16} /></button> : null}
            {editing ? <div className="parent-schedule-row__editor"><ScheduleFields prefix={`${key}-`} value={targetSchedule} onChange={(next) => setSchedules({ ...schedules, [key]: next })} /><button type="button" className="app-button app-button--tertiary" onClick={() => setEditingTargetKey(null)}>Done</button></div> : null}
          </div>;
        })}</div>
        <button type="button" className="app-button app-button--secondary" onClick={() => { setSchedule(schedules[targetKey(selectedTargets[0]!)] ?? schedule); setCustomize(false); setEditingSharedSchedule(true); }}>Convert to same schedule</button>
      </> : <>
        {selectedTargets.length > 1 ? <p className="muted-copy">Same schedule for all {variants.length ? "targets" : "rooms"}</p> : null}
        {!editingSharedSchedule ? <div className="parent-schedule-row"><div><strong>{formatRecurrence(schedule)}</strong><p>Starts {formatMonthDay(schedule.anchorDate as DateOnly)}</p></div><button className="icon-button parent-schedule-row__edit" type="button" aria-label="Edit shared schedule" onClick={() => setEditingSharedSchedule(true)}><Pencil aria-hidden="true" size={16} /></button></div> : <><p className="muted-copy">Saving will apply this schedule to all selected targets.</p><ScheduleFields value={schedule} onChange={setSchedule} errors={state.fieldErrors} />{selectedTargets.length > 1 ? <button type="button" className="app-button app-button--tertiary" onClick={() => { setCustomize(true); setSchedules(initialSchedules); setEditingSharedSchedule(false); }}>Keep custom schedules</button> : null}</>}
        {selectedTargets.length > 1 && !editingSharedSchedule ? <button type="button" className="app-button app-button--secondary" onClick={() => { setSchedules(Object.fromEntries(selectedTargets.map((target) => [targetKey(target), schedule]))); setCustomize(true); }}>Customize schedule by {variants.length ? "target" : "room"}</button> : null}
      </>}
    </Card>
    <Card className="chore-form__section"><div className="field-stack">
      <label className="field-label" htmlFor="chore-notes">Notes (optional)</label>
      <textarea className="text-field text-area" id="chore-notes" name="description" defaultValue={initialValues.description} maxLength={500} rows={3} />
    </div></Card>
    <FormMessage state={state} />
    <SubmitButton pendingLabel={mode === "create" ? "Creating…" : "Saving changes…"}>{mode === "create" ? kind === "category" ? "Create category" : "Create chore" : "Save changes"}</SubmitButton>
  </form>;
}

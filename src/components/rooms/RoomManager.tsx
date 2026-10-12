"use client";

import { useActionState, useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { saveRoomAction, archiveRoomAction } from "@/actions/rooms";
import { INITIAL_ACTION_STATE } from "@/actions/state";
import { SubmitButton } from "@/components/forms/SubmitButton";
import { TextField } from "@/components/ui/TextField";
import { FormMessage } from "@/components/ui/FormMessage";
import type { RoomRow } from "@/data/supabase/types";

function RoomItem({ room }: Readonly<{ room: RoomRow }>) {
  const [editing, setEditing] = useState(false);
  const [state, save] = useActionState(saveRoomAction.bind(null, room.id), INITIAL_ACTION_STATE);
  const [removeState, remove] = useActionState(archiveRoomAction.bind(null, room.id), INITIAL_ACTION_STATE);
  return <li className="room-manager__item">
    {editing ? <form action={save} className="room-manager__rename-form">
      <TextField id={`room-${room.id}`} label="Room name" name="name" defaultValue={room.name} maxLength={60} required error={state.fieldErrors?.name?.[0]} />
      <div className="button-row"><SubmitButton variant="secondary">Save</SubmitButton>
        <button type="button" className="app-button app-button--tertiary" onClick={() => setEditing(false)}>Done</button></div>
      <FormMessage state={state} />
    </form> : <>
      <span className="room-manager__name">{room.name}</span>
      <div className="room-manager__actions">
        <button className="icon-button" type="button" aria-label={`Rename ${room.name}`} onClick={() => setEditing(true)}><Pencil size={17} aria-hidden="true" /></button>
        <form action={remove} onSubmit={(event) => {
          if (!window.confirm(`Remove ${room.name}? Pending chores in this room will stop. All history will be kept.`)) event.preventDefault();
        }}><SubmitButton variant="tertiary" aria-label={`Remove ${room.name}`}><Trash2 size={17} aria-hidden="true" /></SubmitButton></form>
      </div><FormMessage state={removeState} />
    </>}
  </li>;
}
export function RoomManager({ rooms }: Readonly<{ rooms: RoomRow[] }>) {
  const [state, action] = useActionState(saveRoomAction.bind(null, null), INITIAL_ACTION_STATE);
  return <div className="room-manager">
    {rooms.length ? <ul className="room-manager__list" aria-label="Household rooms">
      {rooms.map((room) => <RoomItem key={room.id} room={room} />)}</ul> : <p className="muted-copy">Add the rooms where your household routines happen.</p>}
    <form action={action} className="room-manager__add-form">
      <TextField id="new-room" label="New room name" name="name" placeholder="Add a room" maxLength={60} required error={state.fieldErrors?.name?.[0]} />
      <SubmitButton pendingLabel="Adding…">Add</SubmitButton>
    </form><FormMessage state={state} />
  </div>;
}

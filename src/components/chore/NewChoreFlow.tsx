"use client";
import { useState } from "react";
import Link from "next/link";
import { createChoreAction } from "@/actions/chores";
import { ChoreForm, type ChoreFormValues } from "@/components/chore/ChoreForm";
import { PageShell } from "@/components/layout/PageShell";
import type { RoomRow } from "@/data/supabase/types";
import type { SuggestionPreset } from "@/data/suggestions/catalog";
import type { VariantValue } from "@/lib/validation/chore-plan";

function presetVariants(preset: SuggestionPreset | undefined): VariantValue[] {
  return preset?.variants?.map((name, index) => ({ id: null, name, key: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` })) ?? [];
}

export function NewChoreFlow({ initialValues, rooms, available, featuresAvailable, preset }: Readonly<{
  initialValues: ChoreFormValues; rooms: RoomRow[]; available: boolean; featuresAvailable: boolean; preset?: SuggestionPreset;
}>) {
  const [kind, setKind] = useState<"chore" | "category" | null>(preset?.kind ?? null);
  const activePreset = kind === preset?.kind ? preset : undefined;
  return <PageShell title={kind ? kind === "category" ? "Add a Category" : "Add a Chore" : "Create a…"} variant="detail" backHref="/chores">
    {kind ? <div className="page-stack">
      <button className="app-button app-button--tertiary" type="button" onClick={() => {
        if (window.confirm("Change what you are creating? Unsaved form changes will be cleared.")) setKind(null);
      }}>Change type</button>
      <ChoreForm key={`${kind}-${activePreset?.id ?? "manual"}`} action={createChoreAction} mode="create" kind={kind} initialValues={initialValues}
        rooms={rooms} available={available} featuresAvailable={featuresAvailable} initialRoomsOpen={Boolean(activePreset?.roomHint)}
        initialSubtasks={activePreset?.subtasks?.map((title) => ({ id: null, title })) ?? []} initialVariants={presetVariants(activePreset)} />
    </div> : <div className="create-choice-list">
      <button className="create-choice" type="button" onClick={() => setKind("chore")}>
        <strong>Chore</strong>{" "}<span>A single task with its own schedule.</span>
      </button>
      <button className="create-choice" type="button" onClick={() => setKind("category")}>
        <strong>Category</strong>{" "}<span>A group of related tasks you can complete together or step by step.</span>
      </button>
      <Link className="create-choice" href="/chores/suggestions"><strong>Browse suggestions</strong>{" "}<span>Start with common household routines and customize them for your home.</span></Link>
    </div>}
  </PageShell>;
}

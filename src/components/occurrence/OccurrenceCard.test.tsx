import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { OccurrenceCard } from "@/components/occurrence/OccurrenceCard";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";
import type { OccurrenceCompletion } from "@/data/occurrences/types";

vi.mock("@/components/occurrence/OccurrenceActions", () => ({ OccurrenceActions: () => null }));

function completion(completer: OccurrenceCompletion["completer"]): OccurrenceCompletion {
  return {
    id: "30000000-0000-4000-8000-000000000001",
    occurrence_id: "00000000-0000-4000-8000-000000000001",
    household_id: "10000000-0000-4000-8000-000000000001",
    user_id: "40000000-0000-4000-8000-000000000001",
    completed_at: "2026-09-18T13:42:00Z",
    created_at: "2026-09-18T13:42:00Z",
    completer,
  };
}

function renderCard(occurrence = occurrenceFixture("2026-09-18", 0)) {
  return render(<ul><OccurrenceCard occurrence={occurrence} today="2026-09-18" /></ul>);
}

describe("OccurrenceCard completion details", () => {
  it("renders visible applicable steps and derives In progress without changing scheduled status",()=>{
    const occurrence=occurrenceFixture("2026-09-18",0);
    renderCard({...occurrence,checklist_materialized:true,title_snapshot:"Clean Bathroom",room_name_snapshot:"Upstairs Bathroom",variant_name_snapshot:null,
      checklist:[{id:"step1",household_id:occurrence.household_id,occurrence_id:occurrence.id,source_subtask_id:null,title:"Clean toilet",position:0,completed_at:"2026-09-18T12:00:00Z",completed_by:"user"},
        {id:"step2",household_id:occurrence.household_id,occurrence_id:occurrence.id,source_subtask_id:null,title:"Clean shower",position:1,completed_at:null,completed_by:null}]});
    expect(screen.getByRole("link",{name:"Clean Bathroom"})).toBeInTheDocument();
    expect(screen.getByLabelText("Clean toilet")).toBeChecked();expect(screen.getByLabelText("Clean shower")).not.toBeChecked();
    expect(screen.getByLabelText("Clean toilet")).toHaveClass("occurrence-checklist__input");
    expect(screen.getByText("In progress (1/2)")).toBeVisible();
    expect(screen.getByLabelText("Subtasks").closest("details")).toBeNull();
  });
  it("places room context beneath the title and links to its own chore", () => {
    const occurrence = occurrenceFixture("2026-09-18", 0);
    renderCard({ ...occurrence, chore: { ...occurrence.chore, room: { name: "Master Bathroom" } } });
    expect(screen.getByRole("link", { name: "Wipe kitchen counters" })).toHaveAttribute("href", `/chores/${occurrence.chore.id}`);
    expect(screen.getByText("Master Bathroom")).toHaveClass("occurrence-card__location");
    expect(screen.getByRole("link", { name: "Wipe kitchen counters" }).compareDocumentPosition(screen.getByText("Master Bathroom")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });
  it("renders an incomplete occurrence without completer information", () => {
    renderCard();
    expect(screen.getByText("Wipe kitchen counters")).toBeVisible();
    expect(screen.queryByText(/Done by/)).not.toBeInTheDocument();
  });

  it("renders a completed occurrence with its completer profile", () => {
    renderCard(occurrenceFixture("2026-09-18", 0, {
      status: "completed",
      completion: completion({
        id: "40000000-0000-4000-8000-000000000001",
        display_name: "Nik",
        avatar_key: null,
      }),
    }));
    expect(screen.getByText(/Done by Nik at 8:42 AM/)).toBeVisible();
  });

  it("renders a completed occurrence safely when its profile relation is null", () => {
    renderCard(occurrenceFixture("2026-09-18", 0, {
      status: "completed",
      completion: completion(null),
    }));
    expect(screen.getByText(/Done at 8:42 AM/)).toBeVisible();
    expect(screen.queryByText(/Done by/)).not.toBeInTheDocument();
  });
});

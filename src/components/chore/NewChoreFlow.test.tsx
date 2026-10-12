import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { NewChoreFlow } from "@/components/chore/NewChoreFlow";
import { getSuggestionPreset } from "@/data/suggestions/catalog";
import { roomFixtures } from "@/data/rooms/test-fixtures";
vi.mock("@/components/layout/PageShell", () => ({ PageShell: ({ title, children }: { title: string; children: React.ReactNode }) => <main><h1>{title}</h1>{children}</main> }));
vi.mock("@/actions/chores", () => ({ createChoreAction: vi.fn() }));
const values={name:"",description:"",iconKey:"sparkle",accentKey:"mint",recurrenceType:"weekly" as const,intervalCount:1,anchorDate:"2026-10-14",weekdays:[3],dayOfMonth:1};
describe("Add chooser",()=>{
  it("asks Chore vs Category before any form and keeps standalone controls simple",()=>{
    render(<NewChoreFlow initialValues={values} rooms={[]} available featuresAvailable />);
    expect(screen.queryByLabelText("Chore name")).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Browse suggestions/ })).toHaveAttribute("href", "/chores/suggestions");
    fireEvent.click(screen.getByRole("button",{name:/Chore A single task/}));
    expect(screen.getByLabelText("Chore name")).toBeInTheDocument();
    expect(screen.queryByRole("button",{name:"Add subtask"})).not.toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Create chore"})).toBeInTheDocument();
  });
  it("prefills a selected suggestion through the ordinary Category form without choosing household Rooms",()=>{
    const {container}=render(<NewChoreFlow initialValues={{...values,name:"Bathroom Cleaning",description:"A weekly reset",iconKey:"bathtub",accentKey:"sky"}}
      rooms={roomFixtures()} available featuresAvailable preset={getSuggestionPreset("bathroom-cleaning")} />);
    expect(screen.getByLabelText("Category name")).toHaveValue("Bathroom Cleaning");
    expect(screen.getByLabelText("Subtask 1")).toHaveValue("Clean toilet");
    expect(JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value)).toMatchObject({ kind:"category", roomIds:[], subtasks:expect.arrayContaining([expect.objectContaining({title:"Clean toilet"})]) });
    fireEvent.change(screen.getByLabelText("Subtask 1"), { target: { value: "Clean vanity" } });
    fireEvent.click(screen.getByLabelText("Every day"));
    expect(JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value)).toMatchObject({ schedule: { recurrenceType: "daily" }, subtasks:expect.arrayContaining([expect.objectContaining({title:"Clean vanity"})]) });
    expect(container.querySelector(".room-selector")).toHaveAttribute("open");
    for (const room of roomFixtures()) expect(screen.getByLabelText(room.name)).not.toBeChecked();
  });
  it("routes an imported standalone suggestion through the ordinary Chore create form",()=>{
    const {container}=render(<NewChoreFlow initialValues={{...values,name:"Vacuum Floors",iconKey:"vacuum",accentKey:"teal"}}
      rooms={roomFixtures()} available featuresAvailable preset={getSuggestionPreset("vacuum-floors")} />);
    expect(screen.getByLabelText("Chore name")).toHaveValue("Vacuum Floors");
    expect(screen.getByRole("button",{name:"Create chore"})).toBeInTheDocument();
    expect(JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value)).toMatchObject({kind:"chore",roomIds:[]});
  });
  it("prefills variants for a selected Category while keeping the existing create action",()=>{
    const {container}=render(<NewChoreFlow initialValues={{...values,name:"Laundry",iconKey:"laundry",accentKey:"peach"}}
      rooms={[]} available featuresAvailable preset={getSuggestionPreset("laundry")} />);
    expect(screen.getByLabelText("Variant 1")).toHaveValue("Darks");
    expect(JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value).variants).toHaveLength(4);
    expect(screen.getByRole("button",{name:"Create category"})).toBeInTheDocument();
  });
  it("explicitly exposes Category naming and optional subtasks including zero steps",()=>{
    const {container}=render(<NewChoreFlow initialValues={values} rooms={[]} available featuresAvailable />);
    fireEvent.click(screen.getByRole("button",{name:/Category A group/}));
    expect(screen.getByLabelText("Category name")).toBeInTheDocument();
    expect(screen.getByRole("button",{name:"Add subtask"})).toBeVisible();
    expect(screen.getByRole("button",{name:"Create category"})).toBeInTheDocument();
    expect(JSON.parse((container.querySelector('[name="schedulePlan"]') as HTMLInputElement).value)).toMatchObject({kind:"category",subtasks:[]});
  });
});

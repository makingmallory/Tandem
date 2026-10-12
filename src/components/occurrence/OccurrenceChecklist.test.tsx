import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { OccurrenceChecklist } from "@/components/occurrence/OccurrenceChecklist";
const {toggle}=vi.hoisted(()=>({toggle:vi.fn()}));
vi.mock("@/actions/occurrences",()=>({setOccurrenceSubtaskAction:toggle}));
const step={id:"step",household_id:"home",occurrence_id:"occurrence",source_subtask_id:null,title:"Clean mirror",position:0,completed_at:null,completed_by:null};
describe("OccurrenceChecklist",()=>{
  beforeEach(()=>{vi.clearAllMocks();toggle.mockResolvedValue({status:"success"});});
  it("sends the occurrence and snapshot item ids to the shared authoritative action",async()=>{
    const view=render(<OccurrenceChecklist occurrenceId="occurrence" steps={[step]} />);
    fireEvent.click(screen.getByLabelText("Clean mirror"));
    await waitFor(()=>expect(toggle).toHaveBeenCalledWith("occurrence","step",true));
    view.rerender(<OccurrenceChecklist occurrenceId="occurrence" steps={[{...step,completed_at:"2026-10-14T14:00:00Z",completed_by:"user"}]} />);
    await waitFor(()=>expect(screen.getByLabelText("Clean mirror")).toBeChecked());
  });
  it("uses an accessible checkbox with a circular completion control",()=>{
    const {rerender}=render(<OccurrenceChecklist occurrenceId="occurrence" steps={[step]} />);
    const input=screen.getByLabelText("Clean mirror");
    expect(input).toHaveClass("occurrence-checklist__input");
    expect(input.nextElementSibling).toHaveClass("occurrence-checklist__control");
    expect(input.closest("label")).not.toHaveClass("occurrence-checklist__item--completed");
    rerender(<OccurrenceChecklist occurrenceId="occurrence" steps={[{...step,completed_at:"2026-10-14T14:00:00Z",completed_by:"user"}]} />);
    expect(screen.getByLabelText("Clean mirror")).toBeChecked();
    expect(screen.getByLabelText("Clean mirror").closest("label")).toHaveClass("occurrence-checklist__item--completed");
  });
  it("keeps skipped/retired historical checklists visible and read only",()=>{
    render(<OccurrenceChecklist occurrenceId="occurrence" steps={[step]} readOnly />);
    expect(screen.getByLabelText("Clean mirror")).toBeDisabled();expect(toggle).not.toHaveBeenCalled();
  });
  it("surfaces a save failure without claiming the item completed",async()=>{
    toggle.mockResolvedValue({status:"error",formError:"Checklist unavailable"});
    render(<OccurrenceChecklist occurrenceId="occurrence" steps={[step]} />);fireEvent.click(screen.getByLabelText("Clean mirror"));
    expect(await screen.findByRole("alert")).toHaveTextContent("Checklist unavailable");expect(screen.getByLabelText("Clean mirror")).not.toBeChecked();
  });
});

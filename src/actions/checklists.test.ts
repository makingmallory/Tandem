import { beforeEach, describe, expect, it, vi } from "vitest";
import { setOccurrenceSubtaskAction } from "@/actions/occurrences";
const {household,toggle,refresh,revalidatePath}=vi.hoisted(()=>({household:vi.fn(),toggle:vi.fn(),refresh:vi.fn(),revalidatePath:vi.fn()}));
vi.mock("next/cache",()=>({refresh,revalidatePath}));
vi.mock("@/data/household/queries",()=>({getCurrentHousehold:household}));
vi.mock("@/data/checklists/mutations",()=>({setOccurrenceSubtask:toggle}));
describe("checklist server action",()=>{
  beforeEach(()=>{vi.clearAllMocks();household.mockResolvedValue({id:"home"});toggle.mockResolvedValue({error:null});});
  it("derives the household server-side and refreshes all occurrence surfaces",async()=>{
    expect((await setOccurrenceSubtaskAction("occurrence","step",true)).status).toBe("success");
    expect(toggle).toHaveBeenCalledWith("home","occurrence","step",true);expect(refresh).toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/calendar");expect(revalidatePath).toHaveBeenCalledWith("/chores/[id]","page");
  });
  it("does not mutate without a household or report success after a database failure",async()=>{
    household.mockResolvedValue(null);expect((await setOccurrenceSubtaskAction("occurrence","step",true)).status).toBe("error");expect(toggle).not.toHaveBeenCalled();
    household.mockResolvedValue({id:"home"});toggle.mockResolvedValue({error:{code:"42501"}});
    expect((await setOccurrenceSubtaskAction("occurrence","step",false)).status).toBe("error");expect(refresh).not.toHaveBeenCalled();
  });
});

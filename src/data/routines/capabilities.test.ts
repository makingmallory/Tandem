// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
import { getCategoryFeaturesAvailable } from "@/data/routines/capabilities";
const {response}=vi.hoisted(()=>({response:vi.fn()}));
vi.mock("@/data/supabase/server",()=>({createSupabaseServerClient:async()=>({from:()=>({select:()=>({eq:()=>({limit:response})})})})}));
describe("incremental Category migration availability",()=>{
  beforeEach(()=>vi.clearAllMocks());
  it("keeps the applied base schema usable while the extension table is missing",async()=>{
    response.mockResolvedValue({error:{code:"PGRST205"}});expect(await getCategoryFeaturesAvailable("home")).toBe(false);
    response.mockResolvedValue({error:null,data:[]});expect(await getCategoryFeaturesAvailable("home")).toBe(true);
  });
  it("surfaces other failures instead of treating them as an unapplied migration",async()=>{
    response.mockResolvedValue({error:{code:"42501"}});await expect(getCategoryFeaturesAvailable("home")).rejects.toThrow("We could not load category features");
  });
});

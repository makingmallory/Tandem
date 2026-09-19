// @vitest-environment node

import { readFile } from "node:fs/promises";
import path from "node:path";
import { describe, expect, it } from "vitest";

describe("shared chore architecture", () => {
  it("contains no responsibility fields or controls in the model and form", async () => {
    const files = await Promise.all([
      readFile(path.resolve(import.meta.dirname, "ChoreForm.tsx"), "utf8"),
      readFile(path.resolve(import.meta.dirname, "../../data/supabase/types.ts"), "utf8"),
      readFile(path.resolve(import.meta.dirname, "../../../supabase/migrations/20260918190000_phase2_chore_definitions.sql"), "utf8"),
    ]);
    const source = files.join("\n").toLowerCase();

    expect(source).not.toContain("assigned_user");
    expect(source).not.toContain("assignment_mode");
    expect(source).not.toContain("either of us");
    expect(source).not.toContain("both of us");
  });
});

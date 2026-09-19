import { describe, expect, it } from "vitest";
import { CHORE_ACCENTS, CHORE_ACCENT_KEYS } from "@/domain/chores/accents";
import { CHORE_ICONS, CHORE_ICON_KEYS } from "@/domain/chores/icons";

describe("chore registries", () => {
  it("keeps stable icon keys unique and useful", () => {
    expect(new Set(CHORE_ICON_KEYS).size).toBe(CHORE_ICON_KEYS.length);
    expect(CHORE_ICONS.map(({ key }) => key)).toEqual(CHORE_ICON_KEYS);
    expect(CHORE_ICON_KEYS).toEqual(expect.arrayContaining(["paw", "trash", "vacuum", "dishes", "home"]));
  });

  it("maps every accent key to a design token", () => {
    expect(new Set(CHORE_ACCENT_KEYS).size).toBe(CHORE_ACCENT_KEYS.length);
    expect(CHORE_ACCENTS.map(({ key }) => key)).toEqual(CHORE_ACCENT_KEYS);
    expect(CHORE_ACCENTS.every(({ cssVariable }) => cssVariable.startsWith("--color-"))).toBe(true);
  });
});

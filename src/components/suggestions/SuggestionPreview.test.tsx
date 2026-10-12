import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuggestionPreview } from "@/components/suggestions/SuggestionPreview";
import { getSuggestionPreset } from "@/data/suggestions/catalog";

describe("SuggestionPreview", () => {
  it("previews details without saving and routes import into the existing new form", () => {
    render(<SuggestionPreview preset={getSuggestionPreset("bathroom-cleaning")!} />);
    expect(screen.getByText("Clean shower or tub")).toBeVisible();
    expect(screen.getByText("Bathroom. Choose any applicable household Rooms in the next step.")).toBeVisible();
    expect(screen.getByRole("link", { name: "Use this suggestion" })).toHaveAttribute("href", "/chores/new?suggestion=bathroom-cleaning");
  });
});

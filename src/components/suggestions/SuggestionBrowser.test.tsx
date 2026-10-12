import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SuggestionBrowser } from "@/components/suggestions/SuggestionBrowser";
import { SUGGESTION_COLLECTIONS, SUGGESTION_PRESETS } from "@/data/suggestions/catalog";

describe("SuggestionBrowser", () => {
  it("renders static suggestions without a database write and filters by collection", () => {
    render(<SuggestionBrowser presets={SUGGESTION_PRESETS} collections={SUGGESTION_COLLECTIONS} />);
    expect(screen.getByRole("link", { name: /Bathroom Cleaning/ })).toHaveAttribute("href", "/chores/suggestions/bathroom-cleaning");
    expect(within(screen.getByRole("link", { name: /Bathroom Cleaning/ })).getByText("Category · Suggested weekly")).toBeVisible();
    fireEvent.click(screen.getByRole("button", { name: "Laundry" }));
    expect(screen.getByRole("link", { name: /Laundry/ })).toBeVisible();
    expect(screen.queryByRole("link", { name: /Bathroom Cleaning/ })).not.toBeInTheDocument();
  });
});

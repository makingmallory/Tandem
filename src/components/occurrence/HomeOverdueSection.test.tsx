import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { HomeOverdueSection } from "@/components/occurrence/HomeOverdueSection";
import { occurrenceFixture } from "@/data/occurrences/test-fixtures";

vi.mock("@/components/occurrence/OccurrenceCard", () => ({
  OccurrenceCard: ({ occurrence }: { occurrence: { chore: { name: string } } }) => <li>{occurrence.chore.name}</li>,
}));

describe("HomeOverdueSection", () => {
  it("hides older overdue chores until Show more and restores the compact list with Show less", () => {
    const recent = occurrenceFixture("2026-10-03", 0);
    const older = occurrenceFixture("2026-10-01", 1);
    render(<HomeOverdueSection occurrences={[older, recent]} today="2026-10-05" />);

    expect(screen.getByText(recent.chore.name)).toBeVisible();
    expect(screen.queryByText(older.chore.name)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Show more (1)" }));
    expect(screen.getByText(older.chore.name)).toBeVisible();
    expect(screen.getByRole("button", { name: "Show less" })).toBeVisible();
  });
});

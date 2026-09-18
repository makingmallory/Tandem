import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "@/components/layout/PageHeader";

describe("PageHeader", () => {
  it("uses the locked title hook for root pages", () => {
    render(<PageHeader title="Calendar" variant="root" />);

    expect(screen.getByTestId("page-header")).toHaveAttribute("data-variant", "root");
    expect(screen.getByTestId("page-header-title")).toHaveClass("page-header__title");
  });

  it("owns the back control for detail pages", () => {
    render(<PageHeader title="Add a Chore" variant="detail" backHref="/chores" />);

    expect(screen.getByRole("link", { name: "Go back" })).toHaveAttribute("href", "/chores");
    expect(screen.getByTestId("page-header")).toHaveAttribute("data-variant", "detail");
  });

  it("rejects detail headers without back navigation", () => {
    expect(() => render(<PageHeader title="Details" variant="detail" />)).toThrow(
      "Detail page headers require a backHref.",
    );
  });
});

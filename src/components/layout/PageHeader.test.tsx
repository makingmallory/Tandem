import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PageHeader } from "@/components/layout/PageHeader";
import { AppChromeProvider } from "@/components/layout/AppChromeContext";

vi.mock("next/navigation", () => ({
  usePathname: () => "/calendar",
  useRouter: () => ({ back: vi.fn(), push: vi.fn() }),
}));

describe("PageHeader", () => {
  it("uses the locked title hook for root pages", () => {
    render(<PageHeader title="Calendar" variant="root" />);

    expect(screen.getByTestId("page-header")).toHaveAttribute("data-variant", "root");
    expect(screen.getByTestId("page-header-title")).toHaveClass("page-header__title");
  });

  it("owns the back control for detail pages", () => {
    render(<PageHeader title="Add a Chore" variant="detail" backHref="/chores" />);

    expect(screen.getByRole("button", { name: "Go back" })).toBeVisible();
    expect(screen.getByTestId("page-header")).toHaveAttribute("data-variant", "detail");
  });

  it("shows centralized branding and settings access on authenticated root pages", () => {
    const { container } = render(
      <AppChromeProvider authenticated>
        <PageHeader title="Calendar" variant="root" />
      </AppChromeProvider>,
    );

    expect(container.querySelector(".page-header__logo")?.getAttribute("src")).toContain("app-icon.svg");
    expect(screen.getByRole("link", { name: "Open settings" })).toHaveAttribute("href", "/household");
  });

  it("rejects detail headers without back navigation", () => {
    expect(() => render(<PageHeader title="Details" variant="detail" />)).toThrow(
      "Detail page headers require a backHref.",
    );
  });
});

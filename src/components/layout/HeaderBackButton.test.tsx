import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { HeaderBackButton } from "@/components/layout/HeaderBackButton";

const back = vi.hoisted(() => vi.fn());
const push = vi.hoisted(() => vi.fn());

vi.mock("next/navigation", () => ({
  usePathname: () => "/settings/notifications",
  useRouter: () => ({ back, push }),
}));

describe("HeaderBackButton", () => {
  beforeEach(() => {
    back.mockReset();
    push.mockReset();
    window.sessionStorage.clear();
  });

  it("uses the safe fallback for a directly opened detail route", () => {
    render(<HeaderBackButton fallbackHref="/household" />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(push).toHaveBeenCalledWith("/household");
    expect(back).not.toHaveBeenCalled();
  });

  it("returns through browser history after in-app navigation", () => {
    window.history.pushState({}, "", "/chores/chore-1");
    window.history.pushState({}, "", "/settings/notifications");
    window.sessionStorage.setItem("tandem-previous-path", "/chores/chore-1");
    render(<HeaderBackButton fallbackHref="/household" />);
    fireEvent.click(screen.getByRole("button", { name: "Go back" }));
    expect(back).toHaveBeenCalledOnce();
    expect(push).not.toHaveBeenCalled();
  });
});

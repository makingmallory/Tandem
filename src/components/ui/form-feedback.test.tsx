import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ActionState } from "@/actions/state";
import { FormMessage } from "@/components/ui/FormMessage";
import { TextField } from "@/components/ui/TextField";

describe("shared form feedback", () => {
  it("marks an invalid field accessibly and connects it to its error", () => {
    render(
      <TextField
        id="email"
        name="email"
        label="Email"
        error="Enter a valid email address."
        aria-invalid={false}
      />,
    );

    const input = screen.getByLabelText("Email");
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveClass("text-field");
    expect(input).toHaveAttribute("aria-describedby", "email-error");
    expect(screen.getByText("Enter a valid email address.")).toHaveClass("field-error");
  });

  it("shows the validation summary only when field errors exist", () => {
    const state: ActionState = {
      status: "error",
      fieldErrors: { email: ["Enter a valid email address."] },
    };

    render(<FormMessage state={state} />);
    expect(screen.getByRole("alert")).toHaveTextContent("Please check the highlighted fields.");
  });

  it("shows a server failure as a form-level error without a validation summary", () => {
    const state: ActionState = {
      status: "error",
      formError: "An account already uses that email address.",
    };

    render(<FormMessage state={state} />);
    expect(screen.getByRole("alert")).toHaveTextContent("An account already uses that email address.");
    expect(screen.queryByText("Please check the highlighted fields.")).not.toBeInTheDocument();
  });

  it("uses neutral feedback for an intentionally disabled setting", () => {
    render(<FormMessage state={{ status: "success", tone: "neutral", successMessage: "Reminder off." }} />);

    expect(screen.getByRole("status")).toHaveTextContent("Reminder off.");
    expect(screen.getByRole("status")).toHaveClass("form-message--neutral");
    expect(screen.getByRole("status")).not.toHaveClass("form-message--success");
  });
});

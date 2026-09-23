import type { ActionState } from "@/actions/state";
import { hasFieldErrors } from "@/actions/state";

export function FormMessage({ state }: Readonly<{ state: ActionState }>) {
  const message =
    state.status === "success"
      ? state.successMessage
      : state.formError ??
        (hasFieldErrors(state.fieldErrors) ? "Please check the highlighted fields." : undefined);

  if (state.status === "idle" || !message) return null;

  const tone = state.status === "success" ? (state.tone ?? "success") : "error";

  return (
    <p className={`form-message form-message--${tone}`} role={state.status === "error" ? "alert" : "status"}>
      {message}
    </p>
  );
}

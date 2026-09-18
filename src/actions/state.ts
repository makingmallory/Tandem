export type ActionState = {
  status: "idle" | "error" | "success";
  fieldErrors?: Record<string, string[]>;
  formError?: string;
  successMessage?: string;
};

export const INITIAL_ACTION_STATE: ActionState = {
  status: "idle",
};

export function hasFieldErrors(fieldErrors: ActionState["fieldErrors"]): boolean {
  return Boolean(fieldErrors && Object.values(fieldErrors).some((errors) => errors.length > 0));
}

export function validationErrorState(fieldErrors: Record<string, string[]>): ActionState {
  return {
    status: "error",
    fieldErrors,
  };
}

export function formErrorState(formError: string): ActionState {
  return { status: "error", formError };
}

export function successState(successMessage: string): ActionState {
  return { status: "success", successMessage };
}

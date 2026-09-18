import type { InputHTMLAttributes } from "react";

type TextFieldProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id"> & {
  id: string;
  label: string;
  error?: string;
  hint?: string;
};

export function TextField({ id, label, error, hint, ...props }: Readonly<TextFieldProps>) {
  const {
    className,
    "aria-describedby": ariaDescribedBy,
    ...inputProps
  } = props;
  const descriptionId = error ? `${id}-error` : hint ? `${id}-hint` : undefined;
  const describedBy = [ariaDescribedBy, descriptionId].filter(Boolean).join(" ") || undefined;

  return (
    <div className="field-stack">
      <label className="field-label" htmlFor={id}>
        {label}
      </label>
      <input
        {...inputProps}
        className={["text-field", className].filter(Boolean).join(" ")}
        id={id}
        aria-invalid={Boolean(error)}
        aria-describedby={describedBy}
      />
      {error ? (
        <p className="field-error" id={`${id}-error`}>
          {error}
        </p>
      ) : hint ? (
        <p className="muted-copy" id={`${id}-hint`}>
          {hint}
        </p>
      ) : null}
    </div>
  );
}

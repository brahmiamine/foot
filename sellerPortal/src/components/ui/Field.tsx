import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";

const controlStyle: React.CSSProperties = {
  width: "100%",
  padding: "0.55rem 0.7rem",
  border: "1px solid var(--sp-border)",
  borderRadius: "var(--sp-radius-sm)",
  background: "var(--sp-surface)",
  color: "var(--sp-text)",
};

export function FormField({
  label,
  required,
  hint,
  error,
  children,
}: {
  label: string;
  required?: boolean;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label style={{ display: "block", marginBottom: "1rem" }}>
      <span style={{ display: "block", fontSize: "0.82rem", fontWeight: 600, marginBottom: 6, color: "var(--sp-text)" }}>
        {label} {required && <span style={{ color: "var(--sp-danger)" }}>*</span>}
      </span>
      {children}
      {hint && !error && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--sp-text-subtle)", marginTop: 4 }}>{hint}</span>}
      {error && <span style={{ display: "block", fontSize: "0.75rem", color: "var(--sp-danger)", marginTop: 4 }}>{error}</span>}
    </label>
  );
}

export function Input(props: InputHTMLAttributes<HTMLInputElement>) {
  return <input {...props} style={{ ...controlStyle, ...props.style }} />;
}

export function Textarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea {...props} style={{ ...controlStyle, resize: "vertical", minHeight: 90, ...props.style }} />;
}

export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) {
  return <select {...props} style={{ ...controlStyle, ...props.style }} />;
}

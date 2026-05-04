"use client";

import type { ChangeEvent } from "react";
import styles from "../../app/auth.module.css";

function EyeOpenIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosedIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
      <circle cx="12" cy="12" r="3" />
      <line x1="3" y1="21" x2="21" y2="3" />
    </svg>
  );
}

export type PasswordFieldProps = {
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  autoComplete: string;
  minLength?: number;
  required?: boolean;
  showPassword: boolean;
  onTogglePassword: () => void;
};

/** Labeled password input with visibility toggle (pairs with `useAutoHidePasswordVisibility`). */
export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  minLength,
  required,
  showPassword,
  onTogglePassword,
}: PasswordFieldProps) {
  return (
    <label className={styles.label}>
      {label}
      <div className={styles.passwordField}>
        <input
          className={`${styles.input} ${styles.inputWithAction}`}
          type={showPassword ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          minLength={minLength}
          required={required}
        />
        <button
          type="button"
          className={styles.passwordToggle}
          onClick={onTogglePassword}
          aria-label={showPassword ? "Hide password" : "Show password"}
          aria-pressed={showPassword}
          title={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? (
            <EyeOpenIcon className={styles.passwordToggleIcon} />
          ) : (
            <EyeClosedIcon className={styles.passwordToggleIcon} />
          )}
        </button>
      </div>
    </label>
  );
}

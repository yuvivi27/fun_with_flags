"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthBackHomeLink } from "../../features/auth/AuthBackHomeLink";
import { PasswordField } from "../../features/auth/PasswordField";
import { useAutoHidePasswordVisibility } from "../../features/auth/useAutoHidePasswordVisibility";
import { useAuth } from "../auth-context";
import styles from "../auth.module.css";

export default function LoginPageClient() {
  const { login } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const { visible: showPassword, toggle: togglePasswordVisibility } =
    useAutoHidePasswordVisibility();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(
    () => searchParams?.get("next") || "/game/length",
    [searchParams],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await login(email, password);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <AuthBackHomeLink />
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>Login</h1>
        <p className={styles.subtitle}>Sign in to continue your flag journey.</p>

        <label className={styles.label}>
          Email
          <input
            className={styles.input}
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </label>

        <PasswordField
          label="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          autoComplete="current-password"
          minLength={8}
          required
          showPassword={showPassword}
          onTogglePassword={togglePasswordVisibility}
        />

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Signing in..." : "Sign in"}
        </button>

        <div className={styles.links}>
          <span>No account?</span>
          <Link href="/signup">Create one</Link>
        </div>
      </form>
    </div>
  );
}

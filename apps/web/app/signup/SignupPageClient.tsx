"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useMemo, useState } from "react";
import { AuthBackHomeLink } from "../../features/auth/AuthBackHomeLink";
import { PasswordField } from "../../features/auth/PasswordField";
import { useAutoHidePasswordVisibility } from "../../features/auth/useAutoHidePasswordVisibility";
import { useAuth } from "../auth-context";
import styles from "../auth.module.css";

export default function SignupPageClient() {
  const { signup } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const passwordPeek = useAutoHidePasswordVisibility();
  const confirmPeek = useAutoHidePasswordVisibility();
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const nextPath = useMemo(
    () => searchParams?.get("next") || "/game/length",
    [searchParams],
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await signup(email, password, username || undefined);
      router.replace(nextPath);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sign up failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.page}>
      <AuthBackHomeLink />
      <form className={styles.card} onSubmit={onSubmit}>
        <h1 className={styles.title}>Sign up</h1>
        <p className={styles.subtitle}>Create your player profile.</p>

        <label className={styles.label}>
          Username (optional)
          <input
            className={styles.input}
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="nickname"
            minLength={3}
            maxLength={30}
          />
        </label>

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
          autoComplete="new-password"
          minLength={8}
          required
          showPassword={passwordPeek.visible}
          onTogglePassword={passwordPeek.toggle}
        />

        <PasswordField
          label="Verify password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          autoComplete="new-password"
          minLength={8}
          required
          showPassword={confirmPeek.visible}
          onTogglePassword={confirmPeek.toggle}
        />

        {error ? <p className={styles.error}>{error}</p> : null}

        <button className={styles.button} type="submit" disabled={submitting}>
          {submitting ? "Creating account..." : "Create account"}
        </button>

        <div className={styles.links}>
          <span>Already have an account?</span>
          <Link href="/login">Login</Link>
        </div>
      </form>
    </div>
  );
}

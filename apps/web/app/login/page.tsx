import { Suspense } from "react";
import LoginPageClient from "./LoginPageClient";

export default function LoginPage() {
  // `useSearchParams()` requires Suspense during static export.
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}

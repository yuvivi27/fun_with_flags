import { Suspense } from "react";
import SignupPageClient from "./SignupPageClient";

export default function SignupPage() {
  // `useSearchParams()` requires Suspense during static export.
  return (
    <Suspense fallback={null}>
      <SignupPageClient />
    </Suspense>
  );
}

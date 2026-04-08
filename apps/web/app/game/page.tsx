import { Suspense } from "react";
import GamePageClient from "./GamePageClient";

export default function GamePage() {
  // `useSearchParams()` requires Suspense during static export.
  return (
    <Suspense fallback={null}>
      <GamePageClient />
    </Suspense>
  );
}

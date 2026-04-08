import { ProtectedRoute } from "../protected-route";

export default function LeaderboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

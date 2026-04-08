import { ProtectedRoute } from "../protected-route";

export default function GameLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <ProtectedRoute>{children}</ProtectedRoute>;
}

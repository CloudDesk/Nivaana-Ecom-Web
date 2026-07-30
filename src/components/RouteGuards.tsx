import type { ReactNode } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { hasRequiredUserName, sessionService } from "../services/sessionService";

const routeTarget = (location: ReturnType<typeof useLocation>) =>
  `${location.pathname}${location.search}${location.hash}`;

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = sessionService.getSession();

  if (!session) {
    return <Navigate to="/login" replace state={{ from: routeTarget(location) }} />;
  }

  if (!hasRequiredUserName(session.user) && location.pathname !== "/account") {
    return (
      <Navigate
        to="/account?completeProfile=1"
        replace
        state={{ from: routeTarget(location) }}
      />
    );
  }

  return children;
}

export function GuestOnlyRoute({ children }: { children: ReactNode }) {
  const location = useLocation();
  const session = sessionService.getSession();
  const from = location.state && typeof location.state === "object" ? (location.state as { from?: unknown }).from : null;
  const target = typeof from === "string" && from.startsWith("/") && from !== "/login" ? from : "/account";

  if (session) {
    return <Navigate to={target} replace />;
  }

  return children;
}

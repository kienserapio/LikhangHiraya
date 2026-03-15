import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children, requireMfa = false }) {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const mfaVerified = useAuthStore((state) => state.mfaVerified);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireMfa && !mfaVerified) {
    return <Navigate to="/mfa" replace />;
  }

  return children;
}

import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children, requireMfa = false, allowedRoles = [] }) {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const mfaVerified = useAuthStore((state) => state.mfaVerified);
  const user = useAuthStore((state) => state.user);
  const normalizedRole = String(user?.role || "").toUpperCase();

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (!user || !normalizedRole) {
    return <Navigate to="/login" replace />;
  }

  if (requireMfa && !mfaVerified) {
    return <Navigate to="/mfa" replace />;
  }

  if (allowedRoles.length > 0 && !allowedRoles.includes(normalizedRole)) {
    if (normalizedRole === "RIDER") {
      return <Navigate to="/rider/dashboard" replace />;
    }
    if (normalizedRole === "ADMIN") {
      return <Navigate to="/admin/dashboard" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}

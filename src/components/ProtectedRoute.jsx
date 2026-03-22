import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

export default function ProtectedRoute({ children, requireMfa = false, allowedRoles = [] }) {
  const location = useLocation();
  const token = useAuthStore((state) => state.token);
  const mfaVerified = useAuthStore((state) => state.mfaVerified);
  const user = useAuthStore((state) => state.user);

  if (!token) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (requireMfa && !mfaVerified) {
    return <Navigate to="/mfa" replace />;
  }

  if (allowedRoles.length > 0 && user && !allowedRoles.includes(user.role)) {
    if (user.role === "RIDER") {
      return <Navigate to="/rider/dashboard" replace />;
    }
    return <Navigate to="/home" replace />;
  }

  return children;
}

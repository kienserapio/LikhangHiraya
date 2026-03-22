import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/auth/LoginPage";
import RegisterPage from "./pages/auth/RegisterPage";
import ForgotPasswordPage from "./pages/auth/ForgotPasswordPage";
import OtpVerificationPage from "./pages/auth/OtpVerificationPage";
import ResetPasswordPage from "./pages/auth/ResetPasswordPage";
import MathChallengePage from "./pages/auth/MathChallengePage";
import HomePage from "./pages/customer/HomePage";
import FavoritesPage from "./pages/customer/FavoritesPage";
import CartPage from "./pages/customer/CartPage";
import ProductDetailPage from "./pages/customer/ProductDetailPage";
import OrderTracking from "./pages/customer/OrderTrackingPage";
import SuccessPage from "./pages/customer/SuccessPage";
import ProfilePage from "./pages/customer/ProfilePage";
import CreateOrderPage from "./pages/customer/CreateOrderPage";
import OrderConfirmationPage from "./pages/customer/OrderConfirmationPage";
import SettingsPage from "./pages/customer/SettingsPage";
import RiderSignupPage from "./pages/rider/RiderSignupPage";
import RiderDashboardPage from "./pages/rider/RiderDashboardPage";
import RiderActiveDeliveryPage from "./pages/rider/RiderActiveDeliveryPage";
import RiderEarningsHistoryPage from "./pages/rider/RiderEarningsHistoryPage";
import ProtectedRoute from "./components/ProtectedRoute";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route path="/rider-signup" element={<RiderSignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/verify-otp" element={<OtpVerificationPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/mfa" element={<MathChallengePage />} />

      <Route path="/home" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><HomePage /></ProtectedRoute>} />
      <Route path="/favorites" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><FavoritesPage /></ProtectedRoute>} />
      <Route path="/cart" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><CartPage /></ProtectedRoute>} />
      <Route path="/products/:productId" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><ProductDetailPage /></ProtectedRoute>} />
      <Route path="/profile" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><ProfilePage /></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><SettingsPage /></ProtectedRoute>} />
      <Route path="/create-order" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><CreateOrderPage /></ProtectedRoute>} />
      <Route path="/order-confirmation" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><OrderConfirmationPage /></ProtectedRoute>} />
      <Route path="/order-status" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><OrderTracking /></ProtectedRoute>} />
      <Route path="/tracking" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><OrderTracking /></ProtectedRoute>} />
      <Route path="/success/:orderId" element={<ProtectedRoute requireMfa allowedRoles={["CUSTOMER"]}><SuccessPage /></ProtectedRoute>} />

      <Route path="/rider/dashboard" element={<ProtectedRoute requireMfa allowedRoles={["RIDER"]}><RiderDashboardPage /></ProtectedRoute>} />
      <Route path="/rider/active" element={<ProtectedRoute requireMfa allowedRoles={["RIDER"]}><RiderActiveDeliveryPage /></ProtectedRoute>} />
      <Route path="/rider/history" element={<ProtectedRoute requireMfa allowedRoles={["RIDER"]}><RiderEarningsHistoryPage /></ProtectedRoute>} />
    </Routes>
  );
}
